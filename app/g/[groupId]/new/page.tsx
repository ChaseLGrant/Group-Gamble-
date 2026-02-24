import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CreatePredictionForm from '@/components/predictions/CreatePredictionForm';
import Header from '@/components/layout/Header';

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default async function NewPredictionPage({ params }: PageProps) {
  const { groupId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/');

  // Verify membership
  const { data: member } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!member) notFound();

  const { data: group } = await supabase
    .from('groups')
    .select('name, emoji')
    .eq('id', groupId)
    .single();

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="New Prediction"
        subtitle={group ? `${group.emoji} ${group.name}` : undefined}
        backHref={`/g/${groupId}`}
      />

      <main className="flex-1 px-4 py-4 pb-10">
        <CreatePredictionForm groupId={groupId} />
      </main>
    </div>
  );
}
