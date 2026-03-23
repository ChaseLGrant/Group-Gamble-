-- Add phone column to profiles for phone-number-based group invites
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Index for looking up users by phone number
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone) WHERE phone IS NOT NULL;
