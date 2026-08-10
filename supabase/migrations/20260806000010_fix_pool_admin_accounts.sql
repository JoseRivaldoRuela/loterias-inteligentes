-- Conta administrativa principal do projeto.
insert into public.profiles (id, name, role, active)
select
    account.id,
    coalesce(account.raw_user_meta_data ->> 'name', split_part(account.email, '@', 1)),
    'admin',
    true
from auth.users account
where lower(account.email) = lower('rivaldoruela@hotmail.com')
on conflict (id) do update
set
    role = 'admin',
    active = true,
    updated_at = now();

-- Interrompe a migração se alguma conta existente continuar sem autorização.
do $$
declare
    unauthorized_email text;
begin
    select account.email
      into unauthorized_email
      from auth.users account
     where lower(account.email) = lower('rivaldoruela@hotmail.com')
       and not public.is_active_subscriber(account.id)
     limit 1;

    if unauthorized_email is not null then
        raise exception 'Conta administrativa sem autorização: %', unauthorized_email;
    end if;
end;
$$;
