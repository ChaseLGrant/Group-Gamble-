/**
 * Edge Function: join-group
 *
 * POST /functions/v1/join-group
 * Body: { invite_code: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsResult = handleCors(req);
  if (corsResult) return corsResult;

  try {
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

    const { invite_code } = await req.json();
    if (!invite_code) return errorResponse('invite_code is required');

    // Find group
    const { data: group, error: groupError } = await supabaseAdmin
      .from('groups')
      .select('id, name')
      .eq('invite_code', invite_code.trim().toUpperCase())
      .single();

    if (groupError || !group) {
      return errorResponse('Invalid invite code', 404);
    }

    // Check existing membership (idempotent)
    const { data: existing } = await supabaseAdmin
      .from('group_members')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      return jsonResponse({ group_id: group.id, already_member: true });
    }

    // Add membership + balance
    await supabaseAdmin.from('group_members').insert({
      group_id: group.id,
      user_id: user.id,
      role: 'member',
    });

    await supabaseAdmin.from('group_balances').insert({
      group_id: group.id,
      user_id: user.id,
      balance_points: 1000,
    });

    return jsonResponse({ group_id: group.id, joined: true });
  } catch (err) {
    return errorResponse(`Internal error: ${err}`, 500);
  }
});
