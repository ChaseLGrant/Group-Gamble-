import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Email confirmation route — handles Supabase email templates that
 * redirect to /auth/confirm?token_hash=...&type=...
 *
 * This is the default path used by Supabase's built-in email templates
 * for magic links and email confirmations.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/app';

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      // Successfully verified — redirect to the app (via callback logic)
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error('Email confirmation error:', error.message);
  }

  // Verification failed — redirect to home with error
  return NextResponse.redirect(
    `${origin}/?error=${encodeURIComponent('Email verification failed. Please request a new link.')}`
  );
}
