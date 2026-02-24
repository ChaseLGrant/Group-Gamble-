import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPrediction } from '@/lib/actions/predictions';
import { getMyBalance } from '@/lib/actions/wagers';
import PredictionDetailView from './PredictionDetailView';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';

interface PageProps {
  params: Promise<{ groupId: string; predictionId: string }>;
}

export default async function PredictionDetailPage({ params }: PageProps) {
  const { groupId, predictionId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/');

  // Verify group membership
  const { data: member } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!member) notFound();

  const [prediction, balance] = await Promise.all([
    getPrediction(predictionId),
    getMyBalance(groupId),
  ]);

  if (!prediction || prediction.group_id !== groupId) notFound();

  const isAdmin = ['owner', 'moderator'].includes(member.role);
  const myWager = prediction.wagers?.find((w: any) => w.user_id === user.id) ?? null;

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title={prediction.title}
        backHref={`/g/${groupId}`}
      />

      <main className="flex-1 pb-28">
        <PredictionDetailView
          prediction={prediction}
          groupId={groupId}
          currentUserId={user.id}
          isAdmin={isAdmin}
          myWager={myWager}
          balance={balance ?? 0}
        />
      </main>

      <BottomNav groupId={groupId} />
    </div>
  );
}
