'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ToggleLeft, TrendingUp, Clock, User, AlignLeft } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input, { Textarea } from '@/components/ui/Input';
import { createPrediction } from '@/lib/actions/predictions';
import type { PredictionType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CreatePredictionFormProps {
  groupId: string;
}

export default function CreatePredictionForm({ groupId }: CreatePredictionFormProps) {
  const router = useRouter();
  const [type, setType] = useState<PredictionType>('YES_NO');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [line, setLine] = useState('');
  const [unit, setUnit] = useState('');
  const [closeTime, setCloseTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('A title is required');
      return;
    }

    if (type === 'OVER_UNDER' && !line) {
      setError('The line (number) is required for Over/Under predictions');
      return;
    }

    setLoading(true);

    const result = await createPrediction(groupId, {
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      line: type === 'OVER_UNDER' ? parseFloat(line) : undefined,
      unit: type === 'OVER_UNDER' ? unit.trim() || undefined : undefined,
      subject: subject.trim() || undefined,
      close_time: closeTime || undefined,
    });

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (result.data?.predictionId) {
      router.push(`/g/${groupId}/p/${result.data.predictionId}`);
    }
  }

  // Local datetime for close_time min value
  const nowLocal = new Date(Date.now() + 5 * 60_000)
    .toISOString()
    .slice(0, 16);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Type selector */}
      <div>
        <label className="text-sm font-medium text-zinc-300 block mb-2">Prediction Type</label>
        <div className="grid grid-cols-2 gap-2">
          {(['YES_NO', 'OVER_UNDER'] as PredictionType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                'flex flex-col items-center gap-1.5 py-3 px-4 rounded-xl border-2 transition-all',
                type === t
                  ? 'border-violet-500 bg-violet-600/10 text-violet-300'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
              )}
            >
              {t === 'YES_NO' ? (
                <ToggleLeft size={20} />
              ) : (
                <TrendingUp size={20} />
              )}
              <span className="text-sm font-semibold">
                {t === 'YES_NO' ? 'Yes / No' : 'Over / Under'}
              </span>
              <span className="text-xs opacity-70">
                {t === 'YES_NO' ? 'Will it happen?' : 'Will it exceed a number?'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <Input
        label="Question / Title *"
        type="text"
        placeholder={
          type === 'YES_NO'
            ? 'Will Bob arrive before midnight?'
            : 'Total beers consumed tonight'
        }
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        leftAddon={<AlignLeft size={15} />}
      />

      {/* Over/Under specific fields */}
      {type === 'OVER_UNDER' && (
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="The Line *"
            type="number"
            inputMode="decimal"
            placeholder="7.5"
            value={line}
            onChange={(e) => setLine(e.target.value)}
            step="0.5"
            min="0"
            leftAddon={<TrendingUp size={15} />}
          />
          <Input
            label="Unit (optional)"
            type="text"
            placeholder="beers, mins, pts…"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            maxLength={20}
          />
        </div>
      )}

      {/* Subject (optional) */}
      <Input
        label="Subject (optional)"
        type="text"
        placeholder="Who is this about? e.g. Dave"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        maxLength={50}
        leftAddon={<User size={15} />}
      />

      {/* Description */}
      <Textarea
        label="Details (optional)"
        placeholder="Any extra context or rules…"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        maxLength={500}
      />

      {/* Close time */}
      <Input
        label="Wagering closes at (optional)"
        type="datetime-local"
        value={closeTime}
        onChange={(e) => setCloseTime(e.target.value)}
        min={nowLocal}
        hint="After this time, no more new picks"
        leftAddon={<Clock size={15} />}
      />

      {/* Error */}
      {error && (
        <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg p-3">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          fullWidth
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" fullWidth loading={loading} size="md">
          Create Prediction
        </Button>
      </div>
    </form>
  );
}
