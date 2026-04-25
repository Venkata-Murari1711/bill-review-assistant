import OpenAI from 'openai';
import { BillExtraction, Recommendation } from './types';

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const EXTRACTION_SYSTEM = `You are an invoice extraction assistant. Read the invoice text and return ONLY a valid JSON object with these exact keys:
vendor_name, invoice_number, amount, currency, issue_date, due_date, payment_terms, bill_type, confidence

Rules:
- Return null for any missing field
- bill_type must be one of: rent, utility, supplier, tax, payroll, subscription, miscellaneous
- Dates must be in YYYY-MM-DD format
- amount must be a plain number (no symbols or commas)
- currency must be a 3-letter code (default USD)
- confidence is a number 0–1 reflecting how complete the extraction is
- Return ONLY the JSON object, no markdown, no commentary`;

export async function extractBillFields(text: string): Promise<BillExtraction> {
  const response = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 1024,
    messages: [
      { role: 'system', content: EXTRACTION_SYSTEM },
      { role: 'user', content: `Extract fields from this invoice:\n\n${text.slice(0, 8000)}` },
    ],
  });

  const raw = response.choices[0].message.content ?? '';
  const cleaned = raw.replace(/```(?:json)?\n?/g, '').trim();
  return JSON.parse(cleaned) as BillExtraction;
}

export async function generateExplanation(
  extraction: BillExtraction,
  recommendation: Recommendation,
  flags: { suspicious: boolean; duplicate: boolean }
): Promise<string> {
  const labelMap: Record<Recommendation, string> = {
    pay_now: 'Pay Now',
    pay_this_week: 'Pay This Week',
    review_first: 'Review First',
    possible_duplicate: 'Possible Duplicate',
  };

  const response = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `Write a 1–2 sentence explanation for a small business owner.

Bill details:
- Vendor: ${extraction.vendor_name ?? 'Unknown'}
- Amount: ${extraction.amount ?? 'Unknown'} ${extraction.currency ?? 'USD'}
- Due Date: ${extraction.due_date ?? 'Not found'}
- Bill Type: ${extraction.bill_type ?? 'Unknown'}
- Recommendation: ${labelMap[recommendation]}
- Suspicious: ${flags.suspicious}
- Possible Duplicate: ${flags.duplicate}

Explain clearly and concisely why this recommendation was made.`,
      },
    ],
  });

  return response.choices[0].message.content?.trim() ?? 'No explanation available.';
}
