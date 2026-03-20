import { notFound } from 'next/navigation';
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

  let user: { id: string } | null = null;
  let member: { role: string } | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;

    if (user) {
      const { data: memberData } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();
      member = memberData;
    }
  } catch {
    // Continue without auth
  }

  const [prediction, balance] = await Promise.all([
    getPrediction(predictionId),
    getMyBalance(groupId),
  ]);

  if (!prediction || prediction.group_id !== groupId) notFound();

  const isAdmin = member ? ['owner', 'moderator'].includes(member.role) : false;
  const myWager = user ? (prediction.wagers?.find((w: any) => w.user_id === user.id) ?? null) : null;

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
          currentUserId={user?.id ?? ''}
          isAdmin={isAdmin}
          myWager={myWager}
          balance={balance ?? 0}
        />
      </main>

      <BottomNav groupId={groupId} />
    </div>
  );
}
