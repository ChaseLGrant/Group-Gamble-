'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PHONE_REGEX, normalizePhone } from '@/lib/utils';
import type { ActionResult } from '@/lib/types';

/** Resolve the app URL, falling back to Vercel env vars then localhost */
function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

/**
 * Verify the Supabase project is reachable by hitting the auth health endpoint.
 * Returns an error message if unreachable, or null if healthy.
 */
async function verifySupabaseConnection(): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null; // Handled by the env-var check in callers

  try {
    const response = await fetch(`${url}/auth/v1/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) {
      return `Authentication service returned status ${response.status}. Please check your Supabase project configuration.`;
    }
    return null;
  } catch (e) {
    console.error('Supabase connectivity check failed:', e);
    return `Unable to connect to the authentication service. Please verify that your Supabase project URL is correct and the project is not paused.`;
  }
}

/** Send a magic link to the user's email */
export async function signInWithEmail(email: string): Promise<ActionResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return {
      error:
        'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.',
    };
  }

  const connError = await verifySupabaseConnection();
  if (connError) return { error: connError };

  try {
    const supabase = await createClient();
    const redirectTo = `${getAppUrl()}/auth/callback`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      console.error('signInWithEmail error:', error.message);
      return { error: error.message };
    }

    return {};
  } catch (e) {
    console.error('signInWithEmail unexpected error:', e);
    return { error: 'Unable to send magic link. Please try again later.' };
  }
}

/** Sign in with Google OAuth. Pass an optional `next` path to redirect after auth. */
export async function signInWithGoogle(next?: string): Promise<ActionResult<{ url: string }>> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return {
      error:
        'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.',
    };
  }

  const connError = await verifySupabaseConnection();
  if (connError) return { error: connError };

  try {
    const supabase = await createClient();
    const callbackUrl = new URL(`${getAppUrl()}/auth/callback`);
    if (next) {
      callbackUrl.searchParams.set('next', next);
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      console.error('signInWithGoogle error:', error.message);
      return { error: error.message };
    }

    return { data: { url: data.url! } };
  } catch (e) {
    console.error('signInWithGoogle unexpected error:', e);
    return { error: 'Unable to start Google sign-in. Please try again later.' };
  }
}

/** Sign out and redirect to home */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}

/** Update the current user's profile */
export async function updateProfile(
  displayName: string,
  avatarUrl?: string,
  phone?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const trimmed = displayName.trim();
  if (!trimmed || trimmed.length < 1 || trimmed.length > 50) {
    return { error: 'Display name must be 1–50 characters' };
  }

  // Normalize phone: strip everything except digits and leading +
  let normalizedPhone: string | null = null;
  if (phone !== undefined && phone.trim()) {
    normalizedPhone = normalizePhone(phone);
    if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) {
      return { error: 'Phone number must be 7–15 digits (optionally starting with +)' };
    }
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      display_name: trimmed,
      ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}),
      ...(phone !== undefined ? { phone: normalizedPhone } : {}),
    })
    .eq('id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/settings');
  revalidatePath('/app');
  return {};
}

/** Get the current user's profile */
export async function getProfile() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return data;
}
