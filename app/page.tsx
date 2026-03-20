import { redirect } from 'next/navigation';
import AuthForm from '@/components/auth/AuthForm';
import { BrandHeader } from '@/components/layout/Header';

const FEATURES = [
  { emoji: '🎯', title: 'Create', text: 'Set prediction lines for your group' },
  { emoji: '💰', title: 'Wager', text: 'Bet play-money points on outcomes' },
  { emoji: '🏆', title: 'Win', text: 'Winner takes the pot — no real money' },
] as const;

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
    <main className="flex flex-col min-h-screen px-6 relative overflow-hidden">
      {/* Ambient background orbs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-32 -left-32 w-72 h-72 bg-violet-600/15 rounded-full blur-3xl animate-glow" />
        <div className="absolute top-1/3 -right-24 w-56 h-56 bg-fuchsia-600/10 rounded-full blur-3xl animate-glow [animation-delay:2s]" />
        <div className="absolute bottom-24 -left-16 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl animate-glow [animation-delay:4s]" />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        <BrandHeader />

        <div className="flex-1 flex flex-col justify-center gap-8 pb-12">
          {/* Error banner */}
          {params.error && (
            <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-400 text-sm text-center">
              {decodeURIComponent(params.error)}
            </div>
          )}

          {/* How it works — premium feature cards */}
          <div className="space-y-3 animate-hero-fade-in [animation-delay:0.2s] opacity-0">
            {FEATURES.map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-sm transition-colors hover:border-violet-500/20"
              >
                <span className="text-2xl shrink-0">{item.emoji}</span>
                <div>
                  <span className="text-sm font-semibold text-zinc-200">{item.title}</span>
                  <p className="text-sm text-zinc-500">{item.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Auth — premium card */}
          <div className="card-premium p-6 animate-hero-slide-up [animation-delay:0.4s] opacity-0">
            <h2 className="text-lg font-bold mb-5 text-center text-zinc-100">
              Jump in — it&apos;s free
            </h2>
            <AuthForm redirectTo={params.redirectTo} />
          </div>

          {/* Trust indicator */}
          <p className="text-center text-xs text-zinc-600 animate-hero-fade-in [animation-delay:0.6s] opacity-0">
            100% play money · Invite-only groups
          </p>
        </div>
      </div>
    </main>
  );
}
