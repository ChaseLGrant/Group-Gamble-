/**
 * Edge Function: place-wager
 *
 * Atomically places or updates a wager on a prediction.
 *
 * POST /functions/v1/place-wager
 * Body: { prediction_id, group_id, pick, amount_points }
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

    const { prediction_id, group_id, pick, amount_points } = await req.json();

    // Validate inputs
    if (!prediction_id || !group_id || !pick || !amount_points) {
      return errorResponse('Missing required fields');
    }
    if (amount_points < 1 || amount_points > 100_000) {
      return errorResponse('amount_points must be between 1 and 100,000');
    }

    // Verify membership
    const { data: member } = await supabaseAdmin
      .from('group_members')
      .select('id')
      .eq('group_id', group_id)
      .eq('user_id', user.id)
      .single();

    if (!member) return errorResponse('Not a group member', 403);

    // Fetch prediction
    const { data: prediction } = await supabaseAdmin
      .from('predictions')
      .select('status, close_time, type, group_id')
      .eq('id', prediction_id)
      .single();

    if (!prediction) return errorResponse('Prediction not found', 404);
    if (prediction.group_id !== group_id) return errorResponse('Group mismatch', 400);
    if (prediction.status !== 'OPEN') return errorResponse('Prediction is not open');

    if (prediction.close_time) {
      const closeTime = new Date(prediction.close_time);
      if (closeTime < new Date()) return errorResponse('Wagering window has closed');
    }

    // Validate pick
    const validPicks: Record<string, string[]> = {
      YES_NO: ['YES', 'NO'],
      OVER_UNDER: ['OVER', 'UNDER'],
    };
    if (!validPicks[prediction.type]?.includes(pick)) {
      return errorResponse(`Invalid pick "${pick}" for type ${prediction.type}`);
    }

    // Check existing wager
    const { data: existingWager } = await supabaseAdmin
      .from('wagers')
      .select('id, amount_points')
      .eq('prediction_id', prediction_id)
      .eq('user_id', user.id)
      .maybeSingle();

    const previousEscrow = existingWager?.amount_points ?? 0;

    // Get balance
    const { data: balanceRow } = await supabaseAdmin
      .from('group_balances')
      .select('balance_points')
      .eq('group_id', group_id)
      .eq('user_id', user.id)
      .single();

    if (!balanceRow) return errorResponse('Balance not found', 500);

    const available = balanceRow.balance_points + previousEscrow;
    if (amount_points > available) {
      return errorResponse(`Insufficient balance. Available: ${available}`);
    }

    const netDelta = amount_points - previousEscrow;

    // Update balance
    if (netDelta !== 0) {
      const { error: balErr } = await supabaseAdmin.rpc('update_balance', {
        p_group_id: group_id,
        p_user_id: user.id,
        p_delta: -netDelta,
      });

      if (balErr) {
        if (balErr.message.includes('insufficient_balance')) {
          return errorResponse('Insufficient balance');
        }
        return errorResponse(balErr.message, 500);
      }
    }

    // Upsert wager
    const { error: wagerErr } = await supabaseAdmin
      .from('wagers')
      .upsert(
        { prediction_id, group_id, user_id: user.id, pick, amount_points, updated_at: new Date().toISOString() },
        { onConflict: 'prediction_id,user_id' }
      );

    if (wagerErr) {
      // Rollback balance
      if (netDelta !== 0) {
        await supabaseAdmin.rpc('update_balance', {
          p_group_id: group_id,
          p_user_id: user.id,
          p_delta: netDelta,
        });
      }
      return errorResponse(wagerErr.message, 500);
    }

    // Record transaction
    if (netDelta !== 0) {
      await supabaseAdmin.from('transactions').insert({
        group_id,
        user_id: user.id,
        prediction_id,
        type: netDelta > 0 ? 'DEBIT' : 'REFUND',
        amount_points: Math.abs(netDelta),
        meta: { pick, previous_amount: previousEscrow },
      });
    }

    return jsonResponse({ success: true });
  } catch (err) {
    return errorResponse(`Internal error: ${err}`, 500);
  }
});
