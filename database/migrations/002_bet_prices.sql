-- Loterias Inteligentes
-- Histórico de preços das apostas

create table if not exists public.lottery_bet_prices (
  id uuid primary key default gen_random_uuid(),

  lottery_id uuid not null
    references public.lotteries(id)
    on delete cascade,

  numbers_per_bet integer not null
    check (numbers_per_bet > 0),

  price numeric(14, 2) not null
    check (price >= 0),

  currency_code varchar(3) not null default 'BRL',

  valid_from date not null,
  valid_until date,

  source_name text not null default 'CAIXA',
  source_url text,
  checked_at timestamptz not null default now(),

  created_at timestamptz not null default now(),

  constraint lottery_bet_prices_valid_period
    check (
      valid_until is null
      or valid_until >= valid_from
    ),

  constraint lottery_bet_prices_unique_period
    unique (
      lottery_id,
      numbers_per_bet,
      valid_from
    )
);

create index if not exists lottery_bet_prices_lookup_idx
on public.lottery_bet_prices (
  lottery_id,
  numbers_per_bet,
  valid_from desc
);

alter table public.lottery_bet_prices
enable row level security;

create policy "Authenticated users can view lottery prices"
on public.lottery_bet_prices
for select
to authenticated
using (true);

-- Lotofácil: valores vigentes cadastrados inicialmente

insert into public.lottery_bet_prices (
  lottery_id,
  numbers_per_bet,
  price,
  currency_code,
  valid_from,
  source_name,
  source_url,
  checked_at
)
select
  lotteries.id,
  prices.numbers_per_bet,
  prices.price,
  'BRL',
  date '2025-07-09',
  'CAIXA',
  'https://loterias.caixa.gov.br/paginas/lotofacil.aspx',
  now()
from public.lotteries
cross join (
  values
    (15, 3.50::numeric),
    (16, 56.00::numeric),
    (17, 476.00::numeric),
    (18, 2856.00::numeric),
    (19, 13566.00::numeric),
    (20, 54264.00::numeric)
) as prices(numbers_per_bet, price)
where lotteries.code = 'lotofacil'
on conflict (
  lottery_id,
  numbers_per_bet,
  valid_from
)
do update set
  price = excluded.price,
  currency_code = excluded.currency_code,
  source_name = excluded.source_name,
  source_url = excluded.source_url,
  checked_at = excluded.checked_at;