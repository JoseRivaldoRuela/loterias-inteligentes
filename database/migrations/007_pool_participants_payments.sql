-- ============================================================
-- LOTERIAS INTELIGENTES
-- MIGRATION 007
--
-- Participantes dos bolões
-- Pagamentos dos participantes
-- Segurança por RLS
-- ============================================================


-- ============================================================
-- 1. PARTICIPANTES DOS BOLÕES
-- ============================================================

create table if not exists public.betting_pool_participants (
    id uuid primary key default gen_random_uuid(),

    betting_pool_id uuid not null
        references public.betting_pools(id)
        on delete cascade,

    name text not null,

    phone text not null,

    share_count integer not null default 1
        check (share_count >= 1),

    amount_due numeric(12, 2) not null default 0
        check (amount_due >= 0),

    active boolean not null default true,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    check (length(trim(name)) >= 2),

    check (length(trim(phone)) >= 8)
);


create index if not exists
    betting_pool_participants_pool_idx
on public.betting_pool_participants(betting_pool_id);


create index if not exists
    betting_pool_participants_name_idx
on public.betting_pool_participants(name);


create index if not exists
    betting_pool_participants_active_idx
on public.betting_pool_participants(active);


create unique index if not exists
    betting_pool_participants_unique_phone_idx
on public.betting_pool_participants (
    betting_pool_id,
    phone
)
where active = true;


drop trigger if exists
    betting_pool_participants_set_updated_at
on public.betting_pool_participants;


create trigger betting_pool_participants_set_updated_at
before update on public.betting_pool_participants
for each row
execute function public.set_updated_at();


-- ============================================================
-- 2. PAGAMENTOS DOS PARTICIPANTES
-- ============================================================

create table if not exists public.betting_pool_payments (
    id uuid primary key default gen_random_uuid(),

    participant_id uuid not null
        references public.betting_pool_participants(id)
        on delete cascade,

    amount numeric(12, 2) not null
        check (amount > 0),

    payment_method text not null default 'pix'
        check (
            payment_method in (
                'pix',
                'cash',
                'transfer',
                'other'
            )
        ),

    paid_at timestamptz not null default now(),

    note text,

    created_at timestamptz not null default now()
);


create index if not exists
    betting_pool_payments_participant_idx
on public.betting_pool_payments(participant_id);


create index if not exists
    betting_pool_payments_paid_at_idx
on public.betting_pool_payments(paid_at desc);


-- ============================================================
-- 3. RESUMO FINANCEIRO DOS PARTICIPANTES
--
-- Não armazenamos valor pago, saldo ou situação.
-- Esses valores são calculados para evitar inconsistências.
-- ============================================================

create or replace view public.betting_pool_participant_summary
with (security_invoker = true)
as
select
    participant.id,
    participant.betting_pool_id,
    participant.name,
    participant.phone,
    participant.share_count,
    participant.amount_due,

    coalesce(
        sum(payment.amount),
        0
    )::numeric(12, 2) as amount_paid,

    greatest(
        participant.amount_due
        - coalesce(sum(payment.amount), 0),
        0
    )::numeric(12, 2) as amount_remaining,

    case
        when coalesce(sum(payment.amount), 0) = 0
            then 'pending'

        when coalesce(sum(payment.amount), 0)
             < participant.amount_due
            then 'partial'

        else 'paid'
    end as payment_status,

    participant.active,
    participant.created_at,
    participant.updated_at

from public.betting_pool_participants participant

left join public.betting_pool_payments payment
    on payment.participant_id = participant.id

group by
    participant.id;


-- ============================================================
-- 4. ATIVAR ROW LEVEL SECURITY
-- ============================================================

alter table public.betting_pool_participants
enable row level security;


alter table public.betting_pool_payments
enable row level security;


-- ============================================================
-- 5. POLÍTICAS: PARTICIPANTES
-- ============================================================

drop policy if exists
    "Members can view pool participants"
on public.betting_pool_participants;


create policy
    "Members can view pool participants"
on public.betting_pool_participants
for select
to authenticated
using (
    public.is_betting_pool_member(
        betting_pool_id,
        auth.uid()
    )
);


drop policy if exists
    "Subscribed managers can create pool participants"
on public.betting_pool_participants;


create policy
    "Subscribed managers can create pool participants"
on public.betting_pool_participants
for insert
to authenticated
with check (
    public.is_active_subscriber(auth.uid())
    and public.can_manage_betting_pool(
        betting_pool_id,
        auth.uid()
    )
);


drop policy if exists
    "Subscribed managers can update pool participants"
on public.betting_pool_participants;


create policy
    "Subscribed managers can update pool participants"
on public.betting_pool_participants
for update
to authenticated
using (
    public.is_active_subscriber(auth.uid())
    and public.can_manage_betting_pool(
        betting_pool_id,
        auth.uid()
    )
)
with check (
    public.is_active_subscriber(auth.uid())
    and public.can_manage_betting_pool(
        betting_pool_id,
        auth.uid()
    )
);


drop policy if exists
    "Subscribed managers can delete pool participants"
on public.betting_pool_participants;


create policy
    "Subscribed managers can delete pool participants"
on public.betting_pool_participants
for delete
to authenticated
using (
    public.is_active_subscriber(auth.uid())
    and public.can_manage_betting_pool(
        betting_pool_id,
        auth.uid()
    )
);


-- ============================================================
-- 6. POLÍTICAS: PAGAMENTOS
-- ============================================================

drop policy if exists
    "Members can view pool payments"
on public.betting_pool_payments;


create policy
    "Members can view pool payments"
on public.betting_pool_payments
for select
to authenticated
using (
    exists (
        select 1
          from public.betting_pool_participants participant
         where participant.id = participant_id
           and public.is_betting_pool_member(
               participant.betting_pool_id,
               auth.uid()
           )
    )
);


drop policy if exists
    "Subscribed managers can create pool payments"
on public.betting_pool_payments;


create policy
    "Subscribed managers can create pool payments"
on public.betting_pool_payments
for insert
to authenticated
with check (
    public.is_active_subscriber(auth.uid())
    and exists (
        select 1
          from public.betting_pool_participants participant
         where participant.id = participant_id
           and public.can_manage_betting_pool(
               participant.betting_pool_id,
               auth.uid()
           )
    )
);


drop policy if exists
    "Subscribed managers can update pool payments"
on public.betting_pool_payments;


create policy
    "Subscribed managers can update pool payments"
on public.betting_pool_payments
for update
to authenticated
using (
    public.is_active_subscriber(auth.uid())
    and exists (
        select 1
          from public.betting_pool_participants participant
         where participant.id = participant_id
           and public.can_manage_betting_pool(
               participant.betting_pool_id,
               auth.uid()
           )
    )
)
with check (
    public.is_active_subscriber(auth.uid())
    and exists (
        select 1
          from public.betting_pool_participants participant
         where participant.id = participant_id
           and public.can_manage_betting_pool(
               participant.betting_pool_id,
               auth.uid()
           )
    )
);


drop policy if exists
    "Subscribed managers can delete pool payments"
on public.betting_pool_payments;


create policy
    "Subscribed managers can delete pool payments"
on public.betting_pool_payments
for delete
to authenticated
using (
    public.is_active_subscriber(auth.uid())
    and exists (
        select 1
          from public.betting_pool_participants participant
         where participant.id = participant_id
           and public.can_manage_betting_pool(
               participant.betting_pool_id,
               auth.uid()
           )
    )
);