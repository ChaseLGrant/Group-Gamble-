import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getGroup } from '@/lib/actions/groups';
import { getLeaderboard } from '@/lib/actions/wagers';
import Leaderboard from '@/components/leaderboard/Leaderboard';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default async function LeaderboardPage({ params }: PageProps) {
  const { groupId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/');

  const { data: member } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!member) notFound();

  const [group, leaderboard] = await Promise.all([
    getGroup(groupId),
    getLeaderboard(groupId),
  ]);

  if (!group) notFound();

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Leaderboard"
        subtitle={`${group.emoji} ${group.name}`}
        backHref={`/g/${groupId}`}
      />

      <main className="flex-1 px-4 py-4 pb-28">
        <Leaderboard
          entries={leaderboard}
          currentUserId={user.id}
          groupId={groupId}
        />
      </main>

      <BottomNav groupId={groupId} />
    </div>
  );
}
