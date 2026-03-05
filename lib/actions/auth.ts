'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/types';

/** Resolve the app URL, falling back to localhost if unset */
function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

/** Send a magic link to the user's email */
export async function signInWithEmail(email: string): Promise<ActionResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return {
      error:
        'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your Vercel project settings (or .env.local for local development).',
    };
  }

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
}

/** Sign in with Google OAuth */
export async function signInWithGoogle(): Promise<ActionResult<{ url: string }>> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return {
      error:
        'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your Vercel project settings (or .env.local for local development).',
    };
  }

  const supabase = await createClient();
  const redirectTo = `${getAppUrl()}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  });

  if (error) {
    console.error('signInWithGoogle error:', error.message);
    return { error: error.message };
  }

  return { data: { url: data.url! } };
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
  avatarUrl?: string
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

  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      display_name: trimmed,
      ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}),
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
