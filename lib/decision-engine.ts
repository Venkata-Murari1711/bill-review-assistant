import { BillExtraction, Recommendation } from './types';

interface PriorBill {
  vendor_name: string | null;
  invoice_number: string | null;
  amount: number | null;
}

export function computeRecommendation(
  extraction: BillExtraction,
  priorBills: PriorBill[]
): { recommendation: Recommendation; suspicious: boolean; duplicate: boolean } {
  // 1. Duplicate check — same invoice number from same vendor
  const isDuplicate = priorBills.some(
    (b) =>
      b.invoice_number &&
      extraction.invoice_number &&
      b.invoice_number.trim() === extraction.invoice_number.trim()
  );

  if (isDuplicate) {
    return { recommendation: 'possible_duplicate', suspicious: false, duplicate: true };
  }

  // 2. Suspicious checks
  const missingCritical = !extraction.amount || !extraction.due_date;

  const vendorHistory = priorBills.filter(
    (b) =>
      b.vendor_name &&
      extraction.vendor_name &&
      b.vendor_name.toLowerCase() === extraction.vendor_name.toLowerCase() &&
      b.amount !== null
  );

  let amountAnomalous = false;
  if (vendorHistory.length >= 2 && extraction.amount) {
    const avg =
      vendorHistory.reduce((s, b) => s + (b.amount ?? 0), 0) / vendorHistory.length;
    amountAnomalous = extraction.amount > avg * 2.5;
  }

  if (missingCritical || amountAnomalous) {
    return { recommendation: 'review_first', suspicious: true, duplicate: false };
  }

  // 3. Urgency scoring by days until due
  if (!extraction.due_date) {
    return { recommendation: 'review_first', suspicious: true, duplicate: false };
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntilDue = Math.ceil(
    (new Date(extraction.due_date).getTime() - Date.now()) / msPerDay
  );

  if (daysUntilDue <= 0) {
    // Overdue
    return { recommendation: 'pay_now', suspicious: false, duplicate: false };
  }

  if (daysUntilDue <= 2) {
    return { recommendation: 'pay_now', suspicious: false, duplicate: false };
  }

  return { recommendation: 'pay_this_week', suspicious: false, duplicate: false };
}
