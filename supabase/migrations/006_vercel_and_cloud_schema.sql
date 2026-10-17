-- ==============================================================================
-- TATADANA PRODUCTION MIGRATION 006: Vercel Cloud & Supabase Full Compatibility
-- Adds avatar fields to users, ensures text-compatible IDs for wallets/categories,
-- and configures storage buckets for avatars & exports.
-- ==============================================================================

-- 1. USERS TABLE ENHANCEMENTS
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS avatar_type TEXT DEFAULT 'emoji' CHECK (avatar_type IN ('uploaded', 'emoji'));

-- Update backward compatibility view
CREATE OR REPLACE VIEW public.profiles AS
SELECT 
  id,
  name AS full_name,
  email,
  phone AS phone_number,
  (phone IS NOT NULL) AS phone_verified,
  telegram_chat_id,
  telegram_username,
  telegram_bot_token,
  telegram_connected,
  telegram_connected_at,
  avatar_url,
  avatar_type,
  plan,
  status,
  'IDR' AS currency,
  'Asia/Jakarta' AS timezone,
  monthly_tx_count,
  tx_count_reset_at,
  reminder_enabled,
  reminder_frequency,
  reminder_times,
  last_seen_at,
  (role = 'admin') AS is_admin,
  created_at,
  updated_at
FROM public.users;

-- 2. RELAX UUID CONSTRAINTS TO TEXT WHERE SYSTEM IDS ARE PRE-SEEDED
-- Allows seeded IDs like 'w-admin-bca' and 'cat-makan' seamlessly
DO $$
BEGIN
  -- Wallets id to TEXT if currently UUID
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'wallets' AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_wallet_id_fkey;
    ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_destination_wallet_id_fkey;
    ALTER TABLE public.wallets ALTER COLUMN id TYPE TEXT USING id::text;
    ALTER TABLE public.transactions ALTER COLUMN wallet_id TYPE TEXT USING wallet_id::text;
    ALTER TABLE public.transactions ALTER COLUMN destination_wallet_id TYPE TEXT USING destination_wallet_id::text;
  END IF;

  -- Categories id to TEXT if currently UUID
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_category_id_fkey;
    ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_category_id_fkey;
    ALTER TABLE public.categories ALTER COLUMN id TYPE TEXT USING id::text;
    ALTER TABLE public.transactions ALTER COLUMN category_id TYPE TEXT USING category_id::text;
    ALTER TABLE public.budgets ALTER COLUMN category_id TYPE TEXT USING category_id::text;
  END IF;
END $$;

-- 3. STORAGE BUCKETS (avatars & tatadana-exports)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('tatadana-exports', 'tatadana-exports', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for avatars
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public Access for Avatars' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Public Access for Avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Service Role Insert for Avatars' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Service Role Insert for Avatars"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'avatars');
  END IF;
END $$;
