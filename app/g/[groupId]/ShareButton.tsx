'use client';

import { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';
import { inviteUrl } from '@/lib/utils';

interface ShareButtonProps {
  inviteCode: string;
  groupName: string;
}

export default function ShareButton({ inviteCode, groupName }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = inviteUrl(inviteCode);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join "${groupName}" on Group Gamble`,
          text: 'Make predictions with me!',
          url,
        });
        return;
      } catch {
        // Fall through to clipboard
      }
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 transition-colors p-1.5 rounded-lg hover:bg-zinc-800"
      title="Share invite link"
    >
      {copied ? (
        <Check size={18} className="text-green-400" />
      ) : (
        <Share2 size={18} />
      )}
    </button>
  );
}
