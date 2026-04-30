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

  if (bills.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg">No bills yet.</p>
        <p className="text-sm mt-1">Upload your first bill to get started.</p>
      </div>
    );
  }

  const displayedBills = sortByVendor
    ? [...bills].sort((a, b) => {
        const nameA = (a.vendor_name ?? a.file_name ?? '').toLowerCase();
        const nameB = (b.vendor_name ?? b.file_name ?? '').toLowerCase();
        return nameA.localeCompare(nameB);
      })
    : bills;

  return (
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
  );
}
