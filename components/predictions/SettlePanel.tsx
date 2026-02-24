'use client';

import { useState } from 'react';
import { Lock, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  settlePrediction,
  cancelPrediction,
  lockPrediction,
} from '@/lib/actions/predictions';
import { cn } from '@/lib/utils';

interface SettlePanelProps {
  prediction: any;
  groupId: string;
  onSuccess?: () => void;
}

export default function SettlePanel({ prediction, groupId, onSuccess }: SettlePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [outcomeValue, setOutcomeValue] = useState('');

  async function handleLock() {
    setLoading('lock');
    setError('');
    const result = await lockPrediction(prediction.id, groupId);
    setLoading(null);
    if (result.error) setError(result.error);
    else onSuccess?.();
  }

  async function handleSettle(outcome: string) {
    setLoading(`settle-${outcome}`);
    setError('');

    const numericValue =
      prediction.type === 'OVER_UNDER' && outcomeValue
        ? parseFloat(outcomeValue)
        : undefined;

    const result = await settlePrediction(
      prediction.id,
      groupId,
      outcome,
      numericValue
    );

    setLoading(null);

    if (result.error) {
      setError(result.error);
    } else {
      onSuccess?.();
    }
  }

  async function handleCancel() {
    if (!confirm('Cancel this prediction and refund all wagers?')) return;
    setLoading('cancel');
    setError('');
    const result = await cancelPrediction(prediction.id, groupId);
    setLoading(null);
    if (result.error) setError(result.error);
    else onSuccess?.();
  }

  const picks = prediction.type === 'YES_NO'
    ? ['YES', 'NO']
    : ['OVER', 'UNDER'];

  return (
    <div className="border border-yellow-800/40 bg-yellow-900/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <CheckCircle size={16} className="text-yellow-400" />
          <span className="text-sm font-semibold text-yellow-300">
            Moderator Controls
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-yellow-600" />
        ) : (
          <ChevronDown size={16} className="text-yellow-600" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-yellow-800/30">
          {/* Lock button (if OPEN) */}
          {prediction.status === 'OPEN' && (
            <div className="pt-4">
              <Button
                variant="outline"
                fullWidth
                onClick={handleLock}
                loading={loading === 'lock'}
                className="border-yellow-800/50 text-yellow-400 hover:border-yellow-600"
              >
                <Lock size={16} />
                Lock Wagering (No More Picks)
              </Button>
            </div>
          )}

          {/* Settle section */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Settle Outcome
            </h4>

            {/* O/U: optional actual value input */}
            {prediction.type === 'OVER_UNDER' && (
              <Input
                label={`Actual result${prediction.unit ? ` (${prediction.unit})` : ''}`}
                type="number"
                inputMode="decimal"
                placeholder={`e.g. ${prediction.line}`}
                value={outcomeValue}
                onChange={(e) => setOutcomeValue(e.target.value)}
                hint={`Line is ${prediction.line}${prediction.unit ? ` ${prediction.unit}` : ''}. Enter the actual number to auto-compute, or pick manually below.`}
              />
            )}

            {/* Outcome buttons */}
            <div className="grid grid-cols-2 gap-3">
              {picks.map((outcome) => (
                <Button
                  key={outcome}
                  variant={outcome === 'YES' || outcome === 'OVER' ? 'secondary' : 'secondary'}
                  onClick={() => handleSettle(outcome)}
                  loading={loading === `settle-${outcome}`}
                  className={cn(
                    'border',
                    outcome === 'YES' || outcome === 'OVER'
                      ? 'border-green-700/50 text-green-400 hover:bg-green-900/20'
                      : 'border-red-700/50 text-red-400 hover:bg-red-900/20'
                  )}
                >
                  <CheckCircle size={16} />
                  {outcome} Wins
                </Button>
              ))}
            </div>
          </div>

          {/* Cancel */}
          <div className="pt-1 border-t border-yellow-800/20">
            <Button
              variant="danger"
              fullWidth
              onClick={handleCancel}
              loading={loading === 'cancel'}
            >
              <XCircle size={16} />
              Cancel & Refund All
            </Button>
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
