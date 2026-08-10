-- O criador sempre administra o bolão, mas só participa se receber cotas.
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
        0,
        now()
    )
    on conflict (betting_pool_id, user_id)
    do update set
        role = 'owner',
        status = 'accepted',
        joined_at = coalesce(public.betting_pool_members.joined_at, now());

    return new;
end;
$$;
