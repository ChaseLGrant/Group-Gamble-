'use client';

import { useState } from 'react';
import { Coins, TrendingUp } from 'lucide-react';
import Button from '@/components/ui/Button';
import { placeOrUpdateWager } from '@/lib/actions/wagers';
import {
  pickBgColor,
  formatPoints,
  estimatePayout,
  computePool,
  cn,
} from '@/lib/utils';
import type { WagerPick } from '@/lib/types';

interface WagerFormProps {
  prediction: any;
  groupId: string;
  currentUserId: string;
  myWager: any | null;
  balance: number;
  onSuccess?: () => void;
}

const QUICK_AMOUNTS = [25, 50, 100, 250];

export default function WagerForm({
  prediction,
  groupId,
  myWager,
  balance,
  onSuccess,
}: WagerFormProps) {
  const [pick, setPick] = useState<WagerPick | ''>(myWager?.pick ?? '');
  const [amount, setAmount] = useState<number>(myWager?.amount_points ?? 50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isEditing = !!myWager;

  // Available balance includes the escrowed amount from existing wager
  const availableBalance = balance + (myWager?.amount_points ?? 0);

  const pool = computePool(prediction.wagers ?? []);

  // Estimate payout if we pick sideA
  function getEstimatedPayout(selectedPick: WagerPick) {
    const poolA = selectedPick === 'YES' || selectedPick === 'OVER'
      ? (selectedPick === 'YES' ? pool.yes_points : pool.over_points)
      : (selectedPick === 'NO' ? pool.no_points : pool.under_points);
    const poolB = prediction.type === 'YES_NO'
      ? (selectedPick === 'YES' ? pool.no_points : pool.yes_points)
      : (selectedPick === 'OVER' ? pool.under_points : pool.over_points);

    // Add the current user's new amount to the pool (minus their existing)
    const myCurrentOnSide = myWager?.pick === selectedPick ? myWager.amount_points : 0;
    const adjustedPoolA = poolA - myCurrentOnSide + amount;
    const adjustedPoolB = poolB - (myWager?.pick !== selectedPick ? (myWager?.amount_points ?? 0) : 0);

    return estimatePayout(amount, adjustedPoolA, adjustedPoolB);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!pick) {
      setError('Select a side to wager on');
      return;
    }
    if (amount < 1) {
      setError('Minimum wager is 1 point');
      return;
    }
    if (amount > availableBalance) {
      setError(`You only have ${formatPoints(availableBalance)} points available`);
      return;
    }

    setLoading(true);
    const result = await placeOrUpdateWager({
      prediction_id: prediction.id,
      group_id: groupId,
      pick,
      amount_points: amount,
    });
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      onSuccess?.();
    }
  }

  const picks: WagerPick[] =
    prediction.type === 'YES_NO' ? ['YES', 'NO'] : ['OVER', 'UNDER'];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">
          {isEditing ? 'Edit Your Pick' : 'Place Your Pick'}
        </h3>
        <div className="flex items-center gap-1 text-xs text-yellow-400">
          <Coins size={12} />
          <span>{formatPoints(availableBalance)} available</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Pick selector */}
        <div className="grid grid-cols-2 gap-3">
          {picks.map((p) => {
            const isSelected = pick === p;
            const estPayout = isSelected ? getEstimatedPayout(p) : null;

            return (
              <button
                key={p}
                type="button"
                onClick={() => setPick(p)}
                className={cn(
                  'flex flex-col items-center gap-1 py-4 rounded-xl border-2 transition-all duration-150',
                  pickBgColor(p, isSelected)
                )}
              >
                <span className="text-xl font-black">{p}</span>
                {isSelected && estPayout !== null && (
                  <span className="text-xs opacity-70">
                    ~{formatPoints(estPayout)} pts
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Amount input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300 flex items-center gap-1">
            <Coins size={14} />
            Wager Amount
          </label>

          {/* Quick amounts */}
          <div className="flex gap-2 flex-wrap">
            {QUICK_AMOUNTS.filter((a) => a <= availableBalance).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAmount(a)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-semibold transition-all border',
                  amount === a
                    ? 'bg-violet-600/20 border-violet-500 text-violet-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                )}
              >
                {a}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAmount(availableBalance)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-semibold transition-all border',
                amount === availableBalance
                  ? 'bg-violet-600/20 border-violet-500 text-violet-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
              )}
            >
              All In
            </button>
          </div>

          {/* Custom amount */}
          <input
            type="number"
            min={1}
            max={availableBalance}
            value={amount}
            onChange={(e) => setAmount(Math.min(parseInt(e.target.value) || 0, availableBalance))}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 text-right text-lg font-bold focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50"
            inputMode="numeric"
          />
        </div>

        {/* Payout estimate */}
        {pick && amount > 0 && (
          <div className="flex items-center justify-between text-xs text-zinc-500 bg-zinc-800/50 rounded-lg p-2.5">
            <span className="flex items-center gap-1">
              <TrendingUp size={12} />
              Estimated payout if you win
            </span>
            <span className="font-bold text-zinc-300">
              ~{formatPoints(getEstimatedPayout(pick as WagerPick))} pts
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {/* Success */}
        {success && (
          <p className="text-sm text-green-400 text-center">
            ✓ Pick {isEditing ? 'updated' : 'placed'}!
          </p>
        )}

        <Button
          type="submit"
          fullWidth
          loading={loading}
          disabled={!pick || amount < 1}
          size="lg"
        >
          {isEditing ? 'Update Pick' : 'Confirm Pick'} · {formatPoints(amount)} pts
        </Button>
      </form>
    </div>
  );
}
