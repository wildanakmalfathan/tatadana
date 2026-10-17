export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface User {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  password_hash?: string | null
  role: 'user' | 'admin'
  plan: 'starter' | 'pro' | 'pro_lifetime'
  status?: 'pending_approval' | 'active' | 'rejected' | 'suspended'
  telegram_chat_id?: number | null
  telegram_username?: string | null
  telegram_bot_token?: string | null
  telegram_connected?: boolean
  telegram_connected_at?: string | null
  monthly_tx_count?: number
  tx_count_reset_at?: string | null
  reminder_enabled?: boolean
  reminder_frequency?: number
  reminder_times?: string[]
  last_seen_at?: string | null
  created_at: string
  updated_at?: string
}

export interface Profile {
  id: string
  full_name: string
  email?: string | null
  avatar_url?: string | null
  phone_number?: string | null
  phone_verified: boolean
  telegram_chat_id?: number | null
  telegram_username?: string | null
  telegram_bot_token?: string | null
  telegram_connected: boolean
  telegram_connected_at?: string | null
  plan: 'starter' | 'pro' | 'pro_lifetime'
  status?: 'pending_approval' | 'active' | 'rejected' | 'suspended'
  plan_expires_at?: string | null
  currency: string
  timezone: string
  monthly_tx_count: number
  tx_count_reset_at?: string | null
  reminder_enabled: boolean
  reminder_frequency: number
  reminder_times: string[]
  is_admin: boolean
  last_seen_at?: string | null
  created_at: string
  updated_at: string
}

export interface Wallet {
  id: string
  user_id: string
  name: string
  type: 'cash' | 'bank' | 'ewallet' | 'other'
  balance: number
  is_default: boolean
  is_default_telegram?: boolean
  account_number?: string | null
  icon: string
  color: string
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  type: 'expense' | 'income'
  emoji: string
  color: string
  budget_amount: number
  is_system: boolean
  created_at: string
  updated_at: string
}

export interface Budget {
  id: string
  user_id: string
  category_id: string
  amount: number
  month: number
  year: number
  period?: 'daily' | 'weekly' | 'monthly'
  alert_80_sent?: boolean
  alert_100_sent?: boolean
  created_at: string
  updated_at?: string
  category?: Category | null
  spent?: number
  percentage?: number
  status?: 'safe' | 'warning' | 'overbudget'
}

export interface Transaction {
  id: string
  user_id: string
  wallet_id?: string | null
  destination_wallet_id?: string | null
  category_id?: string | null
  type: 'income' | 'expense' | 'transfer'
  amount: number
  date: string
  time: string
  notes?: string | null
  source: 'web' | 'telegram_text' | 'telegram_photo' | 'telegram_voice' | 'tata_ai'
  idempotency_key?: string | null
  telegram_message_id?: number | null
  raw_input?: string | null
  receipt_image_url?: string | null
  is_multi_item: boolean
  created_at: string
  updated_at?: string
  wallet?: Wallet | null
  destination_wallet?: Wallet | null
  category?: Category | null
  items?: TransactionItem[]
}

export interface TransactionItem {
  id: string
  transaction_id: string
  item_name: string
  quantity: number
  price: number
  category_id?: string | null
  category?: Category | null
  created_at: string
}

export interface TelegramUpdate {
  update_id: number
  chat_id?: number | null
  message_id?: number | null
  user_id?: string | null
  payload?: Json | null
  status: 'success' | 'duplicate' | 'error' | 'skipped'
  error_message?: string | null
  processed_at: string
}

export interface ReportExportHistory {
  id: string
  user_id: string
  file_name: string
  file_type: 'pdf' | 'excel'
  period_start: string
  period_end: string
  file_path: string
  file_size_bytes?: number | null
  signed_url?: string | null
  created_at: string
}

export interface AIProviderConfig {
  id: string
  provider_name: 'gemini' | 'openai' | 'deepseek' | 'groq'
  is_active: boolean
  priority: number
  api_key_encrypted: string
  model_name: string
  created_at: string
  updated_at: string
}

export interface SystemSetting {
  key: string
  value: Json
  updated_at: string
}

export interface AICallLog {
  id: string
  user_id?: string | null
  provider: string
  prompt_type: 'text_parse' | 'receipt_ocr' | 'voice_stt' | 'advisor' | 'onboarding_category'
  input_tokens: number
  output_tokens: number
  latency_ms: number
  status: 'success' | 'error' | 'fallback'
  error_message?: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  admin_id: string
  action: string
  target_user_id?: string | null
  reason?: string | null
  metadata?: Json | null
  created_at: string
}

export interface PaymentTransaction {
  id: string
  user_id: string
  order_id: string
  plan: 'starter' | 'pro'
  amount: number
  status: 'pending' | 'approved' | 'rejected' | 'settlement' | 'expire' | 'cancel'
  payment_method: 'midtrans' | 'manual_transfer'
  proof_image_url?: string | null
  approved_by?: string | null
  approved_at?: string | null
  midtrans_response?: Json | null
  created_at: string
  updated_at: string
  user?: Profile
}
