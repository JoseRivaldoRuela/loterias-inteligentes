-- Assinantes ativos e administradores ativos podem gerenciar recursos premium.
create or replace function public.is_active_subscriber(
    requested_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select
        exists (
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
               and (
                   subscription.expires_at is null
                   or subscription.expires_at > now()
               )
        );
$$;
