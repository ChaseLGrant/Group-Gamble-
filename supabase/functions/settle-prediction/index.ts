/**
 * Edge Function: settle-prediction
 *
 * POST /functions/v1/settle-prediction
 * Body: { prediction_id, group_id, outcome, outcome_value? }
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

    const { prediction_id, group_id, outcome, outcome_value } = await req.json();
    if (!prediction_id || !group_id || !outcome) {
      return errorResponse('Missing required fields');
    }

    // Verify admin role
    const { data: member } = await supabaseAdmin
      .from('group_members')
      .select('role')
      .eq('group_id', group_id)
      .eq('user_id', user.id)
      .single();

    if (!['owner', 'moderator'].includes(member?.role ?? '')) {
      return errorResponse('Only owner or moderator can settle', 403);
    }

    // Fetch prediction
    const { data: prediction } = await supabaseAdmin
      .from('predictions')
      .select('*')
      .eq('id', prediction_id)
      .eq('group_id', group_id)
      .single();

    if (!prediction) return errorResponse('Prediction not found', 404);
    if (!['OPEN', 'LOCKED'].includes(prediction.status)) {
      return errorResponse('Prediction already settled or canceled');
    }

    // Fetch wagers
    const { data: wagers } = await supabaseAdmin
      .from('wagers')
      .select('*')
      .eq('prediction_id', prediction_id);

    const allWagers = wagers ?? [];

    // Determine final outcome
    let finalOutcome = outcome.toUpperCase();
    let isPush = false;

    if (prediction.type === 'OVER_UNDER' && outcome_value !== undefined) {
      const line = Number(prediction.line);
      if (Number(outcome_value) === line) {
        isPush = true;
        finalOutcome = 'PUSH';
      } else {
        finalOutcome = Number(outcome_value) > line ? 'OVER' : 'UNDER';
      }
    }

    // Handle push
    if (isPush) {
      for (const wager of allWagers) {
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
          meta: { reason: 'push', pick: wager.pick },
        });
      }
    } else {
      const winners = allWagers.filter((w) => w.pick === finalOutcome);
      const losers = allWagers.filter((w) => w.pick !== finalOutcome);
      const winningPool = winners.reduce((s, w) => s + w.amount_points, 0);
      const losingPool = losers.reduce((s, w) => s + w.amount_points, 0);

      let distributed = 0;
      for (let i = 0; i < winners.length; i++) {
        const winner = winners[i];
        let winnings: number;

        if (i === winners.length - 1) {
          winnings = losingPool - distributed;
        } else {
          winnings = winningPool > 0
            ? Math.floor(losingPool * (winner.amount_points / winningPool))
            : 0;
          distributed += winnings;
        }

        const payout = winner.amount_points + winnings;

        await supabaseAdmin.rpc('update_balance', {
          p_group_id: group_id,
          p_user_id: winner.user_id,
          p_delta: payout,
        });

        await supabaseAdmin.from('transactions').insert({
          group_id,
          user_id: winner.user_id,
          prediction_id,
          type: 'PAYOUT',
          amount_points: payout,
          meta: { outcome: finalOutcome, stake: winner.amount_points, winnings },
        });
      }
    }

    // Update prediction
    await supabaseAdmin
      .from('predictions')
      .update({
        status: 'SETTLED',
        settled_at: new Date().toISOString(),
        outcome: finalOutcome,
        outcome_value: outcome_value ?? null,
      })
      .eq('id', prediction_id);

    return jsonResponse({ success: true, outcome: finalOutcome });
  } catch (err) {
    return errorResponse(`Internal error: ${err}`, 500);
  }
});
