-- Permite que um conjunto contenha cartões de tamanhos diferentes, desde que
-- cada cartão respeite os limites configurados para sua loteria.
create or replace function public.validate_saved_game_ticket()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  minimum_ticket_size integer;
  maximum_ticket_size integer;
  available_number_count integer;
  numbers_count integer;
  distinct_numbers_count integer;
begin
  select lottery.minimum_bet, lottery.maximum_bet, lottery.available_numbers
    into minimum_ticket_size, maximum_ticket_size, available_number_count
    from public.saved_game_sets game_set
    join public.lotteries lottery on lottery.id = game_set.lottery_id
   where game_set.id = new.game_set_id;

  if minimum_ticket_size is null then
    raise exception 'Conjunto de jogos não encontrado.';
  end if;

  numbers_count := coalesce(array_length(new.numbers, 1), 0);
  select count(distinct number_value)
    into distinct_numbers_count
    from unnest(new.numbers) as number_value;

  if numbers_count < minimum_ticket_size or numbers_count > maximum_ticket_size then
    raise exception 'O cartão deve possuir entre % e % números.', minimum_ticket_size, maximum_ticket_size;
  end if;
  if distinct_numbers_count <> numbers_count then
    raise exception 'O cartão possui números repetidos.';
  end if;
  if exists (
    select 1 from unnest(new.numbers) as number_value
     where number_value < 1 or number_value > available_number_count
  ) then
    raise exception 'O cartão possui número fora do intervalo permitido.';
  end if;

  return new;
end;
$$;
