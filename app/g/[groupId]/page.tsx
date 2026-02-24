import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Plus, Share2, Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getGroup } from '@/lib/actions/groups';
import { getGroupPredictions } from '@/lib/actions/predictions';
import { getMyBalance } from '@/lib/actions/wagers';
import PredictionFeed from '@/components/predictions/PredictionFeed';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import ShareButton from './ShareButton';
import BalanceBadge from './BalanceBadge';

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default async function GroupPage({ params }: PageProps) {
  const { groupId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/');

  // Verify membership and get group
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!membership) notFound();

  const [group, predictions, balance] = await Promise.all([
    getGroup(groupId),
    getGroupPredictions(groupId),
    getMyBalance(groupId),
  ]);

  if (!group) notFound();

  const isAdmin = ['owner', 'moderator'].includes(membership.role);

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title={`${group.emoji} ${group.name}`}
        backHref="/app"
        right={
          <div className="flex items-center gap-2">
            <BalanceBadge balance={balance ?? 0} />
            <ShareButton inviteCode={group.invite_code} groupName={group.name} />
          </div>
        }
      />

      <main className="flex-1 px-4 pt-4 pb-28">
        <PredictionFeed
          groupId={groupId}
          initialPredictions={predictions}
          currentUserId={user.id}
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
