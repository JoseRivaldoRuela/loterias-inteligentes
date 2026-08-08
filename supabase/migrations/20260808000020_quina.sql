-- Quina: regras, faixas de premiação e preços oficiais vigentes.
insert into public.lotteries (
  code, name, available_numbers, drawn_numbers, minimum_bet, maximum_bet, configuration, active
)
values (
  'quina', 'Quina', 80, 5, 5, 15,
  '{
    "numberStart": 1,
    "numberEnd": 80,
    "drawnNumbers": 5,
    "minimumBet": 5,
    "maximumBet": 15,
    "defaultClosureUniverse": 9,
    "defaultGuarantee": 2
  }'::jsonb,
  true
)
on conflict (code) do update set
  name = excluded.name,
  available_numbers = excluded.available_numbers,
  drawn_numbers = excluded.drawn_numbers,
  minimum_bet = excluded.minimum_bet,
  maximum_bet = excluded.maximum_bet,
  configuration = excluded.configuration,
  active = true,
  updated_at = now();

insert into public.prize_tiers (lottery_id, hits, name, display_order, active)
select lottery.id, tier.hits, tier.name, tier.display_order, true
from public.lotteries lottery
cross join (
  values
    (2, 'Duque', 1),
    (3, 'Terno', 2),
    (4, 'Quadra', 3),
    (5, 'Quina', 4)
) as tier(hits, name, display_order)
where lottery.code = 'quina'
on conflict (lottery_id, hits) do update set
  name = excluded.name,
  display_order = excluded.display_order,
  active = true;

insert into public.lottery_bet_prices (
  lottery_id, numbers_per_bet, price, currency_code, valid_from,
  source_name, source_url, checked_at
)
select
  lottery.id, price.numbers_per_bet, price.amount, 'BRL', date '2025-07-09',
  'CAIXA', 'https://loterias.caixa.gov.br/Paginas/Quina.aspx', now()
from public.lotteries lottery
cross join (
  values
    (5, 3.00::numeric),
    (6, 18.00::numeric),
    (7, 63.00::numeric),
    (8, 168.00::numeric),
    (9, 378.00::numeric),
    (10, 756.00::numeric),
    (11, 1386.00::numeric),
    (12, 2376.00::numeric),
    (13, 3861.00::numeric),
    (14, 6006.00::numeric),
    (15, 9009.00::numeric)
) as price(numbers_per_bet, amount)
where lottery.code = 'quina'
on conflict (lottery_id, numbers_per_bet, valid_from) do update set
  price = excluded.price,
  currency_code = excluded.currency_code,
  source_name = excluded.source_name,
  source_url = excluded.source_url,
  checked_at = excluded.checked_at;

-- Fechamentos triviais do universo mínimo.
insert into public.covering_designs (
  lottery_id, universe_size, ticket_size, guarantee_size, ticket_count,
  lower_bound, upper_bound, optimality_status, source_type, source_name,
  source_reference, blocks, coverage_verified, total_required_subsets,
  covered_required_subsets, verification_algorithm, verification_version,
  matrix_hash, notes, verified_at
)
select
  lottery.id, 5, 5, guarantee.hits, 1,
  1, 1, 'proven_optimal', 'internal', 'Loterias Inteligentes',
  format('C(5,5,%s)', guarantee.hits), '[[1,2,3,4,5]]'::jsonb, true,
  case guarantee.hits when 2 then 10 when 3 then 10 when 4 then 5 else 1 end,
  case guarantee.hits when 2 then 10 when 3 then 10 when 4 then 5 else 1 end,
  'trivial_full_block', '1.0', md5(format('quina-C5-5-%s', guarantee.hits)),
  'Construção trivial com bloco completo.', now()
from public.lotteries lottery
cross join (values (2), (3), (4), (5)) as guarantee(hits)
where lottery.code = 'quina'
on conflict (lottery_id, universe_size, ticket_size, guarantee_size, matrix_hash)
do update set active = true, coverage_verified = true;
