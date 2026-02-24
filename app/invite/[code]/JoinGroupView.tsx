'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import Button from '@/components/ui/Button';
import { joinGroupByInvite } from '@/lib/actions/groups';

interface JoinGroupViewProps {
  group: { id: string; name: string; emoji: string };
  inviteCode: string;
}

export default function JoinGroupView({ group, inviteCode }: JoinGroupViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleJoin() {
    setLoading(true);
    setError('');
    const result = await joinGroupByInvite(inviteCode);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (result.data?.groupId) {
      router.push(`/g/${result.data.groupId}`);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-6">
      <div className="text-7xl animate-bounce-once">{group.emoji}</div>

      <div>
        <p className="text-zinc-500 text-sm mb-1">You&apos;re invited to join</p>
        <h1 className="text-2xl font-black text-zinc-100">{group.name}</h1>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 w-full space-y-2">
        <div className="flex items-center gap-2 justify-center text-zinc-400 text-sm">
          <Users size={16} />
          <span>You&apos;ll start with <strong className="text-yellow-400">1,000 points</strong></span>
        </div>
        <p className="text-xs text-zinc-600">
          Play-money only. No real money involved.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <div className="w-full space-y-3">
        <Button fullWidth size="lg" onClick={handleJoin} loading={loading}>
          Join {group.name}
        </Button>
        <Button fullWidth variant="ghost" onClick={() => router.push('/app')}>
          Maybe later
        </Button>
      </div>
    </div>
  );
}
