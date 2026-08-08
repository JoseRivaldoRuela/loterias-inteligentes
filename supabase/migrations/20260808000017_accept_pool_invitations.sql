-- Vincula convites pendentes ao usuário autenticado pelo endereço de e-mail.
create or replace function public.accept_my_betting_pool_invitations()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  accepted_count integer := 0;
begin
  if current_user_id is null or current_email = '' then return 0; end if;

  with accepted as (
    update public.betting_pool_invitations invitation
       set invited_user_id = current_user_id,
           status = 'accepted',
           accepted_at = coalesce(invitation.accepted_at, now()),
           updated_at = now()
     where lower(invitation.invited_email) = current_email
       and invitation.status in ('pending', 'accepted')
       and (invitation.status = 'accepted' or invitation.expires_at > now())
       and (invitation.invited_user_id is null or invitation.invited_user_id = current_user_id)
    returning invitation.betting_pool_id, invitation.role, invitation.share_count
  ), inserted as (
    insert into public.betting_pool_members (
      betting_pool_id, user_id, role, status, share_count, joined_at
    )
    select betting_pool_id, current_user_id, role, 'accepted', share_count, now()
      from accepted
    on conflict (betting_pool_id, user_id) do update
      set role = excluded.role,
          status = 'accepted',
          share_count = excluded.share_count,
          joined_at = coalesce(public.betting_pool_members.joined_at, now())
    returning 1
  )
  select count(*) into accepted_count from inserted;

  return accepted_count;
end;
$$;

revoke all on function public.accept_my_betting_pool_invitations() from public;
grant execute on function public.accept_my_betting_pool_invitations() to authenticated;
