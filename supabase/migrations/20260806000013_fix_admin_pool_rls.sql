-- Autoriza de forma inequívoca a conta administrativa principal,
-- além de manter a autorização por perfil admin ou assinatura ativa.
create or replace function public.is_active_subscriber(
    requested_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
    select
        exists (
            select 1
              from auth.users account
             where account.id = requested_user_id
               and lower(account.email) = lower('rivaldoruela@hotmail.com')
        )
        or exists (
            select 1
              from public.profiles profile
             where profile.id = requested_user_id
               and profile.role = 'admin'
               and profile.active = true
        )
        or exists (
            select 1
              from public.user_subscriptions subscription
             where subscription.user_id = requested_user_id
               and subscription.status in ('active', 'trialing')
               and (subscription.expires_at is null or subscription.expires_at > now())
        );
$$;

drop policy if exists "Subscribers can create betting pools" on public.betting_pools;
create policy "Subscribers can create betting pools"
on public.betting_pools
for insert
to authenticated
with check (
    owner_id = auth.uid()
    and public.is_active_subscriber(auth.uid())
);
