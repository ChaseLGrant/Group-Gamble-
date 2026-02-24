import { Coins } from 'lucide-react';
import { formatPoints } from '@/lib/utils';

export default function BalanceBadge({ balance }: { balance: number }) {
  return (
    <div className="flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1">
      <Coins size={13} className="text-yellow-400" />
      <span className="text-xs font-bold text-yellow-400">{formatPoints(balance)}</span>
    </div>
  );
}
