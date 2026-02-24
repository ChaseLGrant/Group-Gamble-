-- ============================================================
-- Demo Seed Script
-- Run AFTER creating 3 users in Supabase Auth dashboard and
-- noting their UUIDs. Replace the placeholder UUIDs below.
-- ============================================================

-- Replace these with real auth.users UUIDs from your Supabase project:
DO $$
DECLARE
  user1_id UUID := '00000000-0000-0000-0000-000000000001'; -- alice@example.com
  user2_id UUID := '00000000-0000-0000-0000-000000000002'; -- bob@example.com
  user3_id UUID := '00000000-0000-0000-0000-000000000003'; -- carol@example.com
  demo_group_id UUID := uuid_generate_v4();
  pred1_id UUID := uuid_generate_v4();
  pred2_id UUID := uuid_generate_v4();
BEGIN

  -- Profiles (normally auto-created via trigger, but for seeding):
  INSERT INTO profiles (id, display_name) VALUES
    (user1_id, 'Alice'),
    (user2_id, 'Bob'),
    (user3_id, 'Carol')
  ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

  -- Create demo group
  INSERT INTO groups (id, name, emoji, owner_id, invite_code)
  VALUES (demo_group_id, 'Friday Night Out', '🍺', user1_id, 'DEMO1234');

  -- Add members
  INSERT INTO group_members (group_id, user_id, role) VALUES
    (demo_group_id, user1_id, 'owner'),
    (demo_group_id, user2_id, 'member'),
    (demo_group_id, user3_id, 'member');

  -- Initial balances
  INSERT INTO group_balances (group_id, user_id, balance_points) VALUES
    (demo_group_id, user1_id, 1000),
    (demo_group_id, user2_id, 1000),
    (demo_group_id, user3_id, 1000);

  -- Prediction 1: Over/Under beers
  INSERT INTO predictions (id, group_id, created_by, title, type, line, unit, status)
  VALUES (pred1_id, demo_group_id, user1_id,
          'Total beers consumed tonight', 'OVER_UNDER', 7.5, 'beers', 'OPEN');

  -- Prediction 2: Yes/No
  INSERT INTO predictions (id, group_id, created_by, title, subject, type, status)
  VALUES (pred2_id, demo_group_id, user2_id,
          'Will Bob talk to the bartender?', 'Bob', 'YES_NO', 'OPEN');

  RAISE NOTICE 'Demo group created: %', demo_group_id;
  RAISE NOTICE 'Invite code: DEMO1234';
END $$;
