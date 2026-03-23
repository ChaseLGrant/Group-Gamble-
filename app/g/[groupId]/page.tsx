import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getGroup } from '@/lib/actions/groups';
import { getGroupPredictions } from '@/lib/actions/predictions';
import { getMyBalance } from '@/lib/actions/wagers';
import PredictionFeed from '@/components/predictions/PredictionFeed';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import ShareButton from './ShareButton';
import BalanceBadge from './BalanceBadge';
import AddMemberByPhone from '@/components/groups/AddMemberByPhone';

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default async function GroupPage({ params }: PageProps) {
  const { groupId } = await params;

  let user: { id: string } | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Continue without auth
  }

  let membership: { role: string } | null = null;
  if (user) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();
      membership = data;
    } catch {
      // Continue without membership
    }
  }

  const [group, predictions, balance] = await Promise.all([
    getGroup(groupId),
    getGroupPredictions(groupId),
    getMyBalance(groupId),
  ]);

  if (!group) notFound();

  const isAdmin = membership ? ['owner', 'moderator'].includes(membership.role) : false;

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title={`${group.emoji} ${group.name}`}
        backHref="/app"
        right={
          <div className="flex items-center gap-2">
            <BalanceBadge balance={balance ?? 0} />
            <AddMemberByPhone groupId={groupId} />
            <ShareButton inviteCode={group.invite_code} groupName={group.name} />
          </div>
        }
      />

      <main className="flex-1 px-4 pt-4 pb-28">
        <PredictionFeed
          groupId={groupId}
          initialPredictions={predictions}
          currentUserId={user?.id ?? ''}
          isAdmin={isAdmin}
        />
      </main>

      {/* FAB: Create prediction */}
      <Link
        href={`/g/${groupId}/new`}
        className="fixed bottom-20 right-4 z-50 flex items-center gap-2 bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-semibold rounded-2xl px-4 py-3 shadow-xl shadow-violet-900/50 transition-all"
      >
        <Plus size={20} />
        <span className="text-sm">New Pick</span>
      </Link>

      <BottomNav groupId={groupId} />
    </div>
  );
}
