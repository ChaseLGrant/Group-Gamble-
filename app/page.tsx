import { redirect } from 'next/navigation';
import AuthForm from '@/components/auth/AuthForm';
import { BrandHeader } from '@/components/layout/Header';

interface PageProps {
  searchParams: Promise<{ error?: string; redirectTo?: string }>;
}

export default async function LandingPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Redirect logged-in users to app (skip if Supabase is unavailable)
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect('/app');
    }
  } catch (e: unknown) {
    // If the error is a Next.js redirect, re-throw it so redirect works
    if (e instanceof Error && 'digest' in e && typeof (e as any).digest === 'string' && (e as any).digest.startsWith('NEXT_REDIRECT')) {
      throw e;
    }
    // Otherwise Supabase is unavailable — continue rendering the page
    console.error('Supabase unavailable on landing page:', e);
  }

  return (
    <main className="flex flex-col min-h-screen px-6">
      <BrandHeader />

      <div className="flex-1 flex flex-col justify-center gap-8 pb-12">
        {/* Error banner */}
        {params.error && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-400 text-sm text-center">
            {decodeURIComponent(params.error)}
          </div>
        )}

        {/* How it works */}
        <div className="space-y-3">
          {[
            { emoji: '🎯', text: 'Create prediction lines for your group' },
            { emoji: '💰', text: 'Bet play-money points on the outcome' },
            { emoji: '🏆', text: 'Winner takes the pot — no real money' },
          ].map((item) => (
            <div key={item.emoji} className="flex items-center gap-3 text-sm text-zinc-400">
              <span className="text-2xl">{item.emoji}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        {/* Auth form */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-5 text-center">Get started — it&apos;s free</h2>
          <AuthForm redirectTo={params.redirectTo} />
        </div>
      </div>
    </main>
  );
}
