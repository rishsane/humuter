-- Telegram onboarding sessions for the master bot
-- Tracks user progress through the DM-based agent deployment flow

create table if not exists tg_onboarding_sessions (
  id uuid primary key default gen_random_uuid(),
  tg_user_id bigint not null,
  tg_username text,
  step text not null default 'welcome',
  agent_type text,
  plan text,
  billing_cycle text default 'monthly',
  email text,
  email_otp text,
  email_verified boolean default false,
  supabase_user_id uuid,
  training_data jsonb default '{}',
  current_question_index int default 0,
  skill_file_content text,
  bot_token text,
  payment_address text,
  payment_amount numeric,
  payment_tx_hash text,
  payment_verified boolean default false,
  agent_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(tg_user_id)
);

-- Index for fast lookups by TG user ID
create index if not exists idx_tg_onboarding_tg_user_id on tg_onboarding_sessions(tg_user_id);

-- Enable RLS
alter table tg_onboarding_sessions enable row level security;

-- Service role only — no browser/anon access needed
-- The webhook handler uses the service client which bypasses RLS
