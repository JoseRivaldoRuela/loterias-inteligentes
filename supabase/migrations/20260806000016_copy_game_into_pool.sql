-- Um jogo pode originar vários bolões. O original permanece na biblioteca
-- pessoal e uma cópia completa é criada na biblioteca de cada bolão.
create or replace function public.create_betting_pool_with_participants(
 requested_lottery_id uuid, requested_game_set_id uuid, requested_name text,
 requested_description text, requested_status text, requested_first_contest integer,
 requested_last_contest integer, requested_total_shares integer,
 creator_participates boolean, requested_participants jsonb default '[]'::jsonb
)
returns public.betting_pools language plpgsql security definer set search_path = public, auth as $$
declare
 current_user_id uuid := auth.uid(); created_pool public.betting_pools;
 participant jsonb; allocated_shares integer := case when creator_participates then 1 else 0 end;
 participant_email text; pool_library_id uuid; copied_game_set_id uuid;
begin
 if current_user_id is null then raise exception 'Usuário não autenticado.'; end if;
 if not public.is_active_subscriber(current_user_id) then raise exception 'Sua conta não possui permissão para criar bolões.'; end if;
 if requested_total_shares < 1 then raise exception 'O bolão deve possuir pelo menos uma cota.'; end if;
 if requested_status not in ('draft', 'active') then raise exception 'Situação inválida.'; end if;
 if requested_first_contest is not null and requested_last_contest is not null and requested_last_contest < requested_first_contest then raise exception 'Intervalo de concursos inválido.'; end if;
 if not exists (select 1 from public.saved_game_sets game where game.id = requested_game_set_id and game.owner_id = current_user_id and game.lottery_id = requested_lottery_id and game.active = true) then raise exception 'Jogo indisponível para este bolão.'; end if;
 for participant in select value from jsonb_array_elements(coalesce(requested_participants, '[]'::jsonb)) loop
   allocated_shares := allocated_shares + greatest(1, coalesce((participant ->> 'shareCount')::integer, 1));
   if length(trim(coalesce(participant ->> 'name', ''))) < 2 then raise exception 'Informe o nome de cada participante.'; end if;
 end loop;
 if allocated_shares > requested_total_shares then raise exception 'A soma das cotas distribuídas excede o total do bolão.'; end if;

 insert into public.betting_pools (owner_id, lottery_id, name, description, status, total_shares, first_contest_number, last_contest_number)
 values (current_user_id, requested_lottery_id, trim(requested_name), nullif(trim(requested_description), ''), requested_status, requested_total_shares, requested_first_contest, requested_last_contest)
 returning * into created_pool;
 update public.betting_pool_members set share_count = case when creator_participates then 1 else 0 end where betting_pool_id = created_pool.id and user_id = current_user_id;
 pool_library_id := public.ensure_betting_pool_default_library(created_pool.id);

 insert into public.saved_game_sets (
   owner_id, lottery_id, betting_pool_id, library_id, name, description,
   source_type, universe_size, ticket_size, guarantee_size, selected_numbers,
   generation_parameters, ticket_count, active
 )
 select owner_id, lottery_id, created_pool.id, pool_library_id, name, description,
   source_type, universe_size, ticket_size, guarantee_size, selected_numbers,
   generation_parameters, 0, active
 from public.saved_game_sets where id = requested_game_set_id
 returning id into copied_game_set_id;

 insert into public.saved_game_tickets (game_set_id, ticket_order, numbers)
 select copied_game_set_id, ticket_order, numbers
 from public.saved_game_tickets where game_set_id = requested_game_set_id
 order by ticket_order;

 for participant in select value from jsonb_array_elements(coalesce(requested_participants, '[]'::jsonb)) loop
   participant_email := nullif(lower(trim(coalesce(participant ->> 'email', ''))), '');
   insert into public.betting_pool_participants (betting_pool_id, name, email, phone, share_count, amount_due)
   values (created_pool.id, trim(participant ->> 'name'), participant_email, nullif(trim(coalesce(participant ->> 'phone', '')), ''), greatest(1, coalesce((participant ->> 'shareCount')::integer, 1)), 0);
   if participant_email is not null then
     insert into public.betting_pool_invitations (betting_pool_id, invited_by, invited_user_id, invited_email, role, share_count)
     values (created_pool.id, current_user_id, (select id from auth.users where lower(email) = participant_email limit 1), participant_email, 'member', greatest(1, coalesce((participant ->> 'shareCount')::integer, 1)));
   end if;
 end loop;
 return created_pool;
end;
$$;
