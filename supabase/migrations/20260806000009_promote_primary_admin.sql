-- Garante o acesso administrativo da conta principal do projeto.
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
