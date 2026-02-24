import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Auth callback route — handles:
 * 1. Magic link email confirmation
 * 2. OAuth (Google) redirect
 *
 * Supabase redirects here with ?code=... after successful auth.
 * We exchange the code for a session and redirect to the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/app';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error('Auth error:', error, errorDescription);
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent(errorDescription ?? error)}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      // Check if user has a complete profile (display_name set)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single();

        // If profile is missing or has a raw email prefix as name, send to settings
        const rawEmailPrefix = user.email?.split('@')[0] ?? '';
        const needsSetup =
          !profile ||
          profile.display_name === rawEmailPrefix ||
          profile.display_name.length < 2;

        if (needsSetup) {
          return NextResponse.redirect(`${origin}/settings?firstLogin=true`);
        }
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
  }

  // No code or exchange failed — redirect to home with error
  return NextResponse.redirect(
    `${origin}/?error=${encodeURIComponent('Authentication failed. Please try again.')}`
  );
}
