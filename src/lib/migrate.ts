// App-managed, idempotent schema migration for the Canner tenant Postgres.
//
// The tenant DB is only reachable from inside the deployed app (PgBouncer at
// 127.0.0.1:6432), so the app provisions its own schema rather than relying on
// any out-of-band step. The SQL is embedded here (not read from a file) because
// the deploy upload excludes non-`src` SQL assets. Every statement is
// IF-NOT-EXISTS / guarded, so running it on each cold start is a no-op once the
// schema exists. Uses gen_random_uuid() (Postgres core) — no extensions needed.

import type { Pool } from "pg";

const SCHEMA_SQL = `
create table if not exists sendletter_accounts (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text,
  google_id text unique,
  stripe_customer_id text unique,
  has_payment_method boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_sendletter_accounts_email on sendletter_accounts(email);
create index if not exists idx_sendletter_accounts_google on sendletter_accounts(google_id);

create table if not exists sendletter_orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text,
  stripe_payment_status text not null default 'paid',
  customer_email text not null,
  letter_mode text not null,
  letter_size text not null default 'standard',
  page_count integer not null default 1,
  amount_cents integer not null,
  from_name text not null,
  from_line1 text not null,
  from_line2 text,
  from_city text not null,
  from_province text not null default '',
  from_postal text not null default '',
  from_country text not null default 'CA',
  to_name text not null,
  to_line1 text not null,
  to_line2 text,
  to_city text not null,
  to_province text not null default '',
  to_postal text not null default '',
  to_country text not null default 'CA',
  has_pdf_attachment boolean not null default false,
  letter_html text,
  status text not null default 'pending',
  printed_at timestamptz,
  mailed_at timestamptz,
  api_account_id uuid references sendletter_accounts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_sendletter_orders_status on sendletter_orders(status);
create index if not exists idx_sendletter_orders_email on sendletter_orders(customer_email);
create index if not exists idx_sendletter_orders_created on sendletter_orders(created_at desc);
create unique index if not exists idx_sendletter_orders_stripe_session
  on sendletter_orders(stripe_session_id) where stripe_session_id is not null;

create table if not exists sendletter_api_keys (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references sendletter_accounts(id) on delete cascade,
  key_hash text not null unique,
  key_prefix text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists idx_sendletter_api_keys_hash
  on sendletter_api_keys(key_hash) where is_active = true;
create index if not exists idx_sendletter_api_keys_account
  on sendletter_api_keys(account_id);

create table if not exists sendletter_api_usage (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references sendletter_accounts(id),
  api_key_id uuid not null references sendletter_api_keys(id),
  order_id uuid references sendletter_orders(id),
  letter_mode text not null,
  letter_size text not null default 'standard',
  amount_cents integer not null,
  billed boolean not null default false,
  billing_run_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_sendletter_api_usage_unbilled
  on sendletter_api_usage(account_id) where billed = false;
create index if not exists idx_sendletter_api_usage_account
  on sendletter_api_usage(account_id, created_at desc);

create table if not exists sendletter_billing_runs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references sendletter_accounts(id),
  amount_cents integer not null,
  usage_count integer not null,
  stripe_payment_intent_id text,
  status text not null default 'pending',
  error_message text,
  created_at timestamptz not null default now()
);
create index if not exists idx_sendletter_billing_runs_account
  on sendletter_billing_runs(account_id, created_at desc);

-- Canner Auth (passkeys). The credentials themselves live with Canner; all we
-- keep is the join back to our own account row.
--
-- canner_auth_user_id is load-bearing: the JWT Canner issues on a successful
-- ceremony carries the auth_app_users id as its subject, NOT the external_id we
-- enrolled with. Without this column there is no way to resolve a sign-in to a
-- sendletter account.
alter table sendletter_accounts add column if not exists canner_auth_user_id text unique;
alter table sendletter_accounts add column if not exists passkey_enrolled_at timestamptz;

do $do$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_api_usage_billing_run') then
    alter table sendletter_api_usage
      add constraint fk_api_usage_billing_run
      foreign key (billing_run_id) references sendletter_billing_runs(id);
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'sendletter_orders' and column_name = 'api_usage_id'
  ) then
    alter table sendletter_orders
      add column api_usage_id uuid references sendletter_api_usage(id);
  end if;
end
$do$;
`;

let migrationPromise: Promise<void> | null = null;

// Runs the schema once per process. The result is memoized; on failure the
// memo is cleared so a later query can retry.
export function ensureSchema(pool: Pool): Promise<void> {
  if (!migrationPromise) {
    migrationPromise = pool
      .query(SCHEMA_SQL)
      .then(() => undefined)
      .catch((e: unknown) => {
        migrationPromise = null;
        throw e;
      });
  }
  return migrationPromise;
}
