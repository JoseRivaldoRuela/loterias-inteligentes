-- Loterias Inteligentes
-- Solicitações de fechamentos ainda indisponíveis

create table if not exists public.covering_design_requests (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  lottery_id uuid not null
    references public.lotteries(id)
    on delete cascade,

  universe_size integer not null
    check (universe_size between 1 and 100),

  ticket_size integer not null
    check (ticket_size between 1 and 100),

  guarantee_size integer not null
    check (guarantee_size between 1 and 100),

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'processing',
        'available',
        'rejected'
      )
    ),

  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint covering_design_requests_parameters_valid
    check (
      guarantee_size <= ticket_size
      and ticket_size <= universe_size
    ),

  constraint covering_design_requests_unique_user_request
    unique (
      user_id,
      lottery_id,
      universe_size,
      ticket_size,
      guarantee_size
    )
);

create index if not exists covering_design_requests_demand_idx
on public.covering_design_requests (
  lottery_id,
  universe_size,
  ticket_size,
  guarantee_size,
  status
);

create index if not exists covering_design_requests_user_idx
on public.covering_design_requests (
  user_id,
  requested_at desc
);

alter table public.covering_design_requests
enable row level security;

create policy "Users can view their own covering requests"
on public.covering_design_requests
for select
to authenticated
using (
  auth.uid() = user_id
);

create policy "Users can create their own covering requests"
on public.covering_design_requests
for insert
to authenticated
with check (
  auth.uid() = user_id
);

create policy "Users can update their own covering requests"
on public.covering_design_requests
for update
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);

create trigger covering_design_requests_set_updated_at
before update on public.covering_design_requests
for each row
execute function public.set_updated_at();