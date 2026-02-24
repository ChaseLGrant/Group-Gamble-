/**
 * Application-level types derived from the database schema.
 * These are the types used throughout the UI.
 */

import type { Database } from './database.types';

// Base row types from DB
export type Profile     = Database['public']['Tables']['profiles']['Row'];
export type Group       = Database['public']['Tables']['groups']['Row'];
export type GroupMember = Database['public']['Tables']['group_members']['Row'];
export type GroupBalance = Database['public']['Tables']['group_balances']['Row'];
export type Prediction  = Database['public']['Tables']['predictions']['Row'];
export type Wager       = Database['public']['Tables']['wagers']['Row'];
export type Transaction = Database['public']['Tables']['transactions']['Row'];

// Enum helpers
export type UserRole         = GroupMember['role'];
export type PredictionType   = Prediction['type'];
export type PredictionStatus = Prediction['status'];
export type WagerPick        = Wager['pick'];
export type TransactionType  = Transaction['type'];

// Enriched types used in the UI
export interface PredictionWithWagers extends Prediction {
  creator?: Profile;
  wagers?: WagerWithProfile[];
  /** Aggregated pool sizes */
  pool?: {
    yes_points: number;
    no_points: number;
    over_points: number;
    under_points: number;
    total_points: number;
  };
}

export interface WagerWithProfile extends Wager {
  profile?: Profile;
}

export interface GroupMemberWithProfile extends GroupMember {
  profile?: Profile;
  balance?: GroupBalance;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  balance_points: number;
  net_points: number;   // balance - 1000 (starting points)
  wins: number;
  losses: number;
  win_rate: number;
  rank: number;
}

// Form input types
export interface CreateGroupInput {
  name: string;
  emoji: string;
}

export interface CreatePredictionInput {
  title: string;
  description?: string;
  type: PredictionType;
  line?: number;
  unit?: string;
  subject?: string;
  close_time?: string;
}

export interface PlaceWagerInput {
  prediction_id: string;
  group_id: string;
  pick: WagerPick;
  amount_points: number;
}

export interface SettlePredictionInput {
  prediction_id: string;
  group_id: string;
  /** For YES_NO: 'YES' | 'NO'. For OVER_UNDER: 'OVER' | 'UNDER' OR provide outcome_value */
  outcome: string;
  /** Optional actual numeric result. If provided for OVER_UNDER, outcome is computed. */
  outcome_value?: number;
}

// Server action response wrapper
export interface ActionResult<T = void> {
  data?: T;
  error?: string;
}
