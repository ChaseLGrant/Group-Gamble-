import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CreatePredictionForm from '@/components/predictions/CreatePredictionForm';
import Header from '@/components/layout/Header';

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default async function NewPredictionPage({ params }: PageProps) {
  const { groupId } = await params;

  let group: { name: string; emoji: string } | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('groups')
      .select('name, emoji')
      .eq('id', groupId)
      .single();
    group = data;
  } catch {
    // Continue without group data
  }

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
