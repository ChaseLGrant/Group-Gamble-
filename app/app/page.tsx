import { getUserGroups } from '@/lib/actions/groups';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import GroupsClient from './GroupsClient';

export default async function AppHomePage() {
  let groups: Awaited<ReturnType<typeof getUserGroups>> = [];
  try {
    groups = await getUserGroups();
  } catch {
    // If fetching groups fails (e.g. no auth), show empty list
  }

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
