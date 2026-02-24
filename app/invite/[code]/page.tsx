import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { joinGroupByInvite } from '@/lib/actions/groups';
import JoinGroupView from './JoinGroupView';

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function InvitePage({ params }: PageProps) {
  const { code } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not logged in? Redirect to landing with intent to join
  if (!user) {
    redirect(`/?redirectTo=/invite/${code}`);
  }

  // Find the group by invite code (preview before joining)
  const { data: group } = await supabase
    .from('groups')
    .select('id, name, emoji')
    .eq('invite_code', code.toUpperCase())
    .single();

  if (!group) {
    // Invalid code — show error
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-4">
        <div className="text-5xl">❌</div>
        <h1 className="text-xl font-bold">Invalid invite link</h1>
        <p className="text-zinc-500">This invite code doesn&apos;t exist or has been regenerated.</p>
        <a href="/app" className="text-violet-400 underline">Go to my groups</a>
      </div>
    );
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    // Already a member — redirect straight to the group
    redirect(`/g/${group.id}`);
  }

  return (
    <JoinGroupView
      group={group}
      inviteCode={code}
    />
  );
}
