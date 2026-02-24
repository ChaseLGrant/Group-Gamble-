'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { createGroup } from '@/lib/actions/groups';

const EMOJI_OPTIONS = ['🎲', '🍺', '🎯', '🏆', '🎉', '🃏', '⚡', '🔥', '🌙', '🎪', '🍕', '🎸'];

export default function CreateGroupForm({ onSuccess }: { onSuccess?: (id: string) => void }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎲');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Group name is required');
      return;
    }

    setLoading(true);
    const result = await createGroup({ name: name.trim(), emoji });
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (result.data?.groupId) {
      if (onSuccess) {
        onSuccess(result.data.groupId);
      } else {
        router.push(`/g/${result.data.groupId}`);
      }
    }
  }

  if (!showForm) {
    return (
      <Button onClick={() => setShowForm(true)} size="lg">
        <Plus size={20} />
        Create a Group
      </Button>
    );
  }

  return (
    <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 animate-slide-up">
      <h3 className="font-bold text-center">New Group</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Emoji picker */}
        <div>
          <label className="text-sm font-medium text-zinc-300 block mb-2">Group Icon</label>
          <div className="grid grid-cols-6 gap-2">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`
                  h-10 rounded-xl text-xl flex items-center justify-center
                  transition-all duration-150
                  ${emoji === e
                    ? 'bg-violet-600/30 border-2 border-violet-500 scale-110'
                    : 'bg-zinc-800 border border-zinc-700 hover:bg-zinc-700'
                  }
                `}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Group Name"
          type="text"
          placeholder="Friday Night Out, Fantasy League, etc."
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          error={error}
          autoFocus
        />

        <div className="flex gap-3">
          <Button
            type="button"
            variant="ghost"
            fullWidth
            onClick={() => setShowForm(false)}
          >
            Cancel
          </Button>
          <Button type="submit" fullWidth loading={loading}>
            {emoji} Create
          </Button>
        </div>
      </form>
    </div>
  );
}
