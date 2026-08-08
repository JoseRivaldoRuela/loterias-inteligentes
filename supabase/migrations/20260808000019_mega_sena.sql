-- Mega-Sena: regras, faixas de premiação e preços oficiais vigentes.
insert into public.lotteries (
  code, name, available_numbers, drawn_numbers, minimum_bet, maximum_bet, configuration, active
)
values (
  'mega-sena', 'Mega-Sena', 60, 6, 6, 20,
  '{
    "numberStart": 1,
    "numberEnd": 60,
    "drawnNumbers": 6,
    "minimumBet": 6,
    "maximumBet": 20,
    "defaultClosureUniverse": 10,
    "defaultGuarantee": 4
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
    (4, 'Quadra', 1),
    (5, 'Quina', 2),
    (6, 'Sena', 3)
) as tier(hits, name, display_order)
where lottery.code = 'mega-sena'
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
  'CAIXA', 'https://loterias.caixa.gov.br/Paginas/Mega-Sena.aspx', now()
from public.lotteries lottery
cross join (
  values
    (6, 6.00::numeric),
    (7, 42.00::numeric),
    (8, 168.00::numeric),
    (9, 504.00::numeric),
    (10, 1260.00::numeric),
    (11, 2772.00::numeric),
    (12, 5544.00::numeric),
    (13, 10296.00::numeric),
    (14, 18018.00::numeric),
    (15, 30030.00::numeric),
    (16, 48048.00::numeric),
    (17, 74256.00::numeric),
    (18, 111384.00::numeric),
    (19, 162792.00::numeric),
    (20, 232560.00::numeric)
) as price(numbers_per_bet, amount)
where lottery.code = 'mega-sena'
on conflict (lottery_id, numbers_per_bet, valid_from) do update set
  price = excluded.price,
  currency_code = excluded.currency_code,
  source_name = excluded.source_name,
  source_url = excluded.source_url,
  checked_at = excluded.checked_at;

-- Fechamentos triviais para o universo mínimo: um cartão cobre todas as
-- garantias válidas quando universo e tamanho do cartão são ambos 6.
insert into public.covering_designs (
  lottery_id, universe_size, ticket_size, guarantee_size, ticket_count,
  lower_bound, upper_bound, optimality_status, source_type, source_name,
  source_reference, blocks, coverage_verified, total_required_subsets,
  covered_required_subsets, verification_algorithm, verification_version,
  matrix_hash, notes, verified_at
)
select
  lottery.id, 6, 6, guarantee.hits, 1,
  1, 1, 'proven_optimal', 'internal', 'Loterias Inteligentes',
  format('C(6,6,%s)', guarantee.hits), '[[1,2,3,4,5,6]]'::jsonb, true,
  case guarantee.hits when 4 then 15 when 5 then 6 else 1 end,
  case guarantee.hits when 4 then 15 when 5 then 6 else 1 end,
  'trivial_full_block', '1.0', md5(format('mega-sena-C6-6-%s', guarantee.hits)),
  'Construção trivial com bloco completo.', now()
from public.lotteries lottery
cross join (values (4), (5), (6)) as guarantee(hits)
where lottery.code = 'mega-sena'
on conflict (lottery_id, universe_size, ticket_size, guarantee_size, matrix_hash)
do update set active = true, coverage_verified = true;
