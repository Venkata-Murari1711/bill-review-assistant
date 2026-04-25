import { Recommendation } from '@/lib/types';

const styles: Record<Recommendation, string> = {
  pay_now:            'bg-red-100 text-red-800 border border-red-200',
  pay_this_week:      'bg-orange-100 text-orange-800 border border-orange-200',
  review_first:       'bg-yellow-100 text-yellow-800 border border-yellow-200',
  possible_duplicate: 'bg-purple-100 text-purple-800 border border-purple-200',
};

const labels: Record<Recommendation, string> = {
  pay_now:            '⚡ Pay Now',
  pay_this_week:      '📅 Pay This Week',
  review_first:       '👁 Review First',
  possible_duplicate: '⚠️ Possible Duplicate',
};

export default function RecommendationBadge({
  recommendation,
}: {
  recommendation: Recommendation | null;
}) {
  if (!recommendation) return <span className="text-gray-400 text-sm">—</span>;
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${styles[recommendation]}`}>
      {labels[recommendation]}
    </span>
  );
}
