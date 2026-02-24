/**
 * Edge Function: create-group
 *
 * Creates a group, adds the caller as owner, initializes their balance.
 * Alternative to the Next.js server action — deploy this if you prefer
 * Supabase Edge Functions over server actions.
 *
 * POST /functions/v1/create-group
 * Body: { name: string, emoji?: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResult = handleCors(req);
  if (corsResult) return corsResult;

  try {
    // Auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return errorResponse('Missing authorization header', 401);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) return errorResponse('Unauthorized', 401);

    // Parse body
    const { name, emoji = '🎲' } = await req.json();
    if (!name?.trim()) return errorResponse('Group name is required');

    // Create group
    const { data: group, error: groupError } = await supabaseAdmin
      .from('groups')
      .insert({ name: name.trim(), emoji, owner_id: user.id })
      .select()
      .single();

    if (groupError || !group) {
      return errorResponse(groupError?.message ?? 'Failed to create group', 500);
    }

    // Add owner membership
    await supabaseAdmin.from('group_members').insert({
      group_id: group.id,
      user_id: user.id,
      role: 'owner',
    });

    // Initialize balance
    await supabaseAdmin.from('group_balances').insert({
      group_id: group.id,
      user_id: user.id,
      balance_points: 1000,
    });

    return jsonResponse({ group });
  } catch (err) {
    return errorResponse(`Internal error: ${err}`, 500);
  }
});
