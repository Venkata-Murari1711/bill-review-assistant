import Link from 'next/link';
import { Bill } from '@/lib/types';
import BillTable from '@/components/BillTable';

export const dynamic = 'force-dynamic';

async function getBills(): Promise<Bill[]> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const res = await fetch(`${url}/rest/v1/bills?select=*&order=created_at.desc`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
    });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const bills = await getBills();

  const counts = {
    total: bills.length,
    processing: bills.filter((b) => b.status === 'processing').length,
    payNow: bills.filter((b) => b.recommendation === 'pay_now' && b.status === 'ready').length,
    review: bills.filter((b) =>
      (b.recommendation === 'review_first' || b.recommendation === 'possible_duplicate') &&
      b.status === 'ready'
    ).length,
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bill Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Review and manage incoming bills</p>
        </div>
        <Link
          href="/upload"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Upload Bill
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Bills" value={counts.total} color="blue" />
        <StatCard label="Processing" value={counts.processing} color="yellow" />
        <StatCard label="Pay Now" value={counts.payNow} color="red" />
        <StatCard label="Needs Review" value={counts.review} color="purple" />
      </div>

      {/* Bills table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">All Bills</h2>
        </div>
        <BillTable bills={bills} />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'blue' | 'yellow' | 'red' | 'purple';
}) {
  const colors = {
    blue:   'bg-blue-50 text-blue-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    red:    'bg-red-50 text-red-700',
    purple: 'bg-purple-50 text-purple-700',
  };
  return (
    <div className={`${colors[color]} rounded-xl p-4 text-center`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm mt-1 font-medium opacity-80">{label}</p>
    </div>
  );
}
