-- Ranking do evento semanal, títulos de piloto no ranking e o evento de Saturno.
-- O título é o id de uma conquista (ex.: 'route_mars'); o texto fica no jogo,
-- então o servidor só aceita um identificador curto, nunca texto livre.

create or replace function public.route_max_score(p_route text) returns integer
language sql immutable as $$
  select case p_route
    when 'low-orbit' then 100
    when 'sea-of-tranquility' then 250
    when 'asteroid-belt' then 500
    when 'mars-colony' then 1000
    when 'event-meteor-shower' then 400
    when 'event-saturn-rings' then 600
    when 'event-solar-storm' then 350
    when 'event-comet-hunt' then 550
    when 'event-mars-marathon' then 800
    else null
  end
$$;

alter table public.scores add column if not exists title text
  check (title is null or title ~ '^[a-z0-9_]{1,24}$');

-- submit_score ganha o título (opcional). Chamadas antigas com 5 argumentos continuam valendo.
drop function if exists public.submit_score(text, text, text, text, integer);
create or replace function public.submit_score(
  p_address text, p_dog_name text, p_tier text, p_route text, p_score integer, p_title text default null
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_max integer := public.route_max_score(p_route);
  v_last timestamptz;
begin
  if v_max is null or p_score is null or p_score < 0 or p_score > v_max then
    raise exception 'score inválido';
  end if;
  if p_title is not null and p_title !~ '^[a-z0-9_]{1,24}$' then
    raise exception 'título inválido';
  end if;
  -- Um voo leva no mínimo ~20 s: recusa envios em sequência rápida.
  select max(created_at) into v_last from scores where address = p_address;
  if v_last is not null and v_last > now() - interval '20 seconds' then
    raise exception 'envios muito rápidos';
  end if;
  insert into scores (address, dog_name, tier, route_id, score, title)
  values (p_address, left(p_dog_name, 40), p_tier, p_route, p_score, p_title);
  return true;
end $$;

-- Ranking geral passa a devolver o título mais recente de cada piloto.
drop function if exists public.weekly_leaderboard(integer);
create or replace function public.weekly_leaderboard(p_limit integer default 20)
returns table (address text, dog_name text, tier text, title text, week_score integer, best_score integer, total_launches bigint)
language sql stable security definer set search_path = public as $$
  with week as (
    select (date_trunc('week', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo') as start
  ),
  w as (
    select s.address, max(s.score) as week_score
    from scores s, week where s.created_at >= week.start
    group by s.address
  ),
  latest as (
    select distinct on (address) address, dog_name, tier, title from scores order by address, created_at desc
  ),
  totals as (
    select address, max(score) as best_score, count(*) as total_launches from scores group by address
  )
  select w.address, l.dog_name, l.tier, l.title, w.week_score, t.best_score, t.total_launches
  from w join latest l using (address) join totals t using (address)
  order by w.week_score desc, t.total_launches asc
  limit least(greatest(p_limit, 1), 100)
$$;

-- Melhor voo de cada piloto na rota do evento, só nesta semana.
create or replace function public.event_leaderboard(p_route text, p_limit integer default 20)
returns table (address text, dog_name text, tier text, title text, week_score integer, total_launches bigint)
language sql stable security definer set search_path = public as $$
  with week as (
    select (date_trunc('week', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo') as start
  ),
  e as (
    select s.address, max(s.score) as week_score, count(*) as total_launches
    from scores s, week
    where s.created_at >= week.start and s.route_id = p_route
    group by s.address
  ),
  latest as (
    select distinct on (address) address, dog_name, tier, title from scores order by address, created_at desc
  )
  select e.address, l.dog_name, l.tier, l.title, e.week_score, e.total_launches
  from e join latest l using (address)
  order by e.week_score desc, e.total_launches asc
  limit least(greatest(p_limit, 1), 100)
$$;

revoke all on function public.submit_score(text, text, text, text, integer, text) from public;
revoke all on function public.weekly_leaderboard(integer) from public;
revoke all on function public.event_leaderboard(text, integer) from public;
grant execute on function public.submit_score(text, text, text, text, integer, text) to anon, authenticated;
grant execute on function public.weekly_leaderboard(integer) to anon, authenticated;
grant execute on function public.event_leaderboard(text, integer) to anon, authenticated;
