import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { joinGroupByInvite } from '@/lib/actions/groups';
import JoinGroupView from './JoinGroupView';

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function InvitePage({ params }: PageProps) {
  const { code } = await params;

  let user: { id: string } | null = null;
  let group: { id: string; name: string; emoji: string } | null = null;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;

    // Find the group by invite code (preview before joining)
    const { data: groupData } = await supabase
      .from('groups')
      .select('id, name, emoji')
      .eq('invite_code', code.toUpperCase())
      .single();
    group = groupData;

    // Check if already a member
    if (user && group) {
      const { data: existing } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        redirect(`/g/${group.id}`);
      }
    }
  } catch (e: unknown) {
    // If the error is a Next.js redirect, re-throw it
    if (e instanceof Error && 'digest' in e && typeof (e as any).digest === 'string' && (e as any).digest.startsWith('NEXT_REDIRECT')) {
      throw e;
    }
    // Otherwise continue rendering
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-4">
        <div className="text-5xl">❌</div>
        <h1 className="text-xl font-bold">Invalid invite link</h1>
        <p className="text-zinc-500">This invite code doesn&apos;t exist or has been regenerated.</p>
        <a href="/app" className="text-violet-400 underline">Go to my groups</a>
      </div>
    );
  }

  return (
    <JoinGroupView
      group={group}
      inviteCode={code}
    />
  );
}
