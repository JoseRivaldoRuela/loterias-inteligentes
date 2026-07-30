-- Loterias Inteligentes
-- Catálogo de Covering Designs validados

create table if not exists public.covering_designs (
  id uuid primary key default gen_random_uuid(),

  lottery_id uuid not null
    references public.lotteries(id)
    on delete cascade,

  -- Parâmetros do Covering Design C(v, k, t)
  universe_size integer not null
    check (universe_size > 0),

  ticket_size integer not null
    check (ticket_size > 0),

  guarantee_size integer not null
    check (guarantee_size > 0),

  ticket_count integer not null
    check (ticket_count > 0),

  -- Limites conhecidos
  lower_bound integer
    check (lower_bound is null or lower_bound > 0),

  upper_bound integer
    check (upper_bound is null or upper_bound > 0),

  optimality_status text not null
    check (
      optimality_status in (
        'proven_optimal',
        'best_known',
        'valid_construction'
      )
    ),

  -- Origem da construção
  source_type text not null
    check (
      source_type in (
        'literature',
        'repository',
        'exact_solver',
        'imported',
        'internal'
      )
    ),

  source_name text,
  source_reference text,
  source_url text,

  -- Matriz usando posições de 1 até universe_size.
  -- Exemplo de cartão para C(18,15,12):
  -- [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]
  blocks jsonb not null,

  -- Verificação matemática
  coverage_verified boolean not null default false,
  total_required_subsets bigint,
  covered_required_subsets bigint,

  verification_algorithm text,
  verification_version text,
  verified_at timestamptz,
  verification_time_ms numeric(18, 3),

  matrix_hash text,

  notes text,

  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint covering_design_parameters_valid
    check (
      guarantee_size <= ticket_size
      and ticket_size <= universe_size
    ),

  constraint covering_design_bounds_valid
    check (
      lower_bound is null
      or upper_bound is null
      or lower_bound <= upper_bound
    ),

  constraint covering_design_coverage_values_valid
    check (
      total_required_subsets is null
      or covered_required_subsets is null
      or covered_required_subsets <= total_required_subsets
    ),

  constraint covering_design_unique
    unique (
      lottery_id,
      universe_size,
      ticket_size,
      guarantee_size,
      matrix_hash
    )
);

create index if not exists covering_designs_lookup_idx
on public.covering_designs (
  lottery_id,
  universe_size,
  ticket_size,
  guarantee_size,
  coverage_verified,
  active
);

create index if not exists covering_designs_best_result_idx
on public.covering_designs (
  lottery_id,
  universe_size,
  ticket_size,
  guarantee_size,
  ticket_count
);

alter table public.covering_designs
enable row level security;

create policy "Authenticated users can view verified covering designs"
on public.covering_designs
for select
to authenticated
using (
  active = true
  and coverage_verified = true
);

create trigger covering_designs_set_updated_at
before update on public.covering_designs
for each row
execute function public.set_updated_at();