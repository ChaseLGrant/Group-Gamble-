/**
 * Supabase Database Types
 * Auto-generate these with: npx supabase gen types typescript --local
 * This file provides manual types for the beta MVP.
 */
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_url?: string | null;
          phone?: string | null;
          created_at?: string;
        };
      };
      groups: {
        Row: {
          id: string;
          name: string;
          emoji: string;
          owner_id: string;
          invite_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          emoji?: string;
          owner_id: string;
          invite_code?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          emoji?: string;
          owner_id?: string;
          invite_code?: string;
          created_at?: string;
        };
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          role: 'owner' | 'member' | 'moderator';
          joined_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          role?: 'owner' | 'member' | 'moderator';
          joined_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          role?: 'owner' | 'member' | 'moderator';
          joined_at?: string;
        };
      };
      group_balances: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          balance_points: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          balance_points?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          balance_points?: number;
          updated_at?: string;
        };
      };
      predictions: {
        Row: {
          id: string;
          group_id: string;
          created_by: string;
          title: string;
          description: string | null;
          type: 'YES_NO' | 'OVER_UNDER';
          line: number | null;
          unit: string | null;
          subject: string | null;
          status: 'OPEN' | 'LOCKED' | 'SETTLED' | 'CANCELED';
          close_time: string | null;
          settled_at: string | null;
          outcome: string | null;
          outcome_value: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          created_by: string;
          title: string;
          description?: string | null;
          type: 'YES_NO' | 'OVER_UNDER';
          line?: number | null;
          unit?: string | null;
          subject?: string | null;
          status?: 'OPEN' | 'LOCKED' | 'SETTLED' | 'CANCELED';
          close_time?: string | null;
          settled_at?: string | null;
          outcome?: string | null;
          outcome_value?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          created_by?: string;
          title?: string;
          description?: string | null;
          type?: 'YES_NO' | 'OVER_UNDER';
          line?: number | null;
          unit?: string | null;
          subject?: string | null;
          status?: 'OPEN' | 'LOCKED' | 'SETTLED' | 'CANCELED';
          close_time?: string | null;
          settled_at?: string | null;
          outcome?: string | null;
          outcome_value?: number | null;
          created_at?: string;
        };
      };
      wagers: {
        Row: {
          id: string;
          prediction_id: string;
          group_id: string;
          user_id: string;
          pick: 'YES' | 'NO' | 'OVER' | 'UNDER';
          amount_points: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          prediction_id: string;
          group_id: string;
          user_id: string;
          pick: 'YES' | 'NO' | 'OVER' | 'UNDER';
          amount_points: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          prediction_id?: string;
          group_id?: string;
          user_id?: string;
          pick?: 'YES' | 'NO' | 'OVER' | 'UNDER';
          amount_points?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          prediction_id: string | null;
          type: 'DEBIT' | 'CREDIT' | 'REFUND' | 'PAYOUT';
          amount_points: number;
          created_at: string;
          meta: Json;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          prediction_id?: string | null;
          type: 'DEBIT' | 'CREDIT' | 'REFUND' | 'PAYOUT';
          amount_points: number;
          created_at?: string;
          meta?: Json;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          prediction_id?: string | null;
          type?: 'DEBIT' | 'CREDIT' | 'REFUND' | 'PAYOUT';
          amount_points?: number;
          created_at?: string;
          meta?: Json;
        };
      };
    };
    Functions: {
      is_group_member: {
        Args: { p_group_id: string };
        Returns: boolean;
      };
      is_group_admin: {
        Args: { p_group_id: string };
        Returns: boolean;
      };
      update_balance: {
        Args: { p_group_id: string; p_user_id: string; p_delta: number };
        Returns: void;
      };
    };
  };
}
