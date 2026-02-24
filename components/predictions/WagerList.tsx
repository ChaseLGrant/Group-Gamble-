import Avatar from '@/components/ui/Avatar';
import { formatPoints, pickColor, cn } from '@/lib/utils';

interface WagerListProps {
  wagers: any[];
  currentUserId: string;
  predictionType: string;
  outcome?: string | null;
}

export default function WagerList({
  wagers,
  currentUserId,
  predictionType,
  outcome,
}: WagerListProps) {
  if (wagers.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-zinc-600 text-sm">No picks yet. Be first!</p>
      </div>
    );
  }

  // Sort: current user first, then by amount desc
  const sorted = [...wagers].sort((a, b) => {
    if (a.user_id === currentUserId) return -1;
    if (b.user_id === currentUserId) return 1;
    return b.amount_points - a.amount_points;
  });

  const sideA = predictionType === 'YES_NO' ? 'YES' : 'OVER';
  const sideB = predictionType === 'YES_NO' ? 'NO' : 'UNDER';

  const groupA = sorted.filter((w) => w.pick === sideA);
  const groupB = sorted.filter((w) => w.pick === sideB);

  function isWinner(pick: string) {
    return outcome && outcome !== 'PUSH' && pick === outcome;
  }

  function isLoser(pick: string) {
    return outcome && outcome !== 'PUSH' && pick !== outcome;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
        All Picks · {wagers.length}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Side A */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-green-400 uppercase">{sideA}</p>
          {groupA.map((wager) => (
            <WagerRow
              key={wager.id}
              wager={wager}
              isMe={wager.user_id === currentUserId}
              won={!!isWinner(wager.pick)}
              lost={!!isLoser(wager.pick)}
            />
          ))}
          {groupA.length === 0 && (
            <p className="text-xs text-zinc-700">No picks</p>
          )}
        </div>

        {/* Side B */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-red-400 uppercase">{sideB}</p>
          {groupB.map((wager) => (
            <WagerRow
              key={wager.id}
              wager={wager}
              isMe={wager.user_id === currentUserId}
              won={!!isWinner(wager.pick)}
              lost={!!isLoser(wager.pick)}
            />
          ))}
          {groupB.length === 0 && (
            <p className="text-xs text-zinc-700">No picks</p>
          )}
        </div>
      </div>
    </div>
  );
}

function WagerRow({
  wager,
  isMe,
  won,
  lost,
}: {
  wager: any;
  isMe: boolean;
  won: boolean;
  lost: boolean;
}) {
  const name = wager.profile?.display_name ?? 'Unknown';

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl p-2 border transition-colors',
        isMe && 'border-violet-800/50 bg-violet-900/10',
        won && !isMe && 'border-green-800/30 bg-green-900/10',
        lost && !isMe && 'border-zinc-800 bg-zinc-900/50 opacity-60',
        !won && !lost && !isMe && 'border-zinc-800 bg-zinc-900'
      )}
    >
      <Avatar src={wager.profile?.avatar_url} name={name} size="xs" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-zinc-200 truncate">
          {isMe ? 'You' : name}
          {won && <span className="ml-1 text-green-400">✓</span>}
        </p>
        <p className="text-[11px] text-zinc-500">{formatPoints(wager.amount_points)} pts</p>
      </div>
    </div>
  );
}
