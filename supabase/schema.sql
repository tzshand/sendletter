-- sendletter Orders Schema
-- Run this in Supabase SQL Editor
-- All tables prefixed with sendletter_ to isolate from other projects

create table sendletter_orders (
  id uuid primary key default uuid_generate_v4(),
  stripe_session_id text unique not null,
  stripe_payment_status text not null default 'paid',

  -- Customer
  customer_email text not null,

  -- Letter details
  letter_mode text not null check (letter_mode in ('simple', 'custom', 'upload')),
  letter_size text not null default 'standard' check (letter_size in ('standard', 'large', 'legal')),
  page_count integer not null default 1,
  amount_cents integer not null,

  -- Addresses
  from_name text not null,
  from_line1 text not null,
  from_line2 text,
  from_city text not null,
  from_province text not null,
  from_postal text not null,

  to_name text not null,
  to_line1 text not null,
  to_line2 text,
  to_city text not null,
  to_province text not null,
  to_postal text not null,

  -- Content (HTML or reference to PDF)
  has_pdf_attachment boolean not null default false,
  letter_html text,

  -- Fulfillment
  status text not null default 'pending'
    check (status in ('pending', 'printed', 'mailed', 'delivered', 'failed')),
  printed_at timestamptz,
  mailed_at timestamptz,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_sendletter_orders_status on sendletter_orders(status);
create index idx_sendletter_orders_email on sendletter_orders(customer_email);
create index idx_sendletter_orders_created on sendletter_orders(created_at desc);

-- RLS
alter table sendletter_orders enable row level security;
create policy "service_write" on sendletter_orders for all using (true);
