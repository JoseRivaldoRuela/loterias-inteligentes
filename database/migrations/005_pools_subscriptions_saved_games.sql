-- ============================================================
-- LOTERIAS INTELIGENTES
-- MIGRATION 005
--
-- Assinaturas
-- Bolões
-- Participantes
-- Convites
-- Jogos salvos
-- Cartões salvos
-- Segurança por RLS
-- ============================================================


-- ============================================================
-- 1. FUNÇÃO PADRÃO PARA updated_at
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;


-- ============================================================
-- 2. ASSINATURAS
-- ============================================================

create table if not exists public.user_subscriptions (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    plan_code text not null default 'free',

    status text not null default 'inactive'
        check (
            status in (
                'inactive',
                'trialing',
                'active',
                'past_due',
                'canceled',
                'expired'
            )
        ),

    started_at timestamptz,

    expires_at timestamptz,

    canceled_at timestamptz,

    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint user_subscriptions_unique_user
        unique (user_id)
);


create index if not exists
    user_subscriptions_status_idx
on public.user_subscriptions(status);


drop trigger if exists
    user_subscriptions_set_updated_at
on public.user_subscriptions;


create trigger user_subscriptions_set_updated_at
before update on public.user_subscriptions
for each row
execute function public.set_updated_at();


-- ============================================================
-- 3. VERIFICAR SE O USUÁRIO É ASSINANTE ATIVO
-- ============================================================

create or replace function public.is_active_subscriber(
    requested_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
          from public.user_subscriptions subscription
         where subscription.user_id = requested_user_id
           and subscription.status in ('active', 'trialing')
           and (
               subscription.expires_at is null
               or subscription.expires_at > now()
           )
    );
$$;


-- ============================================================
-- 4. BOLÕES
-- ============================================================

create table if not exists public.betting_pools (
    id uuid primary key default gen_random_uuid(),

    owner_id uuid not null
        references auth.users(id)
        on delete restrict,

    lottery_id uuid not null
        references public.lotteries(id)
        on delete restrict,

    name text not null,

    description text,

    status text not null default 'active'
        check (
            status in (
                'draft',
                'active',
                'closed',
                'completed',
                'canceled'
            )
        ),

    total_shares integer not null default 1
        check (total_shares >= 1),

    share_price numeric(12, 2)
        check (
            share_price is null
            or share_price >= 0
        ),

    total_amount numeric(12, 2)
        check (
            total_amount is null
            or total_amount >= 0
        ),

    first_contest_number integer,

    last_contest_number integer,

    rules jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    check (
        first_contest_number is null
        or last_contest_number is null
        or last_contest_number >= first_contest_number
    )
);


create index if not exists
    betting_pools_owner_id_idx
on public.betting_pools(owner_id);


create index if not exists
    betting_pools_lottery_id_idx
on public.betting_pools(lottery_id);


create index if not exists
    betting_pools_status_idx
on public.betting_pools(status);


drop trigger if exists
    betting_pools_set_updated_at
on public.betting_pools;


create trigger betting_pools_set_updated_at
before update on public.betting_pools
for each row
execute function public.set_updated_at();


-- ============================================================
-- 5. PARTICIPANTES DOS BOLÕES
-- ============================================================

create table if not exists public.betting_pool_members (
    id uuid primary key default gen_random_uuid(),

    betting_pool_id uuid not null
        references public.betting_pools(id)
        on delete cascade,

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    role text not null default 'member'
        check (
            role in (
                'owner',
                'manager',
                'member'
            )
        ),

    status text not null default 'accepted'
        check (
            status in (
                'invited',
                'accepted',
                'declined',
                'removed'
            )
        ),

    share_count integer not null default 1
        check (share_count >= 0),

    amount_due numeric(12, 2) not null default 0
        check (amount_due >= 0),

    amount_paid numeric(12, 2) not null default 0
        check (amount_paid >= 0),

    joined_at timestamptz,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint betting_pool_members_unique_user
        unique (betting_pool_id, user_id)
);


create index if not exists
    betting_pool_members_pool_idx
on public.betting_pool_members(betting_pool_id);


create index if not exists
    betting_pool_members_user_idx
on public.betting_pool_members(user_id);


create index if not exists
    betting_pool_members_status_idx
on public.betting_pool_members(status);


drop trigger if exists
    betting_pool_members_set_updated_at
on public.betting_pool_members;


create trigger betting_pool_members_set_updated_at
before update on public.betting_pool_members
for each row
execute function public.set_updated_at();


-- ============================================================
-- 6. INCLUIR O CRIADOR COMO PROPRIETÁRIO DO BOLÃO
-- ============================================================

create or replace function public.add_betting_pool_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.betting_pool_members (
        betting_pool_id,
        user_id,
        role,
        status,
        share_count,
        joined_at
    )
    values (
        new.id,
        new.owner_id,
        'owner',
        'accepted',
        1,
        now()
    )
    on conflict (betting_pool_id, user_id)
    do update set
        role = 'owner',
        status = 'accepted',
        joined_at = coalesce(
            public.betting_pool_members.joined_at,
            now()
        );

    return new;
end;
$$;


drop trigger if exists
    betting_pools_add_owner
on public.betting_pools;


create trigger betting_pools_add_owner
after insert on public.betting_pools
for each row
execute function public.add_betting_pool_owner();


-- ============================================================
-- 7. FUNÇÕES DE PERMISSÃO DOS BOLÕES
-- ============================================================

create or replace function public.is_betting_pool_member(
    requested_pool_id uuid,
    requested_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
          from public.betting_pool_members member
         where member.betting_pool_id = requested_pool_id
           and member.user_id = requested_user_id
           and member.status = 'accepted'
    );
$$;


create or replace function public.can_manage_betting_pool(
    requested_pool_id uuid,
    requested_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
          from public.betting_pool_members member
         where member.betting_pool_id = requested_pool_id
           and member.user_id = requested_user_id
           and member.status = 'accepted'
           and member.role in ('owner', 'manager')
    );
$$;


-- ============================================================
-- 8. CONVITES PARA BOLÕES
-- ============================================================

create table if not exists public.betting_pool_invitations (
    id uuid primary key default gen_random_uuid(),

    betting_pool_id uuid not null
        references public.betting_pools(id)
        on delete cascade,

    invited_by uuid not null
        references auth.users(id)
        on delete restrict,

    invited_user_id uuid
        references auth.users(id)
        on delete cascade,

    invited_email text not null,

    role text not null default 'member'
        check (
            role in (
                'manager',
                'member'
            )
        ),

    share_count integer not null default 1
        check (share_count >= 0),

    token uuid not null default gen_random_uuid(),

    status text not null default 'pending'
        check (
            status in (
                'pending',
                'accepted',
                'declined',
                'expired',
                'canceled'
            )
        ),

    expires_at timestamptz not null
        default (now() + interval '7 days'),

    accepted_at timestamptz,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint betting_pool_invitations_unique_token
        unique (token)
);


create unique index if not exists
    betting_pool_invitations_pending_email_idx
on public.betting_pool_invitations (
    betting_pool_id,
    lower(invited_email)
)
where status = 'pending';


create index if not exists
    betting_pool_invitations_pool_idx
on public.betting_pool_invitations(betting_pool_id);


create index if not exists
    betting_pool_invitations_user_idx
on public.betting_pool_invitations(invited_user_id);


drop trigger if exists
    betting_pool_invitations_set_updated_at
on public.betting_pool_invitations;


create trigger betting_pool_invitations_set_updated_at
before update on public.betting_pool_invitations
for each row
execute function public.set_updated_at();


-- ============================================================
-- 9. CONJUNTOS DE JOGOS SALVOS
-- ============================================================

create table if not exists public.saved_game_sets (
    id uuid primary key default gen_random_uuid(),

    owner_id uuid not null
        references auth.users(id)
        on delete cascade,

    lottery_id uuid not null
        references public.lotteries(id)
        on delete restrict,

    betting_pool_id uuid
        references public.betting_pools(id)
        on delete cascade,

    name text not null,

    description text,

    source_type text not null default 'manual'
        check (
            source_type in (
                'manual',
                'generated',
                'closure',
                'combination',
                'simulation',
                'imported'
            )
        ),

    universe_size integer,

    ticket_size integer not null
        check (ticket_size >= 1),

    guarantee_size integer,

    selected_numbers integer[],

    generation_parameters jsonb not null default '{}'::jsonb,

    ticket_count integer not null default 0
        check (ticket_count >= 0),

    active boolean not null default true,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    check (
        universe_size is null
        or universe_size >= ticket_size
    ),

    check (
        guarantee_size is null
        or guarantee_size >= 1
    ),

    check (
        guarantee_size is null
        or guarantee_size <= ticket_size
    )
);


create index if not exists
    saved_game_sets_owner_id_idx
on public.saved_game_sets(owner_id);


create index if not exists
    saved_game_sets_lottery_id_idx
on public.saved_game_sets(lottery_id);


create index if not exists
    saved_game_sets_pool_idx
on public.saved_game_sets(betting_pool_id);


create index if not exists
    saved_game_sets_created_at_idx
on public.saved_game_sets(created_at desc);


drop trigger if exists
    saved_game_sets_set_updated_at
on public.saved_game_sets;


create trigger saved_game_sets_set_updated_at
before update on public.saved_game_sets
for each row
execute function public.set_updated_at();


-- ============================================================
-- 10. CARTÕES DOS CONJUNTOS SALVOS
-- ============================================================

create table if not exists public.saved_game_tickets (
    id uuid primary key default gen_random_uuid(),

    game_set_id uuid not null
        references public.saved_game_sets(id)
        on delete cascade,

    ticket_order integer not null
        check (ticket_order >= 1),

    numbers integer[] not null,

    created_at timestamptz not null default now(),

    constraint saved_game_tickets_unique_order
        unique (game_set_id, ticket_order)
);


create index if not exists
    saved_game_tickets_game_set_idx
on public.saved_game_tickets(game_set_id);


-- ============================================================
-- 11. VALIDAR OS CARTÕES SALVOS
-- ============================================================

create or replace function public.validate_saved_game_ticket()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
    expected_ticket_size integer;
    numbers_count integer;
    distinct_numbers_count integer;
begin
    select game_set.ticket_size
      into expected_ticket_size
      from public.saved_game_sets game_set
     where game_set.id = new.game_set_id;

    if expected_ticket_size is null then
        raise exception
            'Conjunto de jogos não encontrado.';
    end if;

    numbers_count :=
        coalesce(array_length(new.numbers, 1), 0);

    select count(distinct number_value)
      into distinct_numbers_count
      from unnest(new.numbers) as number_value;

    if numbers_count <> expected_ticket_size then
        raise exception
            'O cartão deve possuir exatamente % números.',
            expected_ticket_size;
    end if;

    if distinct_numbers_count <> numbers_count then
        raise exception
            'O cartão possui números repetidos.';
    end if;

    if exists (
        select 1
          from unnest(new.numbers) as number_value
         where number_value < 1
    ) then
        raise exception
            'O cartão possui número menor que 1.';
    end if;

    return new;
end;
$$;


drop trigger if exists
    saved_game_tickets_validate
on public.saved_game_tickets;


create trigger saved_game_tickets_validate
before insert or update on public.saved_game_tickets
for each row
execute function public.validate_saved_game_ticket();


-- ============================================================
-- 12. ATUALIZAR AUTOMATICAMENTE A QUANTIDADE DE CARTÕES
-- ============================================================

create or replace function public.refresh_saved_game_ticket_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    affected_game_set_id uuid;
begin
    if tg_op = 'DELETE' then
        affected_game_set_id := old.game_set_id;
    else
        affected_game_set_id := new.game_set_id;
    end if;

    update public.saved_game_sets
       set ticket_count = (
           select count(*)
             from public.saved_game_tickets ticket
            where ticket.game_set_id = affected_game_set_id
       )
     where id = affected_game_set_id;

    if tg_op = 'DELETE' then
        return old;
    end if;

    return new;
end;
$$;


drop trigger if exists
    saved_game_tickets_refresh_count
on public.saved_game_tickets;


create trigger saved_game_tickets_refresh_count
after insert or update or delete
on public.saved_game_tickets
for each row
execute function public.refresh_saved_game_ticket_count();


-- ============================================================
-- 13. ATIVAR ROW LEVEL SECURITY
-- ============================================================

alter table public.user_subscriptions
enable row level security;

alter table public.betting_pools
enable row level security;

alter table public.betting_pool_members
enable row level security;

alter table public.betting_pool_invitations
enable row level security;

alter table public.saved_game_sets
enable row level security;

alter table public.saved_game_tickets
enable row level security;


-- ============================================================
-- 14. POLÍTICAS: ASSINATURAS
-- ============================================================

drop policy if exists
    "Users can view own subscription"
on public.user_subscriptions;


create policy
    "Users can view own subscription"
on public.user_subscriptions
for select
to authenticated
using (
    user_id = auth.uid()
);


-- Não existe política de insert/update/delete para usuários.
-- Assinaturas serão administradas pelo backend/service role.


-- ============================================================
-- 15. POLÍTICAS: BOLÕES
-- ============================================================

drop policy if exists
    "Members can view betting pools"
on public.betting_pools;


create policy
    "Members can view betting pools"
on public.betting_pools
for select
to authenticated
using (
    public.is_betting_pool_member(
        id,
        auth.uid()
    )
);


drop policy if exists
    "Subscribers can create betting pools"
on public.betting_pools;


create policy
    "Subscribers can create betting pools"
on public.betting_pools
for insert
to authenticated
with check (
    owner_id = auth.uid()
    and public.is_active_subscriber(auth.uid())
);


drop policy if exists
    "Subscribed managers can update betting pools"
on public.betting_pools;


create policy
    "Subscribed managers can update betting pools"
on public.betting_pools
for update
to authenticated
using (
    public.is_active_subscriber(auth.uid())
    and public.can_manage_betting_pool(
        id,
        auth.uid()
    )
)
with check (
    public.is_active_subscriber(auth.uid())
    and public.can_manage_betting_pool(
        id,
        auth.uid()
    )
);


drop policy if exists
    "Subscribed owners can delete betting pools"
on public.betting_pools;


create policy
    "Subscribed owners can delete betting pools"
on public.betting_pools
for delete
to authenticated
using (
    owner_id = auth.uid()
    and public.is_active_subscriber(auth.uid())
);


-- ============================================================
-- 16. POLÍTICAS: PARTICIPANTES
-- ============================================================

drop policy if exists
    "Members can view pool members"
on public.betting_pool_members;


create policy
    "Members can view pool members"
on public.betting_pool_members
for select
to authenticated
using (
    public.is_betting_pool_member(
        betting_pool_id,
        auth.uid()
    )
);


drop policy if exists
    "Subscribed managers can add members"
on public.betting_pool_members;


create policy
    "Subscribed managers can add members"
on public.betting_pool_members
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
    "Subscribed managers can update members"
on public.betting_pool_members;


create policy
    "Subscribed managers can update members"
on public.betting_pool_members
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
    "Subscribed managers can remove members"
on public.betting_pool_members;


create policy
    "Subscribed managers can remove members"
on public.betting_pool_members
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
-- 17. POLÍTICAS: CONVITES
-- ============================================================

drop policy if exists
    "Managers and invitees can view invitations"
on public.betting_pool_invitations;


create policy
    "Managers and invitees can view invitations"
on public.betting_pool_invitations
for select
to authenticated
using (
    public.can_manage_betting_pool(
        betting_pool_id,
        auth.uid()
    )
    or invited_user_id = auth.uid()
    or lower(invited_email) =
       lower(coalesce(auth.jwt() ->> 'email', ''))
);


drop policy if exists
    "Subscribed managers can create invitations"
on public.betting_pool_invitations;


create policy
    "Subscribed managers can create invitations"
on public.betting_pool_invitations
for insert
to authenticated
with check (
    invited_by = auth.uid()
    and public.is_active_subscriber(auth.uid())
    and public.can_manage_betting_pool(
        betting_pool_id,
        auth.uid()
    )
);


drop policy if exists
    "Managers and invitees can update invitations"
on public.betting_pool_invitations;


create policy
    "Managers and invitees can update invitations"
on public.betting_pool_invitations
for update
to authenticated
using (
    public.can_manage_betting_pool(
        betting_pool_id,
        auth.uid()
    )
    or invited_user_id = auth.uid()
    or lower(invited_email) =
       lower(coalesce(auth.jwt() ->> 'email', ''))
)
with check (
    public.can_manage_betting_pool(
        betting_pool_id,
        auth.uid()
    )
    or invited_user_id = auth.uid()
    or lower(invited_email) =
       lower(coalesce(auth.jwt() ->> 'email', ''))
);


drop policy if exists
    "Subscribed managers can delete invitations"
on public.betting_pool_invitations;


create policy
    "Subscribed managers can delete invitations"
on public.betting_pool_invitations
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
-- 18. POLÍTICAS: CONJUNTOS SALVOS
-- ============================================================

drop policy if exists
    "Users can view accessible saved game sets"
on public.saved_game_sets;


create policy
    "Users can view accessible saved game sets"
on public.saved_game_sets
for select
to authenticated
using (
    (
        betting_pool_id is null
        and owner_id = auth.uid()
    )
    or
    (
        betting_pool_id is not null
        and public.is_betting_pool_member(
            betting_pool_id,
            auth.uid()
        )
    )
);


drop policy if exists
    "Subscribers can save game sets"
on public.saved_game_sets;


create policy
    "Subscribers can save game sets"
on public.saved_game_sets
for insert
to authenticated
with check (
    owner_id = auth.uid()
    and public.is_active_subscriber(auth.uid())
    and (
        (
            betting_pool_id is null
        )
        or
        (
            betting_pool_id is not null
            and public.can_manage_betting_pool(
                betting_pool_id,
                auth.uid()
            )
        )
    )
);


drop policy if exists
    "Subscribers can update saved game sets"
on public.saved_game_sets;


create policy
    "Subscribers can update saved game sets"
on public.saved_game_sets
for update
to authenticated
using (
    public.is_active_subscriber(auth.uid())
    and (
        (
            betting_pool_id is null
            and owner_id = auth.uid()
        )
        or
        (
            betting_pool_id is not null
            and public.can_manage_betting_pool(
                betting_pool_id,
                auth.uid()
            )
        )
    )
)
with check (
    public.is_active_subscriber(auth.uid())
    and (
        (
            betting_pool_id is null
            and owner_id = auth.uid()
        )
        or
        (
            betting_pool_id is not null
            and public.can_manage_betting_pool(
                betting_pool_id,
                auth.uid()
            )
        )
    )
);


drop policy if exists
    "Subscribers can delete saved game sets"
on public.saved_game_sets;


create policy
    "Subscribers can delete saved game sets"
on public.saved_game_sets
for delete
to authenticated
using (
    public.is_active_subscriber(auth.uid())
    and (
        (
            betting_pool_id is null
            and owner_id = auth.uid()
        )
        or
        (
            betting_pool_id is not null
            and public.can_manage_betting_pool(
                betting_pool_id,
                auth.uid()
            )
        )
    )
);


-- ============================================================
-- 19. POLÍTICAS: CARTÕES SALVOS
-- ============================================================

drop policy if exists
    "Users can view accessible saved tickets"
on public.saved_game_tickets;


create policy
    "Users can view accessible saved tickets"
on public.saved_game_tickets
for select
to authenticated
using (
    exists (
        select 1
          from public.saved_game_sets game_set
         where game_set.id = game_set_id
           and (
               (
                   game_set.betting_pool_id is null
                   and game_set.owner_id = auth.uid()
               )
               or
               (
                   game_set.betting_pool_id is not null
                   and public.is_betting_pool_member(
                       game_set.betting_pool_id,
                       auth.uid()
                   )
               )
           )
    )
);


drop policy if exists
    "Subscribers can create saved tickets"
on public.saved_game_tickets;


create policy
    "Subscribers can create saved tickets"
on public.saved_game_tickets
for insert
to authenticated
with check (
    public.is_active_subscriber(auth.uid())
    and exists (
        select 1
          from public.saved_game_sets game_set
         where game_set.id = game_set_id
           and (
               (
                   game_set.betting_pool_id is null
                   and game_set.owner_id = auth.uid()
               )
               or
               (
                   game_set.betting_pool_id is not null
                   and public.can_manage_betting_pool(
                       game_set.betting_pool_id,
                       auth.uid()
                   )
               )
           )
    )
);


drop policy if exists
    "Subscribers can update saved tickets"
on public.saved_game_tickets;


create policy
    "Subscribers can update saved tickets"
on public.saved_game_tickets
for update
to authenticated
using (
    public.is_active_subscriber(auth.uid())
    and exists (
        select 1
          from public.saved_game_sets game_set
         where game_set.id = game_set_id
           and (
               (
                   game_set.betting_pool_id is null
                   and game_set.owner_id = auth.uid()
               )
               or
               (
                   game_set.betting_pool_id is not null
                   and public.can_manage_betting_pool(
                       game_set.betting_pool_id,
                       auth.uid()
                   )
               )
           )
    )
)
with check (
    public.is_active_subscriber(auth.uid())
    and exists (
        select 1
          from public.saved_game_sets game_set
         where game_set.id = game_set_id
           and (
               (
                   game_set.betting_pool_id is null
                   and game_set.owner_id = auth.uid()
               )
               or
               (
                   game_set.betting_pool_id is not null
                   and public.can_manage_betting_pool(
                       game_set.betting_pool_id,
                       auth.uid()
                   )
               )
           )
    )
);


drop policy if exists
    "Subscribers can delete saved tickets"
on public.saved_game_tickets;


create policy
    "Subscribers can delete saved tickets"
on public.saved_game_tickets
for delete
to authenticated
using (
    public.is_active_subscriber(auth.uid())
    and exists (
        select 1
          from public.saved_game_sets game_set
         where game_set.id = game_set_id
           and (
               (
                   game_set.betting_pool_id is null
                   and game_set.owner_id = auth.uid()
               )
               or
               (
                   game_set.betting_pool_id is not null
                   and public.can_manage_betting_pool(
                       game_set.betting_pool_id,
                       auth.uid()
                   )
               )
           )
    )
);