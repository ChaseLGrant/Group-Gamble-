import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SettingsForm from './SettingsForm';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';

interface PageProps {
  searchParams: Promise<{ firstLogin?: string }>;
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const params = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const isFirstLogin = params.firstLogin === 'true';

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title={isFirstLogin ? 'Set Up Your Profile' : 'Profile'}
        backHref={isFirstLogin ? undefined : '/app'}
      />

      <main className="flex-1 px-4 py-6 pb-28">
        {isFirstLogin && (
          <div className="mb-6 bg-violet-900/20 border border-violet-800/50 rounded-xl p-4">
            <p className="text-sm text-violet-300 text-center">
              👋 Welcome! Set a display name so your friends can find you.
            </p>
          </div>
        )}

        <SettingsForm
          profile={profile}
          userEmail={user.email}
          isFirstLogin={isFirstLogin}
        />
      </main>

      {!isFirstLogin && <BottomNav />}
    </div>
  );
}
