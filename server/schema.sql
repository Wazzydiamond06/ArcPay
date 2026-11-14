-- ArcPay tables. Work on any PostgreSQL, including a Supabase project (paste into the SQL editor).
create table if not exists users (
  id                 uuid        primary key default gen_random_uuid(),
  phone_number       text        not null unique,   -- E.164, e.g. +2348031234567. One account per number.
  first_name         text        not null,
  last_name          text        not null,
  bvn_hash           text        not null unique,   -- HMAC-SHA256 of the BVN. The BVN itself is never stored.
  arc_wallet_address text        not null,
  created_at         timestamptz not null default now()
);

create table if not exists transactions (
  id                  uuid          primary key default gen_random_uuid(),
  sender_wallet       text          not null,
  receiver_phone      text          not null,                    -- E.164
  amount              numeric(20,6) not null,                    -- USDC
  message             text          not null default '',
  status              text          not null default 'success',
  is_read_by_receiver boolean       not null default false,
  created_at          timestamptz   not null default now(),
  tx_hash             text          unique                       -- onchain transfer; makes saving idempotent
);

create index if not exists transactions_sender_idx on transactions (lower(sender_wallet), created_at desc);
create index if not exists transactions_receiver_idx on transactions (receiver_phone, is_read_by_receiver);

-- Added later: mock fiat withdrawals (USDC already "cashed out", deducted from the displayed balance)
-- and the sender's display name for the receiver's "You received funds" alert.
alter table users add column if not exists withdrawn_usdc numeric(20,6) not null default 0;
alter table transactions add column if not exists sender_name text not null default '';

-- Transaction kind. Every existing row becomes 'deposit' (incoming funds) automatically, so nothing is ever null.
-- 'withdrawal' rows are the mock fiat cash-outs and are created already read, so they never trigger the alert.
alter table transactions add column if not exists type text not null default 'deposit' check (type in ('deposit', 'withdrawal'));

-- Senders sign in with a wallet, not a phone number, so they live in their own table.
create table if not exists senders (
  wallet_address text        primary key,   -- lowercase 0x address
  display_name   text        not null,      -- what receivers see on receipts
  created_at     timestamptz not null default now()
);
