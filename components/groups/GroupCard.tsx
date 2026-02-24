'use client';

import Link from 'next/link';
import { ChevronRight, Users } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { timeAgo } from '@/lib/utils';

interface GroupCardProps {
  group: {
    id: string;
    name: string;
    emoji: string;
    role: string;
    created_at: string;
    joined_at?: string;
  };
}

export default function GroupCard({ group }: GroupCardProps) {
  return (
    <Link href={`/g/${group.id}`}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4 active:bg-zinc-800/80 transition-colors">
        {/* Emoji icon */}
        <div className="h-12 w-12 rounded-xl bg-zinc-800 flex items-center justify-center text-2xl flex-shrink-0">
          {group.emoji}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-zinc-100 truncate">{group.name}</h3>
            {group.role === 'owner' && (
              <Badge variant="purple" size="sm">Owner</Badge>
            )}
            {group.role === 'moderator' && (
              <Badge variant="yellow" size="sm">Mod</Badge>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
            <Users size={11} />
            Joined {timeAgo(group.joined_at ?? group.created_at)}
          </p>
        </div>

        <ChevronRight size={18} className="text-zinc-600 flex-shrink-0" />
      </div>
    </Link>
  );
}
