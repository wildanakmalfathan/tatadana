-- ==============================================================================
-- TATADANA PRODUCTION DATABASE MASTER SCHEMA MIGRATION (005_master_schema.sql)
-- Single Source of Truth Ledger, Dual Login Auth, Persistent Multi-Wallet & Budgets
-- Project Owner: Wildan Akmal Fathan (wildanakmalfathan@gmail.com, +6281460932853)
-- Timezone Standard: Asia/Jakarta (WIB)
-- ==============================================================================

-- 1. EXTENSIONS & TIMEZONE HELPER
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION current_wib_timestamp()
RETURNS timestamptz AS $$
BEGIN
  RETURN timezone('Asia/Jakarta', now());
END;
$$ LANGUAGE plpgsql STABLE;

-- ==============================================================================
-- 2. USERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'pro_lifetime')),
  status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'active', 'rejected', 'suspended')),
  telegram_chat_id BIGINT UNIQUE,
  telegram_username TEXT,
  telegram_bot_token TEXT,
  telegram_connected BOOLEAN NOT NULL DEFAULT false,
  telegram_connected_at TIMESTAMPTZ,
  monthly_tx_count INT NOT NULL DEFAULT 0,
  tx_count_reset_at TIMESTAMPTZ DEFAULT date_trunc('month', now() AT TIME ZONE 'Asia/Jakarta') + interval '1 month',
  reminder_enabled BOOLEAN NOT NULL DEFAULT false,
  reminder_frequency INT NOT NULL DEFAULT 1 CHECK (reminder_frequency BETWEEN 1 AND 2),
  reminder_times TEXT[] NOT NULL DEFAULT ARRAY['20:00']::TEXT[],
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON public.users(last_seen_at DESC);

-- Backward compatibility view for profiles
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

-- ==============================================================================
-- 3. WALLETS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'bank' CHECK (type IN ('cash', 'bank', 'ewallet', 'other')),
  balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
  account_number TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_default_telegram BOOLEAN NOT NULL DEFAULT false,
  icon TEXT DEFAULT '👛',
  color TEXT DEFAULT '#10B981',
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_default_tg ON public.wallets(user_id, is_default_telegram);

-- ==============================================================================
-- 4. CATEGORIES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🏷️',
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT NOT NULL DEFAULT '#10B981',
  budget_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

CREATE INDEX IF NOT EXISTS idx_categories_user ON public.categories(user_id, type);

-- ==============================================================================
-- 5. TRANSACTIONS TABLE (Single Source of Truth Ledger)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
  destination_wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jakarta')::date,
  time TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'HH24:MI'),
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'telegram_text', 'telegram_photo', 'telegram_voice', 'tata_ai')),
  idempotency_key TEXT UNIQUE,
  telegram_message_id BIGINT,
  raw_input TEXT,
  receipt_image_url TEXT,
  is_multi_item BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date DESC, time DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON public.transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_idempotency ON public.transactions(user_id, idempotency_key);

-- ==============================================================================
-- 6. MULTI-PERIOD BUDGETS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('daily', 'weekly', 'monthly')),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL CHECK (year >= 2020),
  alert_80_sent BOOLEAN NOT NULL DEFAULT false,
  alert_100_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
  UNIQUE (user_id, category_id, period, month, year)
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON public.budgets(user_id, period, year, month);

-- ==============================================================================
-- 7. AUDIT LOGS & PAYMENTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.users(id),
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES public.users(id),
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('starter', 'pro', 'pro_lifetime')),
  amount NUMERIC(15, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'settlement', 'expire', 'cancel')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('midtrans', 'manual_transfer')),
  proof_image_url TEXT,
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  midtrans_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

CREATE INDEX IF NOT EXISTS idx_payment_user ON public.payment_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_status ON public.payment_transactions(status);

-- ==============================================================================
-- 8. PRE-SEEDED OFFICIAL ADMIN: Wildan Akmal Fathan
-- ==============================================================================
INSERT INTO public.users (
  id,
  name,
  email,
  phone,
  password_hash,
  role,
  plan,
  status,
  telegram_chat_id,
  telegram_username,
  telegram_connected,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Wildan Akmal Fathan',
  'wildanakmalfathan@gmail.com',
  '+6281460932853',
  'scrypt:ba52e79ad4bcb0937fe5da10bf0ce6f9:17bb116b9ed58c592cbb69033392e32157d3ddae4bfa12c694f7700edbe8533b5d64fec917492057e05e660916f1792f2e08a1015ef1171d07f49357a77091d4',
  'admin',
  'pro_lifetime',
  'active',
  123456789,
  'wildanakmal',
  true,
  timezone('Asia/Jakarta', now()),
  timezone('Asia/Jakarta', now())
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  password_hash = EXCLUDED.password_hash,
  role = 'admin',
  plan = 'pro_lifetime',
  status = 'active',
  updated_at = timezone('Asia/Jakarta', now());

-- Pre-seed default admin wallets
INSERT INTO public.wallets (id, user_id, name, type, balance, account_number, is_default, is_default_telegram, icon, color)
VALUES
  ('w-admin-bca', '00000000-0000-0000-0000-000000000001', 'BCA Utama', 'bank', 15000000, '8214609328', true, true, '🏦', '#0066AE'),
  ('w-admin-cash', '00000000-0000-0000-0000-000000000001', 'Cash Dompet', 'cash', 750000, NULL, false, false, '💵', '#10B981'),
  ('w-admin-ewallet', '00000000-0000-0000-0000-000000000001', 'GoPay / OVO', 'ewallet', 1250000, NULL, false, false, '📱', '#00AED6')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 9. TRIGGERS: AUTOMATIC WALLET BALANCE SYNC & PLAN TRANSACTION LIMITS
-- ==============================================================================

-- A. PLAN TRANSACTION LIMIT ENFORCEMENT
CREATE OR REPLACE FUNCTION public.check_plan_transaction_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_plan TEXT;
  v_count INT;
BEGIN
  SELECT plan, monthly_tx_count INTO v_plan, v_count
  FROM public.users
  WHERE id = NEW.user_id;

  IF v_plan = 'starter' AND v_count >= 50 THEN
    RAISE EXCEPTION 'Batas transaksi bulanan paket Starter (50 transaksi) sudah tercapai. Silakan upgrade ke Pro untuk transaksi tanpa batas.';
  END IF;

  UPDATE public.users
  SET monthly_tx_count = monthly_tx_count + 1,
      updated_at = timezone('Asia/Jakarta', now())
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_tx_limit ON public.transactions;
CREATE TRIGGER trg_check_tx_limit
  BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.check_plan_transaction_limit();

-- B. AUTOMATIC WALLET BALANCE SYNCHRONIZATION
CREATE OR REPLACE FUNCTION public.sync_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.type = 'expense' AND NEW.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance - NEW.amount, updated_at = timezone('Asia/Jakarta', now()) WHERE id = NEW.wallet_id;
    ELSIF NEW.type = 'income' AND NEW.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance + NEW.amount, updated_at = timezone('Asia/Jakarta', now()) WHERE id = NEW.wallet_id;
    ELSIF NEW.type = 'transfer' AND NEW.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance - NEW.amount, updated_at = timezone('Asia/Jakarta', now()) WHERE id = NEW.wallet_id;
      IF NEW.destination_wallet_id IS NOT NULL THEN
        UPDATE public.wallets SET balance = balance + NEW.amount, updated_at = timezone('Asia/Jakarta', now()) WHERE id = NEW.destination_wallet_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.type = 'expense' AND OLD.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance + OLD.amount, updated_at = timezone('Asia/Jakarta', now()) WHERE id = OLD.wallet_id;
    ELSIF OLD.type = 'income' AND OLD.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance - OLD.amount, updated_at = timezone('Asia/Jakarta', now()) WHERE id = OLD.wallet_id;
    ELSIF OLD.type = 'transfer' AND OLD.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance + OLD.amount, updated_at = timezone('Asia/Jakarta', now()) WHERE id = OLD.wallet_id;
      IF OLD.destination_wallet_id IS NOT NULL THEN
        UPDATE public.wallets SET balance = balance - OLD.amount, updated_at = timezone('Asia/Jakarta', now()) WHERE id = OLD.destination_wallet_id;
      END IF;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Rollback OLD
    IF OLD.type = 'expense' AND OLD.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance + OLD.amount WHERE id = OLD.wallet_id;
    ELSIF OLD.type = 'income' AND OLD.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance - OLD.amount WHERE id = OLD.wallet_id;
    ELSIF OLD.type = 'transfer' AND OLD.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance + OLD.amount WHERE id = OLD.wallet_id;
      IF OLD.destination_wallet_id IS NOT NULL THEN
        UPDATE public.wallets SET balance = balance - OLD.amount WHERE id = OLD.destination_wallet_id;
      END IF;
    END IF;
    -- Apply NEW
    IF NEW.type = 'expense' AND NEW.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance - NEW.amount, updated_at = timezone('Asia/Jakarta', now()) WHERE id = NEW.wallet_id;
    ELSIF NEW.type = 'income' AND NEW.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance + NEW.amount, updated_at = timezone('Asia/Jakarta', now()) WHERE id = NEW.wallet_id;
    ELSIF NEW.type = 'transfer' AND NEW.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance - NEW.amount, updated_at = timezone('Asia/Jakarta', now()) WHERE id = NEW.wallet_id;
      IF NEW.destination_wallet_id IS NOT NULL THEN
        UPDATE public.wallets SET balance = balance + NEW.amount, updated_at = timezone('Asia/Jakarta', now()) WHERE id = NEW.destination_wallet_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_wallet_balance ON public.transactions;
CREATE TRIGGER trg_sync_wallet_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_wallet_balance();
