'use client';

import { useState } from 'react';
import { Mail, ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { signInWithEmail, signInWithGoogle } from '@/lib/actions/auth';

interface AuthFormProps {
  redirectTo?: string;
}

export default function AuthForm({ redirectTo }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  // Check if Supabase environment variables are set (client-side check)
  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const result = await signInWithEmail(email.trim().toLowerCase());
      if (result.error) {
        setError(result.error);
      } else {
        setSent(true);
      }
    } catch {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.data?.url) {
        window.location.href = result.data.url;
      } else {
        setError(result.error ?? 'Failed to start Google sign-in');
        setGoogleLoading(false);
      }
    } catch {
      setError('Unable to reach the server. Please try again.');
      setGoogleLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center space-y-4 animate-fade-in">
        <div className="text-5xl">📬</div>
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Check your email</h2>
          <p className="text-zinc-400 mt-1 text-sm">
            We sent a magic link to{' '}
            <span className="text-violet-400 font-medium">{email}</span>
          </p>
        </div>
        <p className="text-xs text-zinc-600">
          Link expires in 1 hour. Check your spam folder if you don&apos;t see it.
        </p>
        <button
          onClick={() => { setSent(false); setEmail(''); }}
          className="text-sm text-zinc-500 underline underline-offset-2"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Supabase configuration warning */}
      {!supabaseConfigured && (
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-3 text-yellow-400 text-xs text-center">
          ⚠️ Supabase is not configured. Set <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
          <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your <code className="font-mono">.env.local</code> file.
        </div>
      )}
      {/* Google OAuth */}
      <Button
        variant="secondary"
        fullWidth
        onClick={handleGoogle}
        loading={googleLoading}
        className="border border-zinc-700"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continue with Google
      </Button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-zinc-800" />
        <span className="text-xs text-zinc-600">or</span>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>

      {/* Magic link form */}
      <form onSubmit={handleEmailSubmit} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftAddon={<Mail size={16} />}
          error={error}
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect="off"
          inputMode="email"
        />
        <Button type="submit" fullWidth loading={loading} size="lg">
          Send magic link
          <ArrowRight size={18} />
        </Button>
      </form>

      <p className="text-xs text-center text-zinc-600">
        No password needed. We&apos;ll email you a sign-in link.
      </p>
    </div>
  );
}
