'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import WagerForm from '@/components/predictions/WagerForm';
import SettlePanel from '@/components/predictions/SettlePanel';
import WagerList from '@/components/predictions/WagerList';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import {
  statusColor,
  statusLabel,
  formatLine,
  formatPoints,
  computePool,
  pickColor,
  timeAgo,
  isPredictionOpen,
  cn,
} from '@/lib/utils';

interface PredictionDetailViewProps {
  prediction: any;
  groupId: string;
  currentUserId: string;
  isAdmin: boolean;
  myWager: any | null;
  balance: number;
}

export default function PredictionDetailView({
  prediction: initialPrediction,
  groupId,
  currentUserId,
  isAdmin,
  myWager: initialMyWager,
  balance: initialBalance,
}: PredictionDetailViewProps) {
  const [prediction, setPrediction] = useState(initialPrediction);
  const [myWager, setMyWager] = useState(initialMyWager);
  const [balance, setBalance] = useState(initialBalance);

  const refreshData = useCallback(async () => {
    const supabase = createClient();

    const { data: pred } = await supabase
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
          *,
          profile:profiles (
            id,
            display_name,
            avatar_url
          )
        )
      `
      )
      .eq('id', initialPrediction.id)
      .single();

    if (pred) {
      setPrediction(pred);
      const mine = pred.wagers?.find((w: any) => w.user_id === currentUserId) ?? null;
      setMyWager(mine);
    }

    // Refresh balance
    const { data: bal } = await supabase
      .from('group_balances')
      .select('balance_points')
      .eq('group_id', groupId)
      .eq('user_id', currentUserId)
      .single();

    if (bal) setBalance(bal.balance_points);
  }, [initialPrediction.id, currentUserId, groupId]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`prediction-${initialPrediction.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wagers',
          filter: `prediction_id=eq.${initialPrediction.id}`,
        },
        () => refreshData()
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'predictions',
          filter: `id=eq.${initialPrediction.id}`,
        },
        () => refreshData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_balances',
          filter: `group_id=eq.${groupId}`,
        },
        () => refreshData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialPrediction.id, groupId, refreshData]);

  const pool = computePool(prediction.wagers ?? []);
  const canWager = isPredictionOpen(prediction.status, prediction.close_time);

  const sideA = prediction.type === 'YES_NO' ? 'YES' : 'OVER';
  const sideB = prediction.type === 'YES_NO' ? 'NO' : 'UNDER';
  const poolA = prediction.type === 'YES_NO' ? pool.yes_points : pool.over_points;
  const poolB = prediction.type === 'YES_NO' ? pool.no_points : pool.under_points;
  const totalPool = poolA + poolB;
  const pctA = totalPool > 0 ? Math.round((poolA / totalPool) * 100) : 50;
  const pctB = 100 - pctA;

  return (
    <div className="space-y-4 px-4 pt-4">
      {/* Status & type */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={cn(
            'text-xs font-bold px-2.5 py-1 rounded-full',
            statusColor(prediction.status)
          )}
        >
          {statusLabel(prediction.status)}
        </span>
        <Badge variant={prediction.type === 'YES_NO' ? 'purple' : 'blue'}>
          {prediction.type === 'YES_NO' ? 'Yes / No' : 'Over / Under'}
        </Badge>
        {prediction.subject && (
          <Badge variant="gray">About: {prediction.subject}</Badge>
        )}
      </div>

      {/* Description */}
      {prediction.description && (
        <p className="text-zinc-400 text-sm">{prediction.description}</p>
      )}

      {/* O/U Line */}
      {prediction.type === 'OVER_UNDER' && prediction.line !== null && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
          <span className="text-zinc-400 text-sm">Line</span>
          <span className="text-xl font-black text-zinc-100">
            {formatLine(prediction.line, prediction.unit)}
          </span>
        </div>
      )}

      {/* Settled outcome */}
      {prediction.status === 'SETTLED' && prediction.outcome && (
        <div
          className={cn(
            'rounded-xl p-4 text-center border',
            prediction.outcome === 'PUSH'
              ? 'bg-zinc-800/50 border-zinc-700'
              : 'bg-green-900/20 border-green-800/50'
          )}
        >
          <p className="text-xs text-zinc-500 mb-1">Result</p>
          <p className={cn('text-2xl font-black', pickColor(prediction.outcome))}>
            {prediction.outcome}
            {prediction.outcome_value !== null
              ? ` (${prediction.outcome_value} ${prediction.unit ?? ''})`
              : ''}
          </p>
          {prediction.settled_at && (
            <p className="text-xs text-zinc-600 mt-1">
              Settled {timeAgo(prediction.settled_at)}
            </p>
          )}
        </div>
      )}

      {/* Pool display */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Pool · {formatPoints(totalPool)} pts
        </h3>

        <div className="flex gap-2">
          <div className="flex-1 bg-green-900/20 border border-green-800/30 rounded-xl p-3 text-center">
            <p className="text-green-400 font-black text-lg">{sideA}</p>
            <p className="text-xs text-zinc-500">{formatPoints(poolA)} pts</p>
            <p className="text-xs text-green-500/70 font-semibold">{pctA}%</p>
          </div>
          <div className="flex-1 bg-red-900/20 border border-red-800/30 rounded-xl p-3 text-center">
            <p className="text-red-400 font-black text-lg">{sideB}</p>
            <p className="text-xs text-zinc-500">{formatPoints(poolB)} pts</p>
            <p className="text-xs text-red-500/70 font-semibold">{pctB}%</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          {totalPool > 0 && (
            <div className="h-full flex">
              <div className="h-full bg-green-500" style={{ width: `${pctA}%` }} />
              <div className="h-full bg-red-500" style={{ width: `${pctB}%` }} />
            </div>
          )}
        </div>
      </div>

      {/* Wager form (if prediction is open and user can wager) */}
      {canWager && (
        <WagerForm
          prediction={prediction}
          groupId={groupId}
          currentUserId={currentUserId}
          myWager={myWager}
          balance={balance}
          onSuccess={refreshData}
        />
      )}

      {/* Admin settle panel */}
      {isAdmin && ['OPEN', 'LOCKED'].includes(prediction.status) && (
        <SettlePanel
          prediction={prediction}
          groupId={groupId}
          onSuccess={refreshData}
        />
      )}

      {/* Wagers list */}
      <WagerList
        wagers={prediction.wagers ?? []}
        currentUserId={currentUserId}
        predictionType={prediction.type}
        outcome={prediction.outcome}
      />

      {/* Creator info */}
      <div className="flex items-center gap-2 text-xs text-zinc-600 pb-4">
        <Avatar
          src={prediction.creator?.avatar_url}
          name={prediction.creator?.display_name ?? '?'}
          size="xs"
        />
        <span>
          Created by {prediction.creator?.display_name} · {timeAgo(prediction.created_at)}
        </span>
      </div>
    </div>
  );
}
