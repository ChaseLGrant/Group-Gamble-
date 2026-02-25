import { NextResponse, type NextRequest } from 'next/server';
import { type EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/**
 * Auth callback route — handles:
 * 1. Magic link email confirmation (PKCE code exchange)
 * 2. OAuth (Google) redirect
 * 3. Email OTP token_hash verification (fallback for non-PKCE flows)
 *
 * Supabase redirects here with ?code=... or ?token_hash=...&type=... after auth.
 * We exchange the code/token for a session and redirect to the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/app';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error('Auth callback error:', error, errorDescription);
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent(errorDescription ?? error)}`
    );
  }

  const supabase = await createClient();
  let authenticated = false;

  // Flow 1: PKCE code exchange (default for magic links and OAuth)
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      console.error('Code exchange failed:', exchangeError.message);
    } else {
      authenticated = true;
    }
  }

  // Flow 2: token_hash verification (email OTP / confirmation fallback)
  if (!authenticated && token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (verifyError) {
      console.error('Token hash verification failed:', verifyError.message);
    } else {
      authenticated = true;
    }
  }

  if (authenticated) {
    // Ensure the user has a profile row (fallback in case the DB trigger hasn't run)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single();

        // If no profile exists, create one (handles case where DB trigger hasn't fired)
        if (!profile) {
          const fallbackName =
            user.user_metadata?.full_name ??
            user.user_metadata?.name ??
            user.email?.split('@')[0] ??
            'User';
          await supabase.from('profiles').upsert({
            id: user.id,
            display_name: fallbackName,
            avatar_url: user.user_metadata?.avatar_url ?? null,
          });
          return NextResponse.redirect(`${origin}/settings?firstLogin=true`);
        }

        // If profile has a raw email prefix as name, send to settings
        const rawEmailPrefix = user.email?.split('@')[0] ?? '';
        const needsSetup =
          profile.display_name === rawEmailPrefix ||
          profile.display_name.length < 2;

        if (needsSetup) {
          return NextResponse.redirect(`${origin}/settings?firstLogin=true`);
        }
      }
    } catch (profileError) {
      // Profile check/creation failed — not critical, continue to app
      console.error('Profile check error (non-fatal):', profileError);
    }

    // Redirect to the intended destination or /app
    const forwardedHost = request.headers.get('x-forwarded-host');
    const isLocalEnv = process.env.NODE_ENV === 'development';

    if (isLocalEnv) {
      return NextResponse.redirect(`${origin}${next}`);
    } else if (forwardedHost) {
      return NextResponse.redirect(`https://${forwardedHost}${next}`);
    } else {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // No code/token or exchange failed — redirect to home with error
  return NextResponse.redirect(
    `${origin}/?error=${encodeURIComponent('Authentication failed. Please try again.')}`
  );
}
