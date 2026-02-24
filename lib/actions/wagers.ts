'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ActionResult, PlaceWagerInput } from '@/lib/types';
import { isExpired } from '@/lib/utils';

/**
 * Place or update a wager on a prediction.
 *
 * Logic:
 * 1. Verify user is a group member
 * 2. Verify prediction is OPEN and close_time hasn't passed
 * 3. If existing wager: refund the previous amount first
 * 4. Verify user has enough balance for the new amount
 * 5. Deduct (escrow) the new amount
 * 6. Upsert the wager
 * 7. Write DEBIT transaction
 */
export async function placeOrUpdateWager(
  input: PlaceWagerInput
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const { prediction_id, group_id, pick, amount_points } = input;

  // Basic validation
  if (amount_points < 1) return { error: 'Minimum wager is 1 point' };
  if (amount_points > 100_000) return { error: 'Maximum wager is 100,000 points' };

  // Verify membership
  const { data: member } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group_id)
    .eq('user_id', user.id)
    .single();

  if (!member) return { error: 'You are not a member of this group' };

  const admin = createAdminClient();

  // Fetch prediction
  const { data: prediction, error: predError } = await admin
    .from('predictions')
    .select('status, close_time, type, group_id')
    .eq('id', prediction_id)
    .single();

  if (predError || !prediction) return { error: 'Prediction not found' };
  if (prediction.group_id !== group_id) return { error: 'Prediction does not belong to this group' };
  if (prediction.status !== 'OPEN') return { error: 'This prediction is no longer accepting wagers' };
  if (prediction.close_time && isExpired(prediction.close_time)) {
    return { error: 'The wagering window has closed' };
  }

  // Validate pick type
  const validPicks: Record<string, string[]> = {
    YES_NO: ['YES', 'NO'],
    OVER_UNDER: ['OVER', 'UNDER'],
  };
  if (!validPicks[prediction.type]?.includes(pick)) {
    return { error: `Invalid pick "${pick}" for this prediction type` };
  }

  // Check for existing wager
  const { data: existingWager } = await admin
    .from('wagers')
    .select('id, amount_points')
    .eq('prediction_id', prediction_id)
    .eq('user_id', user.id)
    .maybeSingle();

  // Fetch current balance
  const { data: balanceRow } = await admin
    .from('group_balances')
    .select('balance_points')
    .eq('group_id', group_id)
    .eq('user_id', user.id)
    .single();

  if (!balanceRow) return { error: 'Balance record not found' };

  const previousEscrow = existingWager?.amount_points ?? 0;
  const availableBalance = balanceRow.balance_points + previousEscrow; // include refund of previous

  if (amount_points > availableBalance) {
    return {
      error: `Insufficient points. You have ${availableBalance.toLocaleString()} available.`,
    };
  }

  const netDelta = amount_points - previousEscrow; // positive = debit more, negative = refund diff

  // Atomic balance update
  if (netDelta !== 0) {
    const { error: balError } = await admin.rpc('update_balance', {
      p_group_id: group_id,
      p_user_id: user.id,
      p_delta: -netDelta, // negative to deduct, positive to refund
    });

    if (balError) {
      if (balError.message.includes('insufficient_balance')) {
        return { error: 'Insufficient points balance' };
      }
      return { error: balError.message };
    }
  }

  // Upsert the wager
  const { error: wagerError } = await admin
    .from('wagers')
    .upsert(
      {
        prediction_id,
        group_id,
        user_id: user.id,
        pick,
        amount_points,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'prediction_id,user_id' }
    );

  if (wagerError) {
    // Rollback balance change
    if (netDelta !== 0) {
      await admin.rpc('update_balance', {
        p_group_id: group_id,
        p_user_id: user.id,
        p_delta: netDelta, // reverse
      });
    }
    return { error: wagerError.message };
  }

  // Write transaction record
  if (netDelta !== 0) {
    await admin.from('transactions').insert({
      group_id,
      user_id: user.id,
      prediction_id,
      type: netDelta > 0 ? 'DEBIT' : 'REFUND',
      amount_points: Math.abs(netDelta),
      meta: {
        pick,
        action: existingWager ? 'updated_wager' : 'placed_wager',
        previous_amount: previousEscrow,
      },
    });
  }

  revalidatePath(`/g/${group_id}/p/${prediction_id}`);
  revalidatePath(`/g/${group_id}`);
  return {};
}

/** Fetch the current user's wager for a prediction (if any) */
export async function getMyWager(predictionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from('wagers')
    .select('*')
    .eq('prediction_id', predictionId)
    .eq('user_id', user.id)
    .maybeSingle();

  return data;
}

/** Fetch my balance in a group */
export async function getMyBalance(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from('group_balances')
    .select('balance_points')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  return data?.balance_points ?? null;
}

/** Fetch the leaderboard for a group */
export async function getLeaderboard(groupId: string) {
  const supabase = await createClient();

  // Get all members with their balances and profiles
  const { data, error } = await supabase
    .from('group_balances')
    .select(
      `
      user_id,
      balance_points,
      profile:profiles (
        display_name,
        avatar_url
      )
    `
    )
    .eq('group_id', groupId)
    .order('balance_points', { ascending: false });

  if (error || !data) return [];

  // Compute wins / losses from settled wagers
  const { data: wagerData } = await supabase
    .from('wagers')
    .select('user_id, pick')
    .eq('group_id', groupId);

  const { data: settledPreds } = await supabase
    .from('predictions')
    .select('id, outcome')
    .eq('group_id', groupId)
    .eq('status', 'SETTLED')
    .not('outcome', 'eq', 'PUSH');

  const settledMap = new Map<string, string>(
    (settledPreds ?? []).map((p: any) => [p.id, p.outcome])
  );

  const { data: settledWagers } = await supabase
    .from('wagers')
    .select('user_id, prediction_id, pick')
    .eq('group_id', groupId)
    .in('prediction_id', Array.from(settledMap.keys()));

  const stats = new Map<string, { wins: number; losses: number }>();
  for (const w of settledWagers ?? []) {
    const outcome = settledMap.get(w.prediction_id);
    if (!outcome) continue;
    const s = stats.get(w.user_id) ?? { wins: 0, losses: 0 };
    if (w.pick === outcome) s.wins++;
    else s.losses++;
    stats.set(w.user_id, s);
  }

  return (data as any[]).map((row, index) => {
    const s = stats.get(row.user_id) ?? { wins: 0, losses: 0 };
    const total = s.wins + s.losses;
    return {
      rank: index + 1,
      user_id: row.user_id,
      display_name: row.profile?.display_name ?? 'Unknown',
      avatar_url: row.profile?.avatar_url ?? null,
      balance_points: row.balance_points,
      net_points: row.balance_points - 1000,
      wins: s.wins,
      losses: s.losses,
      win_rate: total > 0 ? Math.round((s.wins / total) * 100) : 0,
    };
  });
}
