/**
 * Edge Function: cancel-prediction
 *
 * Cancels a prediction and refunds all wagers.
 *
 * POST /functions/v1/cancel-prediction
 * Body: { prediction_id, group_id }
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

    const { prediction_id, group_id } = await req.json();
    if (!prediction_id || !group_id) return errorResponse('Missing required fields');

    // Verify admin role
    const { data: member } = await supabaseAdmin
      .from('group_members')
      .select('role')
      .eq('group_id', group_id)
      .eq('user_id', user.id)
      .single();

    if (!['owner', 'moderator'].includes(member?.role ?? '')) {
      return errorResponse('Only owner or moderator can cancel', 403);
    }

    // Fetch prediction
    const { data: prediction } = await supabaseAdmin
      .from('predictions')
      .select('status')
      .eq('id', prediction_id)
      .eq('group_id', group_id)
      .single();

    if (!prediction) return errorResponse('Prediction not found', 404);
    if (prediction.status === 'SETTLED') return errorResponse('Cannot cancel a settled prediction');
    if (prediction.status === 'CANCELED') return errorResponse('Already canceled');

    // Fetch and refund wagers
    const { data: wagers } = await supabaseAdmin
      .from('wagers')
      .select('*')
      .eq('prediction_id', prediction_id);

    for (const wager of wagers ?? []) {
      await supabaseAdmin.rpc('update_balance', {
        p_group_id: group_id,
        p_user_id: wager.user_id,
        p_delta: wager.amount_points,
      });
      await supabaseAdmin.from('transactions').insert({
        group_id,
        user_id: wager.user_id,
        prediction_id,
        type: 'REFUND',
        amount_points: wager.amount_points,
        meta: { reason: 'canceled' },
      });
    }

    await supabaseAdmin
      .from('predictions')
      .update({ status: 'CANCELED' })
      .eq('id', prediction_id);

    return jsonResponse({ success: true, refunded: wagers?.length ?? 0 });
  } catch (err) {
    return errorResponse(`Internal error: ${err}`, 500);
  }
});
