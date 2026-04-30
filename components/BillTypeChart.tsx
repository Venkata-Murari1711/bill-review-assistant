'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Bill } from '@/lib/types';

const COLORS: Record<string, string> = {
  utility:      '#3b82f6',
  subscription: '#8b5cf6',
  supplier:     '#10b981',
  rent:         '#f59e0b',
  tax:          '#ef4444',
  payroll:      '#ec4899',
  miscellaneous:'#6b7280',
  other:        '#9ca3af',
};

export default function BillTypeChart({ bills }: { bills: Bill[] }) {
  const readyBills = bills.filter((b) => b.status === 'ready' && b.bill_type);

  if (readyBills.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No bill type data yet
      </div>
    );
  }

  const counts: Record<string, number> = {};
  for (const bill of readyBills) {
    const type = bill.bill_type ?? 'other';
    counts[type] = (counts[type] ?? 0) + 1;
  }

  const data = Object.entries(counts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    key: name,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry) => (
            <Cell key={entry.key} fill={COLORS[entry.key] ?? COLORS.other} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => {
            const total = data.reduce((s, d) => s + d.value, 0);
            return [`${((value / total) * 100).toFixed(0)}% (${value})`, 'Bills'];
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
