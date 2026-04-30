'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bill } from '@/lib/types';
import StatusBadge from './StatusBadge';
import RecommendationBadge from './RecommendationBadge';

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatAmount(amount: number | null, currency: string | null) {
  if (amount === null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency ?? 'USD' }).format(amount);
}

function DeleteButton({ billId }: { billId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm('Delete this bill?')) return;
    setLoading(true);
    await fetch(`/api/bills/${billId}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-red-400 hover:text-red-600 text-xs font-medium disabled:opacity-40 ml-3"
    >
      {loading ? '…' : 'Delete'}
    </button>
  );
}

export default function BillTable({ bills }: { bills: Bill[] }) {
  const [sortByVendor, setSortByVendor] = useState(false);
  const [filterType, setFilterType]           = useState('');
  const [filterStatus, setFilterStatus]       = useState('');
  const [filterRec, setFilterRec]             = useState('');

  if (bills.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg">No bills yet.</p>
        <p className="text-sm mt-1">Upload your first bill to get started.</p>
      </div>
    );
  }

  const filtered = bills
    .filter((b) => !filterType   || b.bill_type       === filterType)
    .filter((b) => !filterStatus || b.status          === filterStatus)
    .filter((b) => !filterRec    || b.recommendation  === filterRec);

  const displayedBills = sortByVendor
    ? [...filtered].sort((a, b) => {
        const nameA = (a.vendor_name ?? a.file_name ?? '').toLowerCase();
        const nameB = (b.vendor_name ?? b.file_name ?? '').toLowerCase();
        return nameA.localeCompare(nameB);
      })
    : filtered;

  const hasFilters = filterType || filterStatus || filterRec;

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          <option value="utility">Utility</option>
          <option value="rent">Rent</option>
          <option value="supplier">Supplier</option>
          <option value="subscription">Subscription</option>
          <option value="tax">Tax</option>
          <option value="payroll">Payroll</option>
          <option value="miscellaneous">Miscellaneous</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="processing">Processing</option>
          <option value="ready">Ready</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
        </select>

        <select
          value={filterRec}
          onChange={(e) => setFilterRec(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Recommendations</option>
          <option value="pay_now">Pay Now</option>
          <option value="pay_this_week">Pay This Week</option>
          <option value="review_first">Review First</option>
          <option value="possible_duplicate">Possible Duplicate</option>
        </select>

        {hasFilters && (
          <button
            onClick={() => { setFilterType(''); setFilterStatus(''); setFilterRec(''); }}
            className="text-sm text-gray-400 hover:text-gray-600 px-2"
          >
            Clear filters ×
          </button>
        )}

        <span className="ml-auto text-xs text-gray-400 self-center">
          {displayedBills.length} of {bills.length} bills
        </span>
      </div>

      {displayedBills.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No bills match the selected filters.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">
                  <button
                    onClick={() => setSortByVendor((v) => !v)}
                    className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                  >
                    Vendor
                    <span className={sortByVendor ? 'text-blue-500' : 'text-gray-300'}>↕</span>
                  </button>
                </th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Recommendation</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayedBills.map((bill) => (
                <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {bill.vendor_name ?? <span className="text-gray-400">{bill.file_name}</span>}
                  </td>
                  <td className="px-4 py-3">{formatAmount(bill.amount, bill.currency)}</td>
                  <td className="px-4 py-3">{formatDate(bill.due_date)}</td>
                  <td className="px-4 py-3 capitalize">{bill.bill_type ?? '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={bill.status} />
                  </td>
                  <td className="px-4 py-3">
                    {bill.status === 'processing' ? (
                      <span className="text-gray-400 text-xs animate-pulse">Analyzing…</span>
                    ) : (
                      <RecommendationBadge recommendation={bill.recommendation} />
                    )}
                  </td>
                  <td className="px-4 py-3 flex items-center gap-1">
                    <Link href={`/bills/${bill.id}`} className="text-blue-600 hover:underline font-medium">
                      View →
                    </Link>
                    <DeleteButton billId={bill.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
