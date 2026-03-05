-- ============================================================
-- Fix: "Database error saving new user"
--
-- The handle_new_user() trigger was failing because:
-- 1. Missing SET search_path = public on SECURITY DEFINER function
-- 2. Missing schema-qualified table reference (public.profiles)
-- 3. No fallback when all COALESCE branches return NULL
-- 4. No EXCEPTION handler, so trigger errors blocked user creation
--
-- Run this in your Supabase SQL Editor to fix existing deployments.
-- ============================================================

-- Fix handle_new_user trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1),
      'User'
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Also fix other SECURITY DEFINER functions for consistency
CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id  = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_group_admin(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id  = auth.uid()
      AND role IN ('owner', 'moderator')
  );
$$;

CREATE OR REPLACE FUNCTION update_balance(
  p_group_id UUID,
  p_user_id  UUID,
  p_delta    INT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current INT;
BEGIN
  SELECT balance_points INTO v_current
    FROM public.group_balances
   WHERE group_id = p_group_id
     AND user_id  = p_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'balance_not_found';
  END IF;

  IF v_current + p_delta < 0 THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  UPDATE public.group_balances
     SET balance_points = v_current + p_delta,
         updated_at     = NOW()
   WHERE group_id = p_group_id
     AND user_id  = p_user_id;
END;
$$;
