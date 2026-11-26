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

-- Sessions. The sl_session cookie used to be a bare stateless JWT, which meant
-- there was no way to enumerate a user's sign-ins or end one: the only lever
-- was rotating JWT_SECRET, which signs everybody out everywhere. Each sign-in
-- now writes a row, and the cookie carries its id, so a session can be listed
-- and revoked individually.
--
-- ip_hash rather than the address itself: it is enough to distinguish devices
-- and spot an unfamiliar sign-in, without keeping a log of where someone lives.
create table if not exists sendletter_sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references sendletter_accounts(id) on delete cascade,
  user_agent text,
  ip_hash text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists idx_sendletter_sessions_account
  on sendletter_sessions(account_id, last_seen_at desc);
create index if not exists idx_sendletter_sessions_active
  on sendletter_sessions(account_id) where revoked_at is null;

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

-- Usage-based pricing (2026-11). What was priced and how, so an order can be
-- fulfilled (colour, duplex, how many envelopes and stamps) and audited later.
-- All nullable: orders placed before this carry none of it.
alter table sendletter_orders add column if not exists colour boolean;
alter table sendletter_orders add column if not exists duplex boolean;
alter table sendletter_orders add column if not exists mailings integer;
alter table sendletter_orders add column if not exists sheets integer;
alter table sendletter_orders add column if not exists stamps integer;
alter table sendletter_orders add column if not exists est_weight_g integer;
alter table sendletter_orders add column if not exists price_breakdown jsonb;
alter table sendletter_orders add column if not exists pricing_version text;
-- Free-form FROM lines (the "international" return address), newline-separated.
alter table sendletter_orders add column if not exists from_lines text;
-- Where the print-ready PDFs for this order live in the project files store.
alter table sendletter_orders add column if not exists print_files text;
alter table sendletter_api_usage add column if not exists price_breakdown jsonb;

-- API v2 (2026-11): test keys, delivery status, cancellation, idempotency,
-- webhooks, invoices, spend limits and volume pricing.

-- Keys: a test key (sl_test_) validates and prices a letter but mails nothing.
alter table sendletter_api_keys add column if not exists livemode boolean not null default true;
alter table sendletter_api_keys add column if not exists last_used_at timestamptz;

-- Per-account daily spend. limit is what the customer chose; cap is the
-- ceiling we have approved. Both start at $500. A customer may set the limit
-- anywhere up to the cap; raising the cap is a request we answer by email.
alter table sendletter_accounts add column if not exists daily_spend_limit_cents integer not null default 50000;
alter table sendletter_accounts add column if not exists daily_spend_cap_cents integer not null default 50000;

-- Orders: which key placed it, the caller's own reference and metadata, and
-- whether it was a test letter. Status moves pending -> printed -> mailed, or to cancelled.
alter table sendletter_orders add column if not exists livemode boolean not null default true;
alter table sendletter_orders add column if not exists api_key_id uuid;
alter table sendletter_orders add column if not exists reference text;
alter table sendletter_orders add column if not exists metadata jsonb;
alter table sendletter_orders add column if not exists cancelled_at timestamptz;
create index if not exists idx_sendletter_orders_api_account
  on sendletter_orders(api_account_id, created_at desc) where api_account_id is not null;

-- Usage: how many mailings it covers (for the volume window), whether it was
-- voided by a cancellation, how much of it was refunded, and its invoice.
alter table sendletter_api_usage add column if not exists mailings integer not null default 1;
alter table sendletter_api_usage add column if not exists voided_at timestamptz;
alter table sendletter_api_usage add column if not exists refunded_cents integer not null default 0;
alter table sendletter_api_usage add column if not exists invoice_id uuid;

-- Invoices: what a customer sees. One per charge. A first order is charged up
-- front on its own invoice; after that usage is invoiced monthly.
create sequence if not exists sendletter_invoice_seq;
create table if not exists sendletter_invoices (
  id uuid primary key default gen_random_uuid(),
  seq bigint not null default nextval('sendletter_invoice_seq'),
  account_id uuid not null references sendletter_accounts(id),
  kind text not null default 'monthly',
  status text not null default 'open',
  letters integer not null default 0,
  total_cents integer not null,
  period_start timestamptz,
  period_end timestamptz,
  stripe_payment_intent_id text,
  error_message text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_sendletter_invoices_account
  on sendletter_invoices(account_id, created_at desc);

create table if not exists sendletter_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references sendletter_invoices(id) on delete cascade,
  order_id uuid,
  description text not null,
  amount_cents integer not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_sendletter_invoice_lines_invoice
  on sendletter_invoice_lines(invoice_id);

-- Idempotency: a retried request with the same Idempotency-Key returns the
-- original response instead of mailing a second letter.
create table if not exists sendletter_idempotency (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references sendletter_accounts(id) on delete cascade,
  key text not null,
  request_hash text not null,
  status text not null default 'in_progress',
  response_status integer,
  response_body jsonb,
  order_id uuid,
  created_at timestamptz not null default now(),
  unique (account_id, key)
);

-- Webhooks: signed event delivery with retries.
create table if not exists sendletter_webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references sendletter_accounts(id) on delete cascade,
  url text not null,
  secret text not null,
  events text,
  description text,
  livemode boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_sendletter_webhook_endpoints_account
  on sendletter_webhook_endpoints(account_id);

create table if not exists sendletter_webhook_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references sendletter_accounts(id) on delete cascade,
  type text not null,
  livemode boolean not null default true,
  order_id uuid,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_sendletter_webhook_events_account
  on sendletter_webhook_events(account_id, created_at desc);

create table if not exists sendletter_webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid not null references sendletter_webhook_endpoints(id) on delete cascade,
  event_id uuid not null references sendletter_webhook_events(id) on delete cascade,
  status text not null default 'pending',
  attempts integer not null default 0,
  last_status_code integer,
  last_error text,
  next_attempt_at timestamptz not null default now(),
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_sendletter_webhook_deliveries_due
  on sendletter_webhook_deliveries(next_attempt_at) where status = 'pending';

-- Requests to raise the daily spend cap. Answered by email.
create table if not exists sendletter_limit_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references sendletter_accounts(id) on delete cascade,
  requested_daily_cents integer not null,
  expected_volume text,
  reason text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
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
