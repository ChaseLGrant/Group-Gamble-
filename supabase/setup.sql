-- ============================================================
-- Group Gamble — Complete Database Setup
-- ============================================================
--
-- HOW TO USE (Supabase Dashboard):
--
--   1. Go to https://supabase.com/dashboard and open your project
--   2. Click "SQL Editor" in the left sidebar
--   3. Click "+ New query"
--   4. Paste this ENTIRE file into the editor
--   5. Click "Run" (or Cmd/Ctrl + Enter)
--   6. You should see "Success. No rows returned" — that means it worked!
--
-- WHAT THIS CREATES:
--
--   Tables:     profiles, groups, group_members, group_balances,
--               predictions, wagers, transactions
--   Functions:  is_group_member, is_group_admin, update_balance,
--               handle_new_user (trigger)
--   Security:   Row Level Security (RLS) policies on every table
--   Realtime:   CDC enabled on predictions, wagers, group_balances,
--               group_members
--   Indexes:    Performance indexes on foreign keys and common queries
--
-- AFTER RUNNING THIS:
--
--   • Your app will work — sign in, create groups, make predictions!
--   • Each new user automatically gets a profile (via the trigger)
--   • Each group member starts with 1,000 play-money points
--
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles: one per auth.users row
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Groups
CREATE TABLE IF NOT EXISTS groups (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  emoji       TEXT NOT NULL DEFAULT '🎲',
  owner_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  invite_code TEXT NOT NULL UNIQUE DEFAULT upper(encode(gen_random_bytes(4), 'hex')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Group membership
CREATE TABLE IF NOT EXISTS group_members (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id  UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'member'
              CHECK (role IN ('owner', 'member', 'moderator')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

-- Per-group point balances (each member starts with 1000 points)
CREATE TABLE IF NOT EXISTS group_balances (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id       UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance_points INT NOT NULL DEFAULT 1000 CHECK (balance_points >= 0),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

-- Predictions (markets)
CREATE TABLE IF NOT EXISTS predictions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id     UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by   UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  title        TEXT NOT NULL,
  description  TEXT,
  type         TEXT NOT NULL CHECK (type IN ('YES_NO', 'OVER_UNDER')),
  line         NUMERIC,                        -- only for OVER_UNDER
  unit         TEXT,                           -- e.g. "beers", "minutes"
  subject      TEXT,                           -- person being bet on
  status       TEXT NOT NULL DEFAULT 'OPEN'
                 CHECK (status IN ('OPEN', 'LOCKED', 'SETTLED', 'CANCELED')),
  close_time   TIMESTAMPTZ,                    -- auto-lock after this time
  settled_at   TIMESTAMPTZ,
  outcome      TEXT,                           -- YES/NO/OVER/UNDER/PUSH
  outcome_value NUMERIC,                       -- actual numeric result (optional)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Wagers / picks
CREATE TABLE IF NOT EXISTS wagers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  group_id      UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pick          TEXT NOT NULL CHECK (pick IN ('YES', 'NO', 'OVER', 'UNDER')),
  amount_points INT NOT NULL CHECK (amount_points > 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (prediction_id, user_id)
);

-- Transaction ledger (audit trail)
CREATE TABLE IF NOT EXISTS transactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id      UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prediction_id UUID REFERENCES predictions(id) ON DELETE SET NULL,
  type          TEXT NOT NULL CHECK (type IN ('DEBIT', 'CREDIT', 'REFUND', 'PAYOUT')),
  amount_points INT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meta          JSONB NOT NULL DEFAULT '{}'
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_group_members_group_id   ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id    ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_balances_group_id  ON group_balances(group_id);
CREATE INDEX IF NOT EXISTS idx_group_balances_user_id   ON group_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_group_id     ON predictions(group_id);
CREATE INDEX IF NOT EXISTS idx_predictions_status       ON predictions(status);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at   ON predictions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wagers_prediction_id     ON wagers(prediction_id);
CREATE INDEX IF NOT EXISTS idx_wagers_user_id           ON wagers(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_group_id    ON transactions(group_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id     ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_prediction_id ON transactions(prediction_id);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Check if the current user is a member of a group
CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id
      AND user_id  = auth.uid()
  );
$$;

-- Check if the current user is an owner or moderator of a group
CREATE OR REPLACE FUNCTION is_group_admin(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id
      AND user_id  = auth.uid()
      AND role IN ('owner', 'moderator')
  );
$$;

-- Atomically add (or subtract) points from a group balance.
-- Raises an exception if the result would be negative.
CREATE OR REPLACE FUNCTION update_balance(
  p_group_id UUID,
  p_user_id  UUID,
  p_delta    INT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_current INT;
BEGIN
  SELECT balance_points INTO v_current
    FROM group_balances
   WHERE group_id = p_group_id
     AND user_id  = p_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'balance_not_found';
  END IF;

  IF v_current + p_delta < 0 THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  UPDATE group_balances
     SET balance_points = v_current + p_delta,
         updated_at     = NOW()
   WHERE group_id = p_group_id
     AND user_id  = p_user_id;
END;
$$;

-- Auto-create a profile row when a new auth user is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger (drop first to make this script re-runnable)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups          ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_balances  ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE wagers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions    ENABLE ROW LEVEL SECURITY;

-- ---------- profiles ----------

-- Drop existing policies to make re-runs safe
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

CREATE POLICY "profiles_select"
  ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1
        FROM group_members gm1
        JOIN group_members gm2 ON gm1.group_id = gm2.group_id
       WHERE gm1.user_id = auth.uid()
         AND gm2.user_id = profiles.id
    )
  );

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- ---------- groups ----------

DROP POLICY IF EXISTS "groups_select_members" ON groups;
DROP POLICY IF EXISTS "groups_update_owner" ON groups;

CREATE POLICY "groups_select_members"
  ON groups FOR SELECT
  USING (is_group_member(id));

CREATE POLICY "groups_update_owner"
  ON groups FOR UPDATE
  USING (owner_id = auth.uid());

-- ---------- group_members ----------

DROP POLICY IF EXISTS "group_members_select" ON group_members;
DROP POLICY IF EXISTS "group_members_delete_admin" ON group_members;

CREATE POLICY "group_members_select"
  ON group_members FOR SELECT
  USING (is_group_member(group_id));

CREATE POLICY "group_members_delete_admin"
  ON group_members FOR DELETE
  USING (is_group_admin(group_id) AND user_id != auth.uid());

-- ---------- group_balances ----------

DROP POLICY IF EXISTS "group_balances_select" ON group_balances;

CREATE POLICY "group_balances_select"
  ON group_balances FOR SELECT
  USING (user_id = auth.uid() OR is_group_admin(group_id) OR is_group_member(group_id));

-- ---------- predictions ----------

DROP POLICY IF EXISTS "predictions_select" ON predictions;
DROP POLICY IF EXISTS "predictions_insert" ON predictions;
DROP POLICY IF EXISTS "predictions_update_admin" ON predictions;

CREATE POLICY "predictions_select"
  ON predictions FOR SELECT
  USING (is_group_member(group_id));

CREATE POLICY "predictions_insert"
  ON predictions FOR INSERT
  WITH CHECK (is_group_member(group_id) AND created_by = auth.uid());

CREATE POLICY "predictions_update_admin"
  ON predictions FOR UPDATE
  USING (is_group_admin(group_id));

-- ---------- wagers ----------

DROP POLICY IF EXISTS "wagers_select" ON wagers;
DROP POLICY IF EXISTS "wagers_insert_own" ON wagers;
DROP POLICY IF EXISTS "wagers_update_own" ON wagers;

CREATE POLICY "wagers_select"
  ON wagers FOR SELECT
  USING (is_group_member(group_id));

CREATE POLICY "wagers_insert_own"
  ON wagers FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_group_member(group_id));

CREATE POLICY "wagers_update_own"
  ON wagers FOR UPDATE
  USING (user_id = auth.uid());

-- ---------- transactions ----------

DROP POLICY IF EXISTS "transactions_select" ON transactions;

CREATE POLICY "transactions_select"
  ON transactions FOR SELECT
  USING (user_id = auth.uid() OR is_group_admin(group_id));

-- ============================================================
-- REALTIME
-- ============================================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE predictions;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE wagers;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE group_balances;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE group_members;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- ============================================================
-- ✅ DONE! Your database is ready.
--
-- Next steps:
--   1. Go to Authentication → URL Configuration and set:
--        Site URL:       http://localhost:3000
--        Redirect URLs:  http://localhost:3000/auth/callback
--   2. Set your environment variables (see .env.local.example)
--   3. Run: npm run dev
--   4. Sign in and create your first group!
-- ============================================================
