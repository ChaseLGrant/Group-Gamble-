'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getLeaderboard } from '@/lib/actions/wagers';
import Avatar from '@/components/ui/Avatar';
import { formatPoints, cn } from '@/lib/utils';
import { Medal, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface LeaderboardProps {
  entries: any[];
  currentUserId: string;
  groupId: string;
}

export default function Leaderboard({
  entries: initialEntries,
  currentUserId,
  groupId,
}: LeaderboardProps) {
  const [entries, setEntries] = useState(initialEntries);

  const refresh = useCallback(async () => {
    const updated = await getLeaderboard(groupId);
    setEntries(updated);
  }, [groupId]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`leaderboard-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_balances',
          filter: `group_id=eq.${groupId}`,
        },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, refresh]);

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        No members yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, index) => {
        const isMe = entry.user_id === currentUserId;
        const total = entry.wins + entry.losses;
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;

        return (
          <div
            key={entry.user_id}
            className={cn(
              'flex items-center gap-3 p-4 rounded-2xl border transition-colors',
              isMe
                ? 'bg-violet-900/15 border-violet-800/40'
                : 'bg-zinc-900 border-zinc-800'
            )}
          >
            {/* Rank */}
            <div className="w-8 text-center flex-shrink-0">
              {medal ? (
                <span className="text-xl">{medal}</span>
              ) : (
                <span className="text-sm font-bold text-zinc-600">
                  #{entry.rank}
                </span>
              )}
            </div>

            {/* Avatar */}
            <Avatar
              src={entry.avatar_url}
              name={entry.display_name}
              size="sm"
            />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-sm text-zinc-100 truncate">
                  {isMe ? 'You' : entry.display_name}
                </p>
                {isMe && (
                  <span className="text-xs text-violet-400 bg-violet-900/30 px-1.5 py-0.5 rounded">
                    me
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                {total > 0 ? (
                  <span>
                    {entry.wins}W – {entry.losses}L
                    <span className="text-zinc-600 ml-1">
                      ({entry.win_rate}%)
                    </span>
                  </span>
                ) : (
                  'No picks yet'
                )}
              </p>
            </div>

            {/* Balance & Net */}
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-black text-zinc-100">
                {formatPoints(entry.balance_points)}
              </p>
              <div className="flex items-center justify-end gap-0.5">
                {entry.net_points > 0 ? (
                  <>
                    <TrendingUp size={11} className="text-green-400" />
                    <span className="text-xs text-green-400 font-semibold">
                      +{formatPoints(entry.net_points)}
                    </span>
                  </>
                ) : entry.net_points < 0 ? (
                  <>
                    <TrendingDown size={11} className="text-red-400" />
                    <span className="text-xs text-red-400 font-semibold">
                      {formatPoints(entry.net_points)}
                    </span>
                  </>
                ) : (
                  <>
                    <Minus size={11} className="text-zinc-600" />
                    <span className="text-xs text-zinc-600">Even</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <p className="text-xs text-zinc-700 text-center mt-4">
        Starting balance: 1,000 pts · Net = current – starting
      </p>
    </div>
  );
}
