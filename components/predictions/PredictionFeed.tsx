'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import PredictionCard from './PredictionCard';
import { InlineLoader } from '@/components/ui/LoadingSpinner';

interface PredictionFeedProps {
  groupId: string;
  initialPredictions: any[];
  currentUserId: string;
  isAdmin: boolean;
}

export default function PredictionFeed({
  groupId,
  initialPredictions,
  currentUserId,
  isAdmin,
}: PredictionFeedProps) {
  const [predictions, setPredictions] = useState<any[]>(initialPredictions);
  const [loading, setLoading] = useState(false);

  const fetchPredictions = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('predictions')
      .select(
        `
        *,
        creator:profiles!predictions_created_by_fkey (
          id,
          display_name,
          avatar_url
        ),
        wagers (
          id,
          user_id,
          pick,
          amount_points
        )
      `
      )
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (data) setPredictions(data);
  }, [groupId]);

  useEffect(() => {
    const supabase = createClient();

    // Subscribe to prediction changes in this group
    const predChannel = supabase
      .channel(`group-${groupId}-predictions`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'predictions',
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          fetchPredictions();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wagers',
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          fetchPredictions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(predChannel);
    };
  }, [groupId, fetchPredictions]);

  if (predictions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <div className="text-5xl">🔮</div>
        <div>
          <p className="text-zinc-400 font-semibold">No predictions yet</p>
          <p className="text-zinc-600 text-sm mt-1">
            Tap the <span className="text-violet-400 font-medium">+ New Pick</span> button to create one!
          </p>
        </div>
      </div>
    );
  }

  // Separate by status for better UX
  const open = predictions.filter((p) => p.status === 'OPEN');
  const locked = predictions.filter((p) => p.status === 'LOCKED');
  const settled = predictions.filter((p) => ['SETTLED', 'CANCELED'].includes(p.status));

  // Get my wagers for quick display
  const myWagerMap = new Map<string, any>();
  for (const p of predictions) {
    const myWager = p.wagers?.find((w: any) => w.user_id === currentUserId);
    if (myWager) myWagerMap.set(p.id, myWager);
  }

  return (
    <div className="space-y-6">
      {/* Open predictions */}
      {open.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Open · {open.length}
          </h2>
          <div className="space-y-3">
            {open.map((p) => (
              <PredictionCard
                key={p.id}
                prediction={p}
                groupId={groupId}
                myWager={myWagerMap.get(p.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Locked predictions */}
      {locked.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-yellow-500/70 uppercase tracking-wider mb-3">
            Locked · {locked.length}
          </h2>
          <div className="space-y-3">
            {locked.map((p) => (
              <PredictionCard
                key={p.id}
                prediction={p}
                groupId={groupId}
                myWager={myWagerMap.get(p.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Settled / Canceled */}
      {settled.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-3">
            Settled · {settled.length}
          </h2>
          <div className="space-y-3">
            {settled.map((p) => (
              <PredictionCard
                key={p.id}
                prediction={p}
                groupId={groupId}
                myWager={myWagerMap.get(p.id)}
              />
            ))}
          </div>
        </section>
      )}

      {loading && <InlineLoader />}
    </div>
  );
}
