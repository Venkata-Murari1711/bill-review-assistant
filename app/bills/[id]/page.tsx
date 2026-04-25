import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Bill } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';

export const dynamic = 'force-dynamic';
import RecommendationBadge from '@/components/RecommendationBadge';
import BillActions from './BillActions';

async function getBill(id: string): Promise<Bill | null> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const res = await fetch(`${url}/rest/v1/bills?id=eq.${id}&select=*&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
    });
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-gray-800 mt-0.5">
        {value ?? <span className="text-gray-400">—</span>}
      </p>
    </div>
  );
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatAmount(amount: number | null, currency: string | null) {
  if (amount === null) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency ?? 'USD',
  }).format(amount);
}

export default async function BillDetailPage({ params }: { params: { id: string } }) {
  const bill = await getBill(params.id);
  if (!bill) notFound();

  const isProcessing = bill.status === 'processing';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-gray-700 text-sm">
          ← Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {bill.vendor_name ?? bill.file_name ?? 'Bill'}
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Uploaded {new Date(bill.created_at).toLocaleString()}
            </p>
          </div>
          <StatusBadge status={bill.status} />
        </div>

        {isProcessing ? (
          <div className="px-6 py-12 text-center text-gray-400 space-y-2">
            <div className="text-3xl animate-spin">⏳</div>
            <p className="font-medium">Processing your bill…</p>
            <p className="text-sm">Your n8n OCR workflow is running. Refresh in a moment.</p>
            <Link href={`/bills/${bill.id}`} className="mt-4 inline-block text-blue-600 text-sm hover:underline">
              Refresh
            </Link>
            <div className="pt-2">
              <BillActions billId={bill.id} currentStatus={bill.status} />
            </div>
          </div>
        ) : (
          <>
            {/* Recommendation */}
            {bill.recommendation && (
              <div className={`px-6 py-4 border-b border-gray-100 ${
                bill.recommendation === 'pay_now' ? 'bg-red-50' :
                bill.recommendation === 'pay_this_week' ? 'bg-orange-50' :
                bill.recommendation === 'review_first' ? 'bg-yellow-50' :
                'bg-purple-50'
              }`}>
                <div className="flex items-center gap-3">
                  <RecommendationBadge recommendation={bill.recommendation} />
                  {bill.explanation && (
                    <p className="text-sm text-gray-700">{bill.explanation}</p>
                  )}
                </div>
              </div>
            )}

            {/* Warning flags */}
            {(bill.suspicious_flag || bill.duplicate_flag) && (
              <div className="px-6 py-3 bg-yellow-50 border-b border-yellow-100 flex gap-4 text-sm">
                {bill.duplicate_flag && (
                  <span className="text-purple-700 font-medium">⚠️ Possible duplicate invoice</span>
                )}
                {bill.suspicious_flag && (
                  <span className="text-yellow-700 font-medium">⚠️ Unusual amount or missing fields</span>
                )}
              </div>
            )}

            {/* Extracted fields */}
            <div className="px-6 py-5 grid grid-cols-2 gap-x-6 gap-y-4">
              <Field label="Vendor" value={bill.vendor_name} />
              <Field label="Invoice Number" value={bill.invoice_number} />
              <Field label="Bill Type" value={bill.bill_type} />
              <Field label="Amount" value={formatAmount(bill.amount, bill.currency)} />
              <Field label="Issue Date" value={formatDate(bill.issue_date)} />
              <Field label="Due Date" value={formatDate(bill.due_date)} />
              <Field label="Payment Terms" value={bill.payment_terms} />
              <Field
                label="Extraction Confidence"
                value={bill.extraction_confidence ? `${Math.round(bill.extraction_confidence * 100)}%` : null}
              />
            </div>

            {/* Original file link */}
            {bill.file_url && (
              <div className="px-6 py-3 border-t border-gray-100">
                <a
                  href={bill.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  View original file →
                </a>
              </div>
            )}

            {/* Action buttons */}
            <div className="px-6 py-5 border-t border-gray-100">
              <BillActions billId={bill.id} currentStatus={bill.status} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
