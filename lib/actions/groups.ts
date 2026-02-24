'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ActionResult, CreateGroupInput } from '@/lib/types';

/**
 * Create a new group.
 * Uses the admin client to insert the group, membership, and balance atomically
 * (bypassing RLS since the user doesn't have a group_member row yet).
 */
export async function createGroup(
  input: CreateGroupInput
): Promise<ActionResult<{ groupId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const name = input.name.trim();
  if (!name || name.length > 80) {
    return { error: 'Group name must be 1–80 characters' };
  }

  const admin = createAdminClient();

  // Create the group
  const { data: group, error: groupError } = await admin
    .from('groups')
    .insert({
      name,
      emoji: input.emoji || '🎲',
      owner_id: user.id,
    })
    .select()
    .single();

  if (groupError || !group) {
    return { error: groupError?.message ?? 'Failed to create group' };
  }

  // Add owner as a member
  const { error: memberError } = await admin.from('group_members').insert({
    group_id: group.id,
    user_id: user.id,
    role: 'owner',
  });

  if (memberError) {
    // Rollback: delete the group
    await admin.from('groups').delete().eq('id', group.id);
    return { error: memberError.message };
  }

  // Initialize balance at 1000 points
  const { error: balanceError } = await admin.from('group_balances').insert({
    group_id: group.id,
    user_id: user.id,
    balance_points: 1000,
  });

  if (balanceError) {
    await admin.from('groups').delete().eq('id', group.id);
    return { error: balanceError.message };
  }

  revalidatePath('/app');
  return { data: { groupId: group.id } };
}

/**
 * Join a group by invite code.
 * Validates the code, checks the user isn't already a member,
 * creates the membership, and initializes their balance.
 */
export async function joinGroupByInvite(
  inviteCode: string
): Promise<ActionResult<{ groupId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const admin = createAdminClient();

  // Find the group by invite code
  const { data: group, error: groupError } = await admin
    .from('groups')
    .select('id, name')
    .eq('invite_code', inviteCode.trim().toUpperCase())
    .single();

  if (groupError || !group) {
    return { error: 'Invalid invite code. Double-check the link and try again.' };
  }

  // Check if already a member
  const { data: existing } = await admin
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    // Already a member — just redirect them
    return { data: { groupId: group.id } };
  }

  // Add membership
  const { error: memberError } = await admin.from('group_members').insert({
    group_id: group.id,
    user_id: user.id,
    role: 'member',
  });

  if (memberError) {
    return { error: memberError.message };
  }

  // Initialize balance
  const { error: balanceError } = await admin.from('group_balances').insert({
    group_id: group.id,
    user_id: user.id,
    balance_points: 1000,
  });

  if (balanceError) {
    return { error: balanceError.message };
  }

  revalidatePath('/app');
  return { data: { groupId: group.id } };
}

/** Fetch all groups the current user belongs to */
export async function getUserGroups() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('group_members')
    .select(
      `
      role,
      joined_at,
      groups (
        id,
        name,
        emoji,
        owner_id,
        invite_code,
        created_at
      )
    `
    )
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false });

  if (error || !data) return [];

  return data.map((row: any) => ({
    ...row.groups,
    role: row.role,
    joined_at: row.joined_at,
  }));
}

/** Fetch group details (only if member) */
export async function getGroup(groupId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single();

  if (error) return null;
  return data;
}

/** Fetch all members of a group with their profiles and balances */
export async function getGroupMembers(groupId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('group_members')
    .select(
      `
      id,
      role,
      joined_at,
      user_id,
      profiles (
        id,
        display_name,
        avatar_url
      ),
      group_balances!inner (
        balance_points,
        updated_at
      )
    `
    )
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true });

  if (error || !data) return [];
  return data as any[];
}

/** Regenerate the invite code for a group (owner only) */
export async function regenerateInviteCode(
  groupId: string
): Promise<ActionResult<{ inviteCode: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Verify ownership
  const { data: member } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (member?.role !== 'owner') return { error: 'Only the owner can regenerate the invite code' };

  const admin = createAdminClient();

  // Generate a new code — use a simple approach
  const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  const { data: updated, error } = await admin
    .from('groups')
    .update({ invite_code: newCode })
    .eq('id', groupId)
    .select('invite_code')
    .single();

  if (error || !updated) return { error: 'Failed to regenerate code' };

  revalidatePath(`/g/${groupId}`);
  return { data: { inviteCode: updated.invite_code } };
}

/** Promote a member to moderator (owner only) */
export async function promoteMember(
  groupId: string,
  targetUserId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: myMembership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (myMembership?.role !== 'owner') return { error: 'Only the owner can promote members' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('group_members')
    .update({ role: 'moderator' })
    .eq('group_id', groupId)
    .eq('user_id', targetUserId)
    .eq('role', 'member'); // only promote members, not other owners

  if (error) return { error: error.message };
  revalidatePath(`/g/${groupId}`);
  return {};
}
