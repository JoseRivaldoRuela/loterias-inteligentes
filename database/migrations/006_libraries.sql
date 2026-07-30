-- ============================================================
-- LOTERIAS INTELIGENTES
-- MIGRATION 006
--
-- Bibliotecas para organização de jogos salvos
-- ============================================================


-- ============================================================
-- 1. BIBLIOTECAS
-- ============================================================

create table if not exists public.libraries (
    id uuid primary key default gen_random_uuid(),

    owner_id uuid not null
        references auth.users(id)
        on delete cascade,

    betting_pool_id uuid
        references public.betting_pools(id)
        on delete cascade,

    name text not null,

    description text,

    library_type text not null default 'personal'
        check (
            library_type in (
                'personal',
                'betting_pool'
            )
        ),

    active boolean not null default true,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    check (
        (
            library_type = 'personal'
            and betting_pool_id is null
        )
        or
        (
            library_type = 'betting_pool'
            and betting_pool_id is not null
        )
    )
);


create index if not exists
    libraries_owner_id_idx
on public.libraries(owner_id);


create index if not exists
    libraries_betting_pool_id_idx
on public.libraries(betting_pool_id);


create index if not exists
    libraries_active_idx
on public.libraries(active);


create unique index if not exists
    libraries_unique_personal_name_idx
on public.libraries (
    owner_id,
    lower(name)
)
where betting_pool_id is null
  and active = true;


create unique index if not exists
    libraries_unique_pool_name_idx
on public.libraries (
    betting_pool_id,
    lower(name)
)
where betting_pool_id is not null
  and active = true;


drop trigger if exists
    libraries_set_updated_at
on public.libraries;


create trigger libraries_set_updated_at
before update on public.libraries
for each row
execute function public.set_updated_at();


-- ============================================================
-- 2. RELACIONAR JOGOS SALVOS À BIBLIOTECA
-- ============================================================

alter table public.saved_game_sets
add column if not exists library_id uuid
    references public.libraries(id)
    on delete set null;


create index if not exists
    saved_game_sets_library_id_idx
on public.saved_game_sets(library_id);


-- ============================================================
-- 3. VALIDAR A BIBLIOTECA DO JOGO SALVO
-- ============================================================

create or replace function public.validate_saved_game_set_library()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
    selected_library public.libraries%rowtype;
begin
    if new.library_id is null then
        return new;
    end if;

    select *
      into selected_library
      from public.libraries
     where id = new.library_id;

    if not found then
        raise exception
            'Biblioteca não encontrada.';
    end if;

    if selected_library.active is false then
        raise exception
            'A biblioteca informada está inativa.';
    end if;

    if new.betting_pool_id is null then
        if selected_library.library_type <> 'personal' then
            raise exception
                'Um jogo particular deve pertencer a uma biblioteca particular.';
        end if;

        if selected_library.betting_pool_id is not null then
            raise exception
                'A biblioteca informada pertence a um bolão.';
        end if;

        if selected_library.owner_id <> new.owner_id then
            raise exception
                'O proprietário do jogo é diferente do proprietário da biblioteca.';
        end if;
    else
        if selected_library.library_type <> 'betting_pool' then
            raise exception
                'Um jogo de bolão deve pertencer a uma biblioteca de bolão.';
        end if;

        if selected_library.betting_pool_id is distinct from new.betting_pool_id then
            raise exception
                'A biblioteca pertence a outro bolão.';
        end if;
    end if;

    return new;
end;
$$;


drop trigger if exists
    saved_game_sets_validate_library
on public.saved_game_sets;


create trigger saved_game_sets_validate_library
before insert or update of
    library_id,
    owner_id,
    betting_pool_id
on public.saved_game_sets
for each row
execute function public.validate_saved_game_set_library();


-- ============================================================
-- 4. CRIAR BIBLIOTECA PADRÃO PARTICULAR
-- ============================================================

create or replace function public.ensure_personal_default_library(
    requested_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    resulting_library_id uuid;
begin
    select library.id
      into resulting_library_id
      from public.libraries library
     where library.owner_id = requested_user_id
       and library.betting_pool_id is null
       and library.library_type = 'personal'
       and lower(library.name) = lower('Meus jogos')
       and library.active = true
     limit 1;

    if resulting_library_id is not null then
        return resulting_library_id;
    end if;

    insert into public.libraries (
        owner_id,
        betting_pool_id,
        name,
        description,
        library_type,
        active
    )
    values (
        requested_user_id,
        null,
        'Meus jogos',
        'Biblioteca padrão de jogos particulares.',
        'personal',
        true
    )
    returning id
         into resulting_library_id;

    return resulting_library_id;
end;
$$;


-- ============================================================
-- 5. CRIAR BIBLIOTECA PADRÃO DO BOLÃO
-- ============================================================

create or replace function public.ensure_betting_pool_default_library(
    requested_pool_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    selected_pool public.betting_pools%rowtype;
    resulting_library_id uuid;
begin
    select *
      into selected_pool
      from public.betting_pools
     where id = requested_pool_id;

    if not found then
        raise exception
            'Bolão não encontrado.';
    end if;

    select library.id
      into resulting_library_id
      from public.libraries library
     where library.betting_pool_id = requested_pool_id
       and library.library_type = 'betting_pool'
       and lower(library.name) = lower('Jogos do bolão')
       and library.active = true
     limit 1;

    if resulting_library_id is not null then
        return resulting_library_id;
    end if;

    insert into public.libraries (
        owner_id,
        betting_pool_id,
        name,
        description,
        library_type,
        active
    )
    values (
        selected_pool.owner_id,
        requested_pool_id,
        'Jogos do bolão',
        'Biblioteca padrão de jogos do bolão.',
        'betting_pool',
        true
    )
    returning id
         into resulting_library_id;

    return resulting_library_id;
end;
$$;


-- ============================================================
-- 6. CRIAR AUTOMATICAMENTE A BIBLIOTECA DO BOLÃO
-- ============================================================

create or replace function public.create_default_betting_pool_library()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    perform public.ensure_betting_pool_default_library(new.id);
    return new;
end;
$$;


drop trigger if exists
    betting_pools_create_default_library
on public.betting_pools;


create trigger betting_pools_create_default_library
after insert on public.betting_pools
for each row
execute function public.create_default_betting_pool_library();


-- ============================================================
-- 7. ATRIBUIR BIBLIOTECA PADRÃO AO SALVAR
-- ============================================================

create or replace function public.assign_default_library_to_saved_game_set()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.library_id is not null then
        return new;
    end if;

    if new.betting_pool_id is null then
        new.library_id :=
            public.ensure_personal_default_library(
                new.owner_id
            );
    else
        new.library_id :=
            public.ensure_betting_pool_default_library(
                new.betting_pool_id
            );
    end if;

    return new;
end;
$$;


drop trigger if exists
    saved_game_sets_assign_default_library
on public.saved_game_sets;


create trigger saved_game_sets_assign_default_library
before insert on public.saved_game_sets
for each row
execute function public.assign_default_library_to_saved_game_set();


-- ============================================================
-- 8. ATIVAR RLS
-- ============================================================

alter table public.libraries
enable row level security;


-- ============================================================
-- 9. POLÍTICAS DE LEITURA
-- ============================================================

drop policy if exists
    "Users can view accessible libraries"
on public.libraries;


create policy
    "Users can view accessible libraries"
on public.libraries
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


-- ============================================================
-- 10. POLÍTICAS DE CRIAÇÃO
-- ============================================================

drop policy if exists
    "Subscribers can create libraries"
on public.libraries;


create policy
    "Subscribers can create libraries"
on public.libraries
for insert
to authenticated
with check (
    owner_id = auth.uid()
    and public.is_active_subscriber(auth.uid())
    and (
        (
            betting_pool_id is null
            and library_type = 'personal'
        )
        or
        (
            betting_pool_id is not null
            and library_type = 'betting_pool'
            and public.can_manage_betting_pool(
                betting_pool_id,
                auth.uid()
            )
        )
    )
);


-- ============================================================
-- 11. POLÍTICAS DE ALTERAÇÃO
-- ============================================================

drop policy if exists
    "Subscribers can update libraries"
on public.libraries;


create policy
    "Subscribers can update libraries"
on public.libraries
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
            and library_type = 'personal'
        )
        or
        (
            betting_pool_id is not null
            and library_type = 'betting_pool'
            and public.can_manage_betting_pool(
                betting_pool_id,
                auth.uid()
            )
        )
    )
);


-- ============================================================
-- 12. POLÍTICAS DE EXCLUSÃO
-- ============================================================

drop policy if exists
    "Subscribers can delete libraries"
on public.libraries;


create policy
    "Subscribers can delete libraries"
on public.libraries
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