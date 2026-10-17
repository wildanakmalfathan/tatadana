-- ==============================================================================
-- TATADANA PRODUCTION DATABASE INITIAL SCHEMA MIGRATION
-- Project Owner: Wildan Akmal Fathan
-- Timezone Standard: Asia/Jakarta (WIB)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Timezone helper function (Asia/Jakarta)
CREATE OR REPLACE FUNCTION current_wib_timestamp()
RETURNS timestamptz AS $$
BEGIN
  RETURN timezone('Asia/Jakarta', now());
END;
$$ LANGUAGE plpgsql STABLE;

-- ==============================================================================
-- 2. CORE USER & ACCOUNT TABLES (PART 3 SPECIFICATION)
-- ==============================================================================

-- USERS TABLE (Linked with Supabase Auth users & Superadmin)
-- Fields: id, name, phone (unique), role (user/admin), plan (starter/pro), telegram_chat_id, created_at
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro')),
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

-- Backwards-compatibility view or synonym for profiles
CREATE OR REPLACE VIEW public.profiles AS
SELECT 
  id,
  name AS full_name,
  phone AS phone_number,
  (phone IS NOT NULL) AS phone_verified,
  telegram_chat_id,
  telegram_username,
  telegram_bot_token,
  telegram_connected,
  telegram_connected_at,
  plan,
  'IDR' AS currency,
  'Asia/Jakarta' AS timezone,
  monthly_tx_count,
  tx_count_reset_at,
  reminder_enabled,
  reminder_frequency,
  reminder_times,
  (role = 'admin') AS is_admin,
  created_at,
  updated_at
FROM public.users;

-- PHONE VERIFICATION / OTP CODES
CREATE TABLE IF NOT EXISTS public.phone_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON public.phone_verifications(phone_number, is_verified);

-- WALLETS
-- Fields: id, user_id, name, type, balance, is_default, created_at
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'bank' CHECK (type IN ('cash', 'bank', 'ewallet', 'other')),
  balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  icon TEXT DEFAULT '👛',
  color TEXT DEFAULT '#F97316',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);

-- CATEGORIES
-- Fields: id, user_id, name, emoji, type (income/expense), color, created_at
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🏷️',
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT NOT NULL DEFAULT '#F97316',
  budget_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

CREATE INDEX IF NOT EXISTS idx_categories_user ON public.categories(user_id, type);

-- TRANSACTIONS
-- Fields: id, user_id, wallet_id, category_id, amount, type, note, transaction_date, receipt_url, created_at
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
  destination_wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL, -- Transfer only
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  note TEXT,
  transaction_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jakarta')::date,
  receipt_url TEXT,
  source TEXT NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'telegram_text', 'telegram_photo', 'telegram_voice')),
  telegram_message_id BIGINT,
  raw_input TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON public.transactions(wallet_id);

-- BUDGETS TABLE
-- Fields: id, user_id, category_id, amount, month, year, created_at
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL CHECK (year >= 2020),
  alert_80_sent BOOLEAN NOT NULL DEFAULT false,
  alert_100_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
  UNIQUE (user_id, category_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON public.budgets(user_id, year, month);

-- TELEGRAM UPDATES TABLE (Idempotency)
-- Fields: id, update_id (unique, untuk idempotency), processed_at
CREATE TABLE IF NOT EXISTS public.telegram_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id BIGINT UNIQUE NOT NULL,
  chat_id BIGINT,
  message_id BIGINT,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'duplicate', 'error', 'skipped')),
  error_message TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

CREATE INDEX IF NOT EXISTS idx_telegram_updates_update_id ON public.telegram_updates(update_id);

-- ==============================================================================
-- 3. SUPPORTING PLATFORM & SAAS TABLES
-- ==============================================================================

-- TRANSACTION ITEMS (Multi-item breakdown for receipt OCR)
CREATE TABLE IF NOT EXISTS public.transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  price NUMERIC(15, 2) NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

CREATE INDEX IF NOT EXISTS idx_tx_items_transaction ON public.transaction_items(transaction_id);

-- EXPORT REPORTS HISTORY
CREATE TABLE IF NOT EXISTS public.reports_export_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'excel')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  signed_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

CREATE INDEX IF NOT EXISTS idx_reports_user ON public.reports_export_history(user_id, created_at DESC);

-- AI PROVIDERS CONFIGURATION (Admin managed)
CREATE TABLE IF NOT EXISTS public.ai_providers_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL UNIQUE CHECK (provider_name IN ('gemini', 'openai', 'deepseek', 'groq')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INT NOT NULL DEFAULT 1,
  api_key_encrypted TEXT NOT NULL,
  model_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

-- SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

INSERT INTO public.system_settings (key, value)
VALUES 
  ('ai_routing', '{"mode": "single", "primary_provider": "gemini"}'::JSONB),
  ('app_status', '{"maintenance": false, "version": "1.0.0"}'::JSONB)
ON CONFLICT (key) DO NOTHING;

-- AI CALL LOGS
CREATE TABLE IF NOT EXISTS public.ai_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  prompt_type TEXT NOT NULL CHECK (prompt_type IN ('text_parse', 'receipt_ocr', 'voice_stt', 'advisor', 'onboarding_category')),
  input_tokens INT DEFAULT 0,
  output_tokens INT DEFAULT 0,
  latency_ms INT DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'fallback')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta', now())
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_user ON public.ai_call_logs(user_id, created_at DESC);

-- ADMIN AUDIT LOGS
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

-- PAYMENT TRANSACTIONS (Midtrans & Manual)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('starter', 'pro')),
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
-- 4. DEFAULT SEED: SUPERADMIN WILDA AKMAL FATHAN
-- ==============================================================================
INSERT INTO public.users (
  id,
  name,
  phone,
  role,
  plan,
  telegram_chat_id,
  telegram_connected,
  created_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Wildan Akmal Fathan',
  '+6281234567890',
  'admin',
  'pro',
  123456789,
  true,
  timezone('Asia/Jakarta', now())
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = 'admin',
  plan = 'pro';

-- ==============================================================================
-- 5. AUTOMATED ONBOARDING & BUSINESS LOGIC TRIGGERS
-- ==============================================================================

-- A. USER ONBOARDING TRIGGER (Default Wallet & Initial Smart Categories)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_name TEXT;
  v_phone TEXT;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Sobat TataDana');
  v_phone := NEW.raw_user_meta_data->>'phone_number';

  -- Insert or sync into public.users
  INSERT INTO public.users (
    id,
    name,
    phone,
    role,
    plan,
    created_at
  ) VALUES (
    NEW.id,
    v_name,
    v_phone,
    CASE WHEN NEW.email = 'wildanakmal@tatadana.id' THEN 'admin' ELSE 'user' END,
    'starter',
    timezone('Asia/Jakarta', now())
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create Default Wallet "Dompet Utama (Cash)"
  INSERT INTO public.wallets (
    user_id,
    name,
    type,
    balance,
    is_default,
    icon,
    color
  ) VALUES (
    NEW.id,
    'Dompet Utama (Cash)',
    'cash',
    0,
    true,
    '💵',
    '#F97316'
  );

  -- Create Initial Standard Categories (Seed)
  INSERT INTO public.categories (user_id, name, type, emoji, color, budget_amount, is_system)
  VALUES 
    (NEW.id, 'Makanan & Minuman', 'expense', '🍜', '#F97316', 1500000, true),
    (NEW.id, 'Transportasi', 'expense', '🚗', '#FB923C', 500000, true),
    (NEW.id, 'Tagihan & Utilitas', 'expense', '🏠', '#EA580C', 750000, true),
    (NEW.id, 'Belanja Kebutuhan', 'expense', '👕', '#FDBA74', 500000, true),
    (NEW.id, 'Hiburan', 'expense', '🎮', '#C2410C', 300000, true),
    (NEW.id, 'Kesehatan', 'expense', '💊', '#EF4444', 250000, true),
    (NEW.id, 'Gaji Pokok', 'income', '💰', '#10B981', 0, true),
    (NEW.id, 'Freelance & Side Job', 'income', '💻', '#059669', 0, true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- B. ENFORCE STARTER LIMIT (50 Transaksi/Bulan)
CREATE OR REPLACE FUNCTION public.check_plan_transaction_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_plan TEXT;
  v_count INT;
  v_reset TIMESTAMPTZ;
  v_now TIMESTAMPTZ := timezone('Asia/Jakarta', now());
BEGIN
  SELECT plan, monthly_tx_count, tx_count_reset_at
  INTO v_plan, v_count, v_reset
  FROM public.users
  WHERE id = NEW.user_id;

  -- Reset monthly counter if passed reset date
  IF v_reset IS NULL OR v_now >= v_reset THEN
    v_count := 0;
    UPDATE public.users
    SET monthly_tx_count = 0,
        tx_count_reset_at = date_trunc('month', v_now) + interval '1 month'
    WHERE id = NEW.user_id;
  END IF;

  -- Strict limit enforcement for Starter
  IF v_plan = 'starter' AND v_count >= 50 THEN
    RAISE EXCEPTION 'Batas 50 transaksi bulanan paket Starter sudah tercapai. Silakan upgrade ke Pro untuk transaksi tanpa batas.';
  END IF;

  -- Increment count
  UPDATE public.users
  SET monthly_tx_count = monthly_tx_count + 1,
      updated_at = v_now
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_tx_limit ON public.transactions;
CREATE TRIGGER trg_check_tx_limit
  BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.check_plan_transaction_limit();

-- C. AUTOMATIC WALLET BALANCE SYNCHRONIZATION
CREATE OR REPLACE FUNCTION public.sync_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.type = 'expense' THEN
      UPDATE public.wallets SET balance = balance - NEW.amount, updated_at = timezone('Asia/Jakarta', now()) WHERE id = NEW.wallet_id;
    ELSIF NEW.type = 'income' THEN
      UPDATE public.wallets SET balance = balance + NEW.amount, updated_at = timezone('Asia/Jakarta', now()) WHERE id = NEW.wallet_id;
    ELSIF NEW.type = 'transfer' THEN
      UPDATE public.wallets SET balance = balance - NEW.amount, updated_at = timezone('Asia/Jakarta', now()) WHERE id = NEW.wallet_id;
      IF NEW.destination_wallet_id IS NOT NULL THEN
        UPDATE public.wallets SET balance = balance + NEW.amount, updated_at = timezone('Asia/Jakarta', now()) WHERE id = NEW.destination_wallet_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.type = 'expense' THEN
      UPDATE public.wallets SET balance = balance + OLD.amount, updated_at = timezone('Asia/Jakarta', now()) WHERE id = OLD.wallet_id;
    ELSIF OLD.type = 'income' THEN
      UPDATE public.wallets SET balance = balance - OLD.amount, updated_at = timezone('Asia/Jakarta', now()) WHERE id = OLD.wallet_id;
    ELSIF OLD.type = 'transfer' THEN
      UPDATE public.wallets SET balance = balance + OLD.amount, updated_at = timezone('Asia/Jakarta', now()) WHERE id = OLD.wallet_id;
      IF OLD.destination_wallet_id IS NOT NULL THEN
        UPDATE public.wallets SET balance = balance - OLD.amount, updated_at = timezone('Asia/Jakarta', now()) WHERE id = OLD.destination_wallet_id;
      END IF;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Rollback OLD
    IF OLD.type = 'expense' THEN
      UPDATE public.wallets SET balance = balance + OLD.amount WHERE id = OLD.wallet_id;
    ELSIF OLD.type = 'income' THEN
      UPDATE public.wallets SET balance = balance - OLD.amount WHERE id = OLD.wallet_id;
    ELSIF OLD.type = 'transfer' THEN
      UPDATE public.wallets SET balance = balance + OLD.amount WHERE id = OLD.wallet_id;
      IF OLD.destination_wallet_id IS NOT NULL THEN
        UPDATE public.wallets SET balance = balance - OLD.amount WHERE id = OLD.destination_wallet_id;
      END IF;
    END IF;
    -- Apply NEW
    IF NEW.type = 'expense' THEN
      UPDATE public.wallets SET balance = balance - NEW.amount, updated_at = timezone('Asia/Jakarta', now()) WHERE id = NEW.wallet_id;
    ELSIF NEW.type = 'income' THEN
      UPDATE public.wallets SET balance = balance + NEW.amount, updated_at = timezone('Asia/Jakarta', now()) WHERE id = NEW.wallet_id;
    ELSIF NEW.type = 'transfer' THEN
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

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES ON ALL USER TABLES
-- ==============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports_export_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_providers_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current authenticated user is admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- USERS TABLE POLICIES
CREATE POLICY "Users can view own data" ON public.users FOR SELECT USING (auth.uid() = id OR public.is_current_user_admin());
CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (auth.uid() = id OR public.is_current_user_admin());
CREATE POLICY "Admins full manage users" ON public.users FOR ALL USING (public.is_current_user_admin());

-- WALLETS POLICIES
CREATE POLICY "Users can manage own wallets" ON public.wallets FOR ALL USING (auth.uid() = user_id OR public.is_current_user_admin());

-- CATEGORIES POLICIES
CREATE POLICY "Users can manage own categories" ON public.categories FOR ALL USING (auth.uid() = user_id OR public.is_current_user_admin());

-- TRANSACTIONS POLICIES
CREATE POLICY "Users can manage own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id OR public.is_current_user_admin());

-- BUDGETS POLICIES
CREATE POLICY "Users can manage own budgets" ON public.budgets FOR ALL USING (auth.uid() = user_id OR public.is_current_user_admin());

-- TELEGRAM UPDATES POLICIES
CREATE POLICY "System can record updates" ON public.telegram_updates FOR ALL USING (true);

-- TRANSACTION ITEMS POLICIES
CREATE POLICY "Users can manage own transaction items" ON public.transaction_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.transactions WHERE transactions.id = transaction_items.transaction_id AND (transactions.user_id = auth.uid() OR public.is_current_user_admin()))
);

-- EXPORT HISTORY POLICIES
CREATE POLICY "Users can view own export history" ON public.reports_export_history FOR ALL USING (auth.uid() = user_id OR public.is_current_user_admin());

-- PAYMENTS POLICIES
CREATE POLICY "Users can view own payments" ON public.payment_transactions FOR SELECT USING (auth.uid() = user_id OR public.is_current_user_admin());
CREATE POLICY "Users can insert own payments" ON public.payment_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update payments" ON public.payment_transactions FOR UPDATE USING (public.is_current_user_admin());

-- ADMIN ONLY TABLES
CREATE POLICY "Admin view ai configs" ON public.ai_providers_config FOR ALL USING (public.is_current_user_admin());
CREATE POLICY "Admin view system settings" ON public.system_settings FOR ALL USING (public.is_current_user_admin());
CREATE POLICY "Admin view ai logs" ON public.ai_call_logs FOR ALL USING (public.is_current_user_admin());
CREATE POLICY "Admin view audit logs" ON public.audit_logs FOR ALL USING (public.is_current_user_admin());

-- ==============================================================================
-- 7. SUPABASE STORAGE BUCKET CONFIGURATION
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('tatadana-exports', 'tatadana-exports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can access own export files in bucket" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'tatadana-exports' 
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_current_user_admin())
);
