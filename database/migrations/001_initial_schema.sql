-- Loterias Inteligentes
-- Migração inicial

create extension if not exists pgcrypto;

-- =========================================================
-- PERFIS
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  role text not null default 'user'
    check (role in ('user', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- =========================================================
-- LOTERIAS
-- =========================================================

create table if not exists public.lotteries (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  available_numbers integer not null
    check (available_numbers > 0),
  drawn_numbers integer not null
    check (drawn_numbers > 0),
  minimum_bet integer not null
    check (minimum_bet > 0),
  maximum_bet integer not null
    check (maximum_bet >= minimum_bet),
  active boolean not null default true,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint lotteries_drawn_numbers_limit
    check (drawn_numbers <= available_numbers),

  constraint lotteries_minimum_bet_limit
    check (minimum_bet <= available_numbers),

  constraint lotteries_maximum_bet_limit
    check (maximum_bet <= available_numbers)
);

alter table public.lotteries enable row level security;

create policy "Authenticated users can view active lotteries"
on public.lotteries
for select
to authenticated
using (active = true);

-- =========================================================
-- FAIXAS DE PREMIAÇÃO
-- =========================================================

create table if not exists public.prize_tiers (
  id uuid primary key default gen_random_uuid(),
  lottery_id uuid not null
    references public.lotteries(id)
    on delete cascade,
  hits integer not null check (hits > 0),
  name text not null,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),

  constraint prize_tiers_lottery_hits_unique
    unique (lottery_id, hits)
);

create index if not exists prize_tiers_lottery_id_idx
on public.prize_tiers(lottery_id);

alter table public.prize_tiers enable row level security;

create policy "Authenticated users can view active prize tiers"
on public.prize_tiers
for select
to authenticated
using (active = true);

-- =========================================================
-- WORKSPACES
-- =========================================================

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    references auth.users(id)
    on delete cascade,
  name text not null,
  description text,
  default_lottery_id uuid
    references public.lotteries(id)
    on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspaces_user_id_idx
on public.workspaces(user_id);

alter table public.workspaces enable row level security;

create policy "Users can view own workspaces"
on public.workspaces
for select
using (auth.uid() = user_id);

create policy "Users can create own workspaces"
on public.workspaces
for insert
with check (auth.uid() = user_id);

create policy "Users can update own workspaces"
on public.workspaces
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own workspaces"
on public.workspaces
for delete
using (auth.uid() = user_id);

-- =========================================================
-- ATUALIZAÇÃO AUTOMÁTICA DE updated_at
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger lotteries_set_updated_at
before update on public.lotteries
for each row
execute function public.set_updated_at();

create trigger workspaces_set_updated_at
before update on public.workspaces
for each row
execute function public.set_updated_at();

-- =========================================================
-- CRIAÇÃO AUTOMÁTICA DO PERFIL
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    )
  );

  insert into public.workspaces (
    user_id,
    name,
    description
  )
  values (
    new.id,
    'Meu Workspace',
    'Área principal do usuário'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- =========================================================
-- LOTOFÁCIL INICIAL
-- =========================================================

insert into public.lotteries (
  code,
  name,
  available_numbers,
  drawn_numbers,
  minimum_bet,
  maximum_bet,
  configuration
)
values (
  'lotofacil',
  'Lotofácil',
  25,
  15,
  15,
  20,
  '{
    "numberStart": 1,
    "numberEnd": 25,
    "drawnNumbers": 15,
    "minimumBet": 15,
    "maximumBet": 20
  }'::jsonb
)
on conflict (code) do nothing;

insert into public.prize_tiers (
  lottery_id,
  hits,
  name,
  display_order
)
select
  lotteries.id,
  prize.hits,
  prize.name,
  prize.display_order
from public.lotteries
cross join (
  values
    (11, '11 acertos', 1),
    (12, '12 acertos', 2),
    (13, '13 acertos', 3),
    (14, '14 acertos', 4),
    (15, '15 acertos', 5)
) as prize(hits, name, display_order)
where lotteries.code = 'lotofacil'
on conflict (lottery_id, hits) do nothing;