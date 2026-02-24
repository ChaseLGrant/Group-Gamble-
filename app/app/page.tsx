import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserGroups } from '@/lib/actions/groups';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import GroupsClient from './GroupsClient';

export default async function AppHomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/');

  const groups = await getUserGroups();

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Your Groups" />
      <main className="flex-1 px-4 py-4 pb-28">
        <GroupsClient initialGroups={groups} />
      </main>
      <BottomNav />
    </div>
  );
}
