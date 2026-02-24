'use client';

import Link from 'next/link';
import { Clock, TrendingUp, User } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import {
  statusLabel,
  statusColor,
  timeAgo,
  formatLine,
  computePool,
  formatPoints,
  pickColor,
  isPredictionOpen,
  cn,
} from '@/lib/utils';
import type { PredictionWithWagers, Wager } from '@/lib/types';

interface PredictionCardProps {
  prediction: PredictionWithWagers;
  groupId: string;
  myWager?: Wager | null;
  showStatusBadge?: boolean;
}

export default function PredictionCard({
  prediction,
  groupId,
  myWager,
  showStatusBadge = true,
}: PredictionCardProps) {
  const pool = computePool(prediction.wagers ?? []);
  const isOpen = isPredictionOpen(prediction.status, prediction.close_time);
  const wagersCount = prediction.wagers?.length ?? 0;

  const sideA = prediction.type === 'YES_NO' ? 'YES' : 'OVER';
  const sideB = prediction.type === 'YES_NO' ? 'NO' : 'UNDER';
  const poolA = prediction.type === 'YES_NO' ? pool.yes_points : pool.over_points;
  const poolB = prediction.type === 'YES_NO' ? pool.no_points : pool.under_points;
  const totalPool = poolA + poolB;

  const pctA = totalPool > 0 ? Math.round((poolA / totalPool) * 100) : 50;
  const pctB = 100 - pctA;

  return (
    <Link href={`/g/${groupId}/p/${prediction.id}`}>
      <article className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden active:bg-zinc-800/80 transition-colors">
        {/* Header */}
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              {/* Subject */}
              {prediction.subject && (
                <div className="flex items-center gap-1 mb-1">
                  <User size={11} className="text-zinc-500" />
                  <span className="text-xs text-zinc-500 font-medium">{prediction.subject}</span>
                </div>
              )}
              <h3 className="font-semibold text-zinc-100 leading-snug">{prediction.title}</h3>
            </div>

            {/* Badges */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {showStatusBadge && (
                <span
                  className={cn(
                    'text-[11px] font-bold px-2 py-0.5 rounded-full',
                    statusColor(prediction.status)
                  )}
                >
                  {statusLabel(prediction.status)}
                </span>
              )}
              <Badge
                variant={prediction.type === 'YES_NO' ? 'purple' : 'blue'}
                size="sm"
              >
                {prediction.type === 'YES_NO' ? 'YES/NO' : 'O/U'}
              </Badge>
            </div>
          </div>

          {/* Line (O/U) */}
          {prediction.type === 'OVER_UNDER' && prediction.line !== null && (
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp size={13} className="text-zinc-500" />
              <span className="text-sm text-zinc-400">
                Line: <span className="text-zinc-200 font-semibold">{formatLine(prediction.line!, prediction.unit)}</span>
              </span>
            </div>
          )}

          {/* Description */}
          {prediction.description && (
            <p className="text-sm text-zinc-500 line-clamp-2 mb-2">{prediction.description}</p>
          )}

          {/* Settled outcome */}
          {prediction.status === 'SETTLED' && prediction.outcome && (
            <div className="flex items-center gap-2 mt-1 mb-2">
              <span className="text-xs text-zinc-500">Result:</span>
              <span className={cn('text-sm font-bold', pickColor(prediction.outcome))}>
                {prediction.outcome === 'PUSH' ? '↔ PUSH (Refunded)' : prediction.outcome}
                {prediction.outcome_value !== null && ` (${prediction.outcome_value} ${prediction.unit ?? ''})`}
              </span>
            </div>
          )}

          {/* My pick indicator */}
          {myWager && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-zinc-600">Your pick:</span>
              <span className={cn('text-xs font-bold', pickColor(myWager.pick))}>
                {myWager.pick}
              </span>
              <span className="text-xs text-zinc-600">· {formatPoints(myWager.amount_points)} pts</span>
            </div>
          )}
        </div>

        {/* Pool visualization */}
        <div className="px-4 pb-4">
          {/* Progress bar */}
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
            {totalPool > 0 ? (
              <div className="h-full flex">
                <div
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${pctA}%` }}
                />
                <div
                  className="h-full bg-red-500 transition-all duration-300"
                  style={{ width: `${pctB}%` }}
                />
              </div>
            ) : (
              <div className="h-full bg-zinc-700 rounded-full" />
            )}
          </div>

          {/* Pool stats */}
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-1">
              <span className="text-green-400 font-bold">{sideA}</span>
              <span className="text-zinc-600">{formatPoints(poolA)} pts ({pctA}%)</span>
            </div>
            <div className="text-zinc-600 text-[11px]">
              {wagersCount} {wagersCount === 1 ? 'pick' : 'picks'}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-zinc-600">{formatPoints(poolB)} pts ({pctB}%)</span>
              <span className="text-red-400 font-bold">{sideB}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar
              src={prediction.creator?.avatar_url}
              name={prediction.creator?.display_name ?? '?'}
              size="xs"
            />
            <span className="text-xs text-zinc-500">
              {prediction.creator?.display_name}
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs text-zinc-600">
            <Clock size={11} />
            {timeAgo(prediction.created_at)}
          </div>
        </div>
      </article>
    </Link>
  );
}
