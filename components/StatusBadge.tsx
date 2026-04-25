import { BillStatus } from '@/lib/types';

const styles: Record<BillStatus, string> = {
  processing: 'bg-yellow-100 text-yellow-800',
  ready:      'bg-blue-100 text-blue-800',
  approved:   'bg-green-100 text-green-800',
  paid:       'bg-gray-100 text-gray-600',
};

const labels: Record<BillStatus, string> = {
  processing: 'Processing',
  ready:      'Ready',
  approved:   'Approved',
  paid:       'Paid',
};

export default function StatusBadge({ status }: { status: BillStatus }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
