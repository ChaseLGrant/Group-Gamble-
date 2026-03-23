import AuthForm from '@/components/auth/AuthForm';
import { BrandHeader } from '@/components/layout/Header';

interface PageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function AuthPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const redirectTo = params.redirect || '/app';

  return (
    <main className="flex flex-col min-h-screen px-6 relative overflow-hidden">
      {/* Ambient background orbs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-32 -left-32 w-72 h-72 bg-violet-600/15 rounded-full blur-3xl animate-glow" />
        <div className="absolute top-1/3 -right-24 w-56 h-56 bg-fuchsia-600/10 rounded-full blur-3xl animate-glow [animation-delay:2s]" />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        <BrandHeader />

        <div className="flex-1 flex flex-col justify-center gap-8 pb-12">
          <div className="card-premium p-6">
            <h2 className="text-lg font-bold mb-5 text-center text-zinc-100">
              Sign in to continue
            </h2>
            <AuthForm redirectTo={redirectTo} />
          </div>
        </div>
      </div>
    </main>
  );
}
