'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ActionResult, CreatePredictionInput } from '@/lib/types';

/** Create a new prediction in a group */
export async function createPrediction(
  groupId: string,
  input: CreatePredictionInput
): Promise<ActionResult<{ predictionId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  // Verify membership
  const { data: member } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!member) return { error: 'You are not a member of this group' };

  // Validate input
  const title = input.title.trim();
  if (!title || title.length > 200) {
    return { error: 'Title must be 1–200 characters' };
  }
  if (input.type === 'OVER_UNDER' && (input.line === undefined || input.line === null)) {
    return { error: 'Line is required for Over/Under predictions' };
  }

  const { data: prediction, error } = await supabase
    .from('predictions')
    .insert({
      group_id: groupId,
      created_by: user.id,
      title,
      description: input.description?.trim() || null,
      type: input.type,
      line: input.type === 'OVER_UNDER' ? input.line : null,
      unit: input.type === 'OVER_UNDER' ? (input.unit?.trim() || null) : null,
      subject: input.subject?.trim() || null,
      close_time: input.close_time || null,
      status: 'OPEN',
    })
    .select('id')
    .single();

  if (error || !prediction) {
    return { error: error?.message ?? 'Failed to create prediction' };
  }

  revalidatePath(`/g/${groupId}`);
  return { data: { predictionId: prediction.id } };
}

/** Fetch all predictions for a group, newest first */
export async function getGroupPredictions(groupId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('predictions')
    .select(
      `
      *,
      creator:profiles!predictions_created_by_fkey (
        id,
        display_name,
        avatar_url
      ),
      wagers (
        id,
        user_id,
        pick,
        amount_points
      )
    `
    )
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as any[];
}

/** Fetch a single prediction with all wagers and profiles */
export async function getPrediction(predictionId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('predictions')
    .select(
      `
      *,
      creator:profiles!predictions_created_by_fkey (
        id,
        display_name,
        avatar_url
      ),
      wagers (
        *,
        profile:profiles (
          id,
          display_name,
          avatar_url
        )
      )
    `
    )
    .eq('id', predictionId)
    .single();

  if (error || !data) return null;
  return data as any;
}

/**
 * Settle a prediction.
 * Only the group owner or moderator can call this.
 * Handles payout distribution atomically.
 */
export async function settlePrediction(
  predictionId: string,
  groupId: string,
  outcome: string,
  outcomeValue?: number
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  // Verify admin role
  const { data: member } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!['owner', 'moderator'].includes(member?.role ?? '')) {
    return { error: 'Only the group owner or moderator can settle predictions' };
  }

  const admin = createAdminClient();

  // Get prediction (with lock check)
  const { data: prediction, error: predError } = await admin
    .from('predictions')
    .select('*')
    .eq('id', predictionId)
    .eq('group_id', groupId)
    .single();

  if (predError || !prediction) {
    return { error: 'Prediction not found' };
  }

  if (!['OPEN', 'LOCKED'].includes(prediction.status)) {
    return { error: 'This prediction has already been settled or canceled' };
  }

  // Get all wagers
  const { data: wagers, error: wagersError } = await admin
    .from('wagers')
    .select('*')
    .eq('prediction_id', predictionId);

  if (wagersError) {
    return { error: wagersError.message };
  }

  const allWagers = wagers ?? [];

  // Determine final outcome
  let finalOutcome = outcome.toUpperCase();
  let isPush = false;

  if (prediction.type === 'OVER_UNDER' && outcomeValue !== undefined) {
    const line = Number(prediction.line);
    if (outcomeValue === line) {
      isPush = true;
      finalOutcome = 'PUSH';
    } else {
      finalOutcome = outcomeValue > line ? 'OVER' : 'UNDER';
    }
  }

  // Handle PUSH: refund everyone
  if (isPush) {
    for (const wager of allWagers) {
      await admin.rpc('update_balance', {
        p_group_id: groupId,
        p_user_id: wager.user_id,
        p_delta: wager.amount_points,
      });

      await admin.from('transactions').insert({
        group_id: groupId,
        user_id: wager.user_id,
        prediction_id: predictionId,
        type: 'REFUND',
        amount_points: wager.amount_points,
        meta: { reason: 'push', pick: wager.pick, wager_id: wager.id },
      });
    }

    await admin
      .from('predictions')
      .update({
        status: 'SETTLED',
        settled_at: new Date().toISOString(),
        outcome: 'PUSH',
        outcome_value: outcomeValue ?? null,
      })
      .eq('id', predictionId);

    revalidatePath(`/g/${groupId}`);
    revalidatePath(`/g/${groupId}/p/${predictionId}`);
    return {};
  }

  // Normal settlement: split into winners and losers
  const winners = allWagers.filter((w) => w.pick === finalOutcome);
  const losers = allWagers.filter((w) => w.pick !== finalOutcome);

  const winningPool = winners.reduce((sum, w) => sum + w.amount_points, 0);
  const losingPool = losers.reduce((sum, w) => sum + w.amount_points, 0);

  // Pay winners proportionally; handle rounding via last-winner adjustment
  let distributed = 0;
  for (let i = 0; i < winners.length; i++) {
    const winner = winners[i];
    let winnings: number;

    if (i === winners.length - 1) {
      // Last winner gets any remainder to avoid rounding loss
      winnings = losingPool - distributed;
    } else {
      winnings = winningPool > 0 ? Math.floor(losingPool * (winner.amount_points / winningPool)) : 0;
      distributed += winnings;
    }

    const payout = winner.amount_points + winnings;

    await admin.rpc('update_balance', {
      p_group_id: groupId,
      p_user_id: winner.user_id,
      p_delta: payout,
    });

    await admin.from('transactions').insert({
      group_id: groupId,
      user_id: winner.user_id,
      prediction_id: predictionId,
      type: 'PAYOUT',
      amount_points: payout,
      meta: {
        outcome: finalOutcome,
        stake: winner.amount_points,
        winnings,
        wager_id: winner.id,
      },
    });
  }

  // Mark prediction as settled
  await admin
    .from('predictions')
    .update({
      status: 'SETTLED',
      settled_at: new Date().toISOString(),
      outcome: finalOutcome,
      outcome_value: outcomeValue !== undefined ? outcomeValue : null,
    })
    .eq('id', predictionId);

  revalidatePath(`/g/${groupId}`);
  revalidatePath(`/g/${groupId}/p/${predictionId}`);
  return {};
}

/**
 * Cancel a prediction and refund all wagers.
 * Only owner or moderator can cancel.
 */
export async function cancelPrediction(
  predictionId: string,
  groupId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const { data: member } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!['owner', 'moderator'].includes(member?.role ?? '')) {
    return { error: 'Only the group owner or moderator can cancel predictions' };
  }

  const admin = createAdminClient();

  const { data: prediction } = await admin
    .from('predictions')
    .select('status')
    .eq('id', predictionId)
    .eq('group_id', groupId)
    .single();

  if (!prediction || prediction.status === 'SETTLED') {
    return { error: 'Cannot cancel an already-settled prediction' };
  }
  if (prediction.status === 'CANCELED') {
    return { error: 'Prediction is already canceled' };
  }

  // Fetch wagers to refund
  const { data: wagers } = await admin
    .from('wagers')
    .select('*')
    .eq('prediction_id', predictionId);

  for (const wager of wagers ?? []) {
    await admin.rpc('update_balance', {
      p_group_id: groupId,
      p_user_id: wager.user_id,
      p_delta: wager.amount_points,
    });

    await admin.from('transactions').insert({
      group_id: groupId,
      user_id: wager.user_id,
      prediction_id: predictionId,
      type: 'REFUND',
      amount_points: wager.amount_points,
      meta: { reason: 'canceled', wager_id: wager.id },
    });
  }

  await admin
    .from('predictions')
    .update({ status: 'CANCELED' })
    .eq('id', predictionId);

  revalidatePath(`/g/${groupId}`);
  revalidatePath(`/g/${groupId}/p/${predictionId}`);
  return {};
}

/** Lock a prediction (no more wagers) */
export async function lockPrediction(
  predictionId: string,
  groupId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const { data: member } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!['owner', 'moderator'].includes(member?.role ?? '')) {
    return { error: 'Only the group owner or moderator can lock predictions' };
  }

  const { error } = await supabase
    .from('predictions')
    .update({ status: 'LOCKED' })
    .eq('id', predictionId)
    .eq('group_id', groupId)
    .eq('status', 'OPEN');

  if (error) return { error: error.message };

  revalidatePath(`/g/${groupId}`);
  revalidatePath(`/g/${groupId}/p/${predictionId}`);
  return {};
}
