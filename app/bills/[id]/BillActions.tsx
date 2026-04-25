'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BillStatus } from '@/lib/types';

export default function BillActions({
  billId,
  currentStatus,
}: {
  billId: string;
  currentStatus: BillStatus;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function updateStatus(status: BillStatus) {
    setLoading(true);
    await fetch(`/api/bills/${billId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    router.refresh();
    setLoading(false);
  }

  async function deleteBill() {
    if (!confirm('Delete this bill? This cannot be undone.')) return;
    setLoading(true);
    await fetch(`/api/bills/${billId}`, { method: 'DELETE' });
    router.push('/');
  }

  return (
    <div className="flex gap-3 flex-wrap items-center">
      {currentStatus !== 'approved' && currentStatus !== 'paid' && (
        <button
          onClick={() => updateStatus('approved')}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          ✓ Approve
        </button>
      )}
      {currentStatus !== 'paid' && (
        <button
          onClick={() => updateStatus('paid')}
          disabled={loading}
          className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          Mark as Paid
        </button>
      )}
      {currentStatus === 'paid' && (
        <p className="text-sm text-gray-400 font-medium">✓ Marked as paid</p>
      )}
      <a
        href="/"
        className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        Back to Dashboard
      </a>
      <button
        onClick={deleteBill}
        disabled={loading}
        className="ml-auto text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
