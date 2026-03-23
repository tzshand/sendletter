-- sendletter API Access Migration
-- Run this in Supabase SQL Editor AFTER the initial schema.sql
-- Adds: accounts, api_keys, api_usage, billing_runs tables
-- Alters: sendletter_orders to support API-originated orders

-- ============================================================
-- Table: sendletter_accounts
-- ============================================================
create table sendletter_accounts (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  stripe_customer_id text unique,
  has_payment_method boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_sendletter_accounts_email on sendletter_accounts(email);

alter table sendletter_accounts enable row level security;
create policy "service_all" on sendletter_accounts for all using (true);

-- ============================================================
-- Table: sendletter_api_keys
-- ============================================================
create table sendletter_api_keys (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references sendletter_accounts(id) on delete cascade,
  key_hash text not null unique,
  key_prefix text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index idx_sendletter_api_keys_hash on sendletter_api_keys(key_hash) where is_active = true;
create index idx_sendletter_api_keys_account on sendletter_api_keys(account_id);

alter table sendletter_api_keys enable row level security;
create policy "service_all" on sendletter_api_keys for all using (true);

-- ============================================================
-- Table: sendletter_api_usage
-- ============================================================
create table sendletter_api_usage (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references sendletter_accounts(id),
  api_key_id uuid not null references sendletter_api_keys(id),
  order_id uuid references sendletter_orders(id),
  letter_mode text not null check (letter_mode in ('upload', 'draft', 'formatted')),
  letter_size text not null default 'standard' check (letter_size in ('standard', 'large', 'legal')),
  amount_cents integer not null,
  billed boolean not null default false,
  billing_run_id uuid,
  created_at timestamptz not null default now()
);

create index idx_sendletter_api_usage_unbilled
  on sendletter_api_usage(account_id) where billed = false;
create index idx_sendletter_api_usage_account
  on sendletter_api_usage(account_id, created_at desc);

alter table sendletter_api_usage enable row level security;
create policy "service_all" on sendletter_api_usage for all using (true);

-- ============================================================
-- Table: sendletter_billing_runs
-- ============================================================
create table sendletter_billing_runs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references sendletter_accounts(id),
  amount_cents integer not null,
  usage_count integer not null,
  stripe_payment_intent_id text,
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

create index idx_sendletter_billing_runs_account
  on sendletter_billing_runs(account_id, created_at desc);

alter table sendletter_billing_runs enable row level security;
create policy "service_all" on sendletter_billing_runs for all using (true);

-- ============================================================
-- Alter sendletter_orders for API-originated orders
-- ============================================================
alter table sendletter_orders
  add column if not exists api_account_id uuid references sendletter_accounts(id),
  add column if not exists api_usage_id uuid references sendletter_api_usage(id);

-- Make stripe_session_id nullable (API orders don't have one)
alter table sendletter_orders alter column stripe_session_id drop not null;

-- Replace unique constraint with partial unique index
alter table sendletter_orders drop constraint if exists sendletter_orders_stripe_session_id_key;
create unique index if not exists idx_sendletter_orders_stripe_session
  on sendletter_orders(stripe_session_id) where stripe_session_id is not null;

-- Add foreign key for billing_runs back-reference
alter table sendletter_api_usage
  add constraint fk_api_usage_billing_run
  foreign key (billing_run_id) references sendletter_billing_runs(id);
