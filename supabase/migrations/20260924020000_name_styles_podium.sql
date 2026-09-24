-- Molduras de nome no ranking e pódio (top 3) do evento semanal.
-- Só cria funções novas (v2) e uma coluna: as funções antigas continuam
-- valendo para quem estiver com a versão anterior do jogo aberta.

alter table public.scores add column if not exists style text
  check (style is null or style ~ '^[a-z0-9_]{1,24}$');

create or replace function public.submit_score_v2(
  p_address text, p_dog_name text, p_tier text, p_route text, p_score integer,
  p_title text default null, p_style text default null
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
  if p_style is not null and p_style !~ '^[a-z0-9_]{1,24}$' then
    raise exception 'moldura inválida';
  end if;
  -- Um voo leva no mínimo ~20 s: recusa envios em sequência rápida.
  select max(created_at) into v_last from scores where address = p_address;
  if v_last is not null and v_last > now() - interval '20 seconds' then
    raise exception 'envios muito rápidos';
  end if;
  insert into scores (address, dog_name, tier, route_id, score, title, style)
  values (p_address, left(p_dog_name, 40), p_tier, p_route, p_score, p_title, p_style);
  return true;
end $$;

-- Início (horário de Brasília) da semana atual menos `p_weeks_ago` semanas.
create or replace function public.week_start(p_weeks_ago integer default 0) returns timestamptz
language sql stable as $$
  select (date_trunc('week', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo')
         - make_interval(weeks => greatest(p_weeks_ago, 0))
$$;

create or replace function public.weekly_leaderboard_v2(p_limit integer default 20)
returns table (address text, dog_name text, tier text, title text, style text, week_score integer, best_score integer, total_launches bigint)
language sql stable security definer set search_path = public as $$
  with w as (
    select s.address, max(s.score) as week_score
    from scores s where s.created_at >= public.week_start(0)
    group by s.address
  ),
  latest as (
    select distinct on (address) address, dog_name, tier, title, style from scores order by address, created_at desc
  ),
  totals as (
    select address, max(score) as best_score, count(*) as total_launches from scores group by address
  )
  select w.address, l.dog_name, l.tier, l.title, l.style, w.week_score, t.best_score, t.total_launches
  from w join latest l using (address) join totals t using (address)
  order by w.week_score desc, t.total_launches asc
  limit least(greatest(p_limit, 1), 100)
$$;

-- Ranking da rota do evento numa semana (0 = atual, 1 = passada...).
create or replace function public.event_leaderboard_v2(p_route text, p_weeks_ago integer default 0, p_limit integer default 20)
returns table (address text, dog_name text, tier text, title text, style text, week_score integer, total_launches bigint)
language sql stable security definer set search_path = public as $$
  with e as (
    select s.address, max(s.score) as week_score, count(*) as total_launches, min(s.created_at) as first_at
    from scores s
    where s.route_id = p_route
      and s.created_at >= public.week_start(p_weeks_ago)
      and s.created_at < public.week_start(p_weeks_ago) + interval '7 days'
    group by s.address
  ),
  latest as (
    select distinct on (address) address, dog_name, tier, title, style from scores order by address, created_at desc
  )
  select e.address, l.dog_name, l.tier, l.title, l.style, e.week_score, e.total_launches
  from e join latest l using (address)
  order by e.week_score desc, e.first_at asc
  limit least(greatest(p_limit, 1), 100)
$$;

revoke all on function public.submit_score_v2(text, text, text, text, integer, text, text) from public;
revoke all on function public.weekly_leaderboard_v2(integer) from public;
revoke all on function public.event_leaderboard_v2(text, integer, integer) from public;
grant execute on function public.submit_score_v2(text, text, text, text, integer, text, text) to anon, authenticated;
grant execute on function public.weekly_leaderboard_v2(integer) to anon, authenticated;
grant execute on function public.event_leaderboard_v2(text, integer, integer) to anon, authenticated;
