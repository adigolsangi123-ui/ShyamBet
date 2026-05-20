-- ============================================================
-- Nightbet — Supabase Schema
-- Run this in your Supabase SQL editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------

create table if not exists profiles (
  id         uuid        primary key references auth.users(id) on delete cascade,
  username   text        unique not null,
  email      text        not null,
  balance    integer     not null default 1000,
  created_at timestamptz not null default now()
);

create table if not exists markets (
  id          uuid        primary key default uuid_generate_v4(),
  creator_id  uuid        not null references profiles(id) on delete cascade,
  question    text        not null,
  category    text        not null,
  closes_at   timestamptz not null,
  status      text        not null default 'open'
                check (status in ('open', 'closed', 'resolved', 'voided')),
  outcome     text        check (outcome in ('yes', 'no')),
  yes_pool    integer     not null default 100,
  no_pool     integer     not null default 100,
  created_at  timestamptz not null default now()
);

create table if not exists bets (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     uuid        not null references profiles(id) on delete cascade,
  market_id   uuid        not null references markets(id) on delete cascade,
  side        text        not null check (side in ('yes', 'no')),
  amount      integer     not null check (amount > 0),
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------

alter table profiles enable row level security;
alter table markets  enable row level security;
alter table bets     enable row level security;

-- Profiles: anyone can read; users manage their own row
create policy "profiles_select_all"  on profiles for select using (true);
create policy "profiles_insert_own"  on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own"  on profiles for update using (auth.uid() = id);

-- Markets: anyone can read; authenticated users create/manage their own
create policy "markets_select_all"   on markets for select using (true);
create policy "markets_insert_auth"  on markets for insert with check (auth.uid() = creator_id);
create policy "markets_update_own"   on markets for update using (auth.uid() = creator_id);
create policy "markets_delete_own"   on markets for delete using (auth.uid() = creator_id);

-- Bets: anyone can read; users create their own
create policy "bets_select_all"  on bets for select using (true);
create policy "bets_insert_own"  on bets for insert with check (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- Trigger: auto-create profile on signup
-- ----------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, email, balance)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    1000
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------
-- RPC: place_bet
-- Atomically deducts coins, updates pool, inserts bet.
-- ----------------------------------------------------------------

create or replace function public.place_bet(
  p_user_id   uuid,
  p_market_id uuid,
  p_side      text,
  p_amount    integer
) returns jsonb as $$
declare
  v_balance   integer;
  v_status    text;
  v_closes_at timestamptz;
begin
  -- Lock + fetch user balance
  select balance into v_balance
  from profiles where id = p_user_id for update;

  if not found then
    return jsonb_build_object('error', 'User not found');
  end if;

  if v_balance < p_amount then
    return jsonb_build_object('error', 'Insufficient balance');
  end if;

  -- Lock + fetch market
  select status, closes_at into v_status, v_closes_at
  from markets where id = p_market_id for update;

  if not found then
    return jsonb_build_object('error', 'Market not found');
  end if;

  if v_status <> 'open' then
    return jsonb_build_object('error', 'Market is not open for betting');
  end if;

  if now() > v_closes_at then
    return jsonb_build_object('error', 'Market betting has closed');
  end if;

  -- Deduct balance
  update profiles set balance = balance - p_amount where id = p_user_id;

  -- Update pool
  if p_side = 'yes' then
    update markets set yes_pool = yes_pool + p_amount where id = p_market_id;
  else
    update markets set no_pool  = no_pool  + p_amount where id = p_market_id;
  end if;

  -- Record bet
  insert into bets (user_id, market_id, side, amount)
  values (p_user_id, p_market_id, p_side, p_amount);

  return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer;

-- ----------------------------------------------------------------
-- RPC: resolve_market
-- Pays out winners proportionally, marks market resolved.
-- Payout = (stake / winning_pool) * total_pool  (seed included)
-- ----------------------------------------------------------------

create or replace function public.resolve_market(
  p_market_id   uuid,
  p_resolver_id uuid,
  p_outcome     text
) returns jsonb as $$
declare
  v_market       markets%rowtype;
  v_bet          record;
  v_winning_pool integer;
  v_total_pool   integer;
  v_payout       integer;
begin
  select * into v_market
  from markets where id = p_market_id for update;

  if not found then
    return jsonb_build_object('error', 'Market not found');
  end if;

  if v_market.creator_id <> p_resolver_id then
    return jsonb_build_object('error', 'Only the creator can resolve this market');
  end if;

  if v_market.status = 'resolved' then
    return jsonb_build_object('error', 'Market already resolved');
  end if;

  if v_market.status = 'voided' then
    return jsonb_build_object('error', 'Market is voided');
  end if;

  if now() <= v_market.closes_at then
    return jsonb_build_object('error', 'Market has not closed yet');
  end if;

  v_total_pool   := v_market.yes_pool + v_market.no_pool;
  v_winning_pool := case when p_outcome = 'yes' then v_market.yes_pool else v_market.no_pool end;

  -- Pay winners
  for v_bet in
    select * from bets
    where market_id = p_market_id and side = p_outcome
  loop
    v_payout := floor(v_bet.amount::float / v_winning_pool::float * v_total_pool::float)::integer;
    update profiles set balance = balance + v_payout where id = v_bet.user_id;
  end loop;

  -- Resolve
  update markets set status = 'resolved', outcome = p_outcome where id = p_market_id;

  return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer;

-- ----------------------------------------------------------------
-- RPC: void_expired_markets
-- Refunds all bets for unresolved markets past the global deadline.
-- Call this on app load (it's a no-op before the deadline).
-- ----------------------------------------------------------------

create or replace function public.void_expired_markets()
returns integer as $$
declare
  v_market markets%rowtype;
  v_bet    record;
  v_count  integer := 0;
begin
  if now() < '2026-05-24T02:00:00+00:00'::timestamptz then
    return 0;
  end if;

  for v_market in
    select * from markets
    where status in ('open', 'closed')
    for update
  loop
    for v_bet in select * from bets where market_id = v_market.id loop
      update profiles set balance = balance + v_bet.amount where id = v_bet.user_id;
    end loop;
    update markets set status = 'voided' where id = v_market.id;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$ language plpgsql security definer;

-- ----------------------------------------------------------------
-- Realtime
-- ----------------------------------------------------------------

alter publication supabase_realtime add table markets;
alter publication supabase_realtime add table bets;
alter publication supabase_realtime add table profiles;
