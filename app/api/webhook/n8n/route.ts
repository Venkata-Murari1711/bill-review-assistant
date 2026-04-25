import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { extractBillFields, generateExplanation } from '@/lib/claude';
import { computeRecommendation } from '@/lib/decision-engine';

const VALID_BILL_TYPES = ['rent', 'utility', 'supplier', 'tax', 'payroll', 'subscription', 'miscellaneous'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { bill_id, extracted_text, textract_result, secret } = body;

  if (secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!bill_id) {
    return NextResponse.json({ error: 'Missing bill_id' }, { status: 400 });
  }

  if (!extracted_text && !textract_result) {
    return NextResponse.json(
      { error: 'Provide either extracted_text or textract_result' },
      { status: 400 }
    );
  }

  // Handle both string and pre-parsed object payloads
  const textToProcess: string = extracted_text
    ? (typeof extracted_text === 'string' ? extracted_text : JSON.stringify(extracted_text, null, 2))
    : JSON.stringify(textract_result, null, 2);

  const supabase = createServerClient();

  try {
    // 1. Extract structured fields with OpenAI
    const extraction = await extractBillFields(textToProcess);

    // Guardrail #4 — confidence too low to trust extraction
    if ((extraction.confidence ?? 0) < 0.3) {
      await supabase
        .from('bills')
        .update({
          status: 'ready',
          raw_text: textToProcess,
          extraction_confidence: extraction.confidence ?? 0,
          recommendation: 'review_first',
          explanation: 'The bill could not be read clearly enough for automatic processing. Please review it manually.',
          suspicious_flag: true,
        })
        .eq('id', bill_id);
      return NextResponse.json({ success: true, note: 'low_confidence' });
    }

    // Guardrail #5 — validate AI output before saving to Supabase
    const validatedAmount = typeof extraction.amount === 'number' && extraction.amount > 0
      ? extraction.amount : null;
    const validatedIssueDate = extraction.issue_date && DATE_RE.test(extraction.issue_date)
      ? extraction.issue_date : null;
    const validatedDueDate = extraction.due_date && DATE_RE.test(extraction.due_date)
      ? extraction.due_date : null;
    const validatedBillType = VALID_BILL_TYPES.includes(extraction.bill_type ?? '')
      ? extraction.bill_type : null;
    const validatedCurrency = /^[A-Z]{3}$/.test(extraction.currency ?? '')
      ? extraction.currency : 'USD';

    // 2. Fetch prior bills for duplicate / anomaly checks
    const { data: priorBills } = await supabase
      .from('bills')
      .select('vendor_name, invoice_number, amount')
      .neq('id', bill_id)
      .not('status', 'eq', 'processing');

    // 3. Rule-based decision engine (use validated values)
    const { recommendation, suspicious, duplicate } = computeRecommendation(
      { ...extraction, amount: validatedAmount, due_date: validatedDueDate },
      priorBills ?? []
    );

    // 4. Plain-language explanation
    const explanation = await generateExplanation(extraction, recommendation, {
      suspicious,
      duplicate,
    });

    // 5. Persist to Supabase
    const { error } = await supabase
      .from('bills')
      .update({
        status: 'ready',
        raw_text: textToProcess,
        vendor_name: extraction.vendor_name,
        invoice_number: extraction.invoice_number,
        bill_type: validatedBillType,
        issue_date: validatedIssueDate,
        due_date: validatedDueDate,
        payment_terms: extraction.payment_terms,
        amount: validatedAmount,
        currency: validatedCurrency,
        extraction_confidence: extraction.confidence ?? null,
        recommendation,
        explanation,
        suspicious_flag: suspicious,
        duplicate_flag: duplicate,
      })
      .eq('id', bill_id);

    if (error) throw new Error(`Supabase update failed: ${error.message} (code: ${error.code})`);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Webhook processing error:', message);
    await supabase
      .from('bills')
      .update({
        status: 'ready',
        recommendation: 'review_first',
        explanation: 'Processing error — please review manually.',
      })
      .eq('id', bill_id);

    return NextResponse.json({ error: 'Processing failed', detail: message }, { status: 500 });
  }
}
