-- Crescimento: métricas anônimas de uso, guerra de distritos do DogCity e
-- ranking da temporada mensal. Só cria tabela e funções novas.

-- ── Métricas ────────────────────────────────────────────────────────────────
-- Eventos anônimos: um id aleatório por navegador, sem endereço de carteira.
create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  install_id text not null check (install_id ~ '^[a-z0-9]{16,40}$'),
  event text not null check (event ~ '^[a-z0-9_]{2,40}$'),
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists analytics_events_created_idx on public.analytics_events (created_at);
create index if not exists analytics_events_install_idx on public.analytics_events (install_id, created_at);
alter table public.analytics_events enable row level security;
revoke all on public.analytics_events from anon, authenticated;

create or replace function public.track_event(p_install text, p_event text, p_props jsonb default '{}'::jsonb)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if p_install !~ '^[a-z0-9]{16,40}$' or p_event !~ '^[a-z0-9_]{2,40}$' then
    return false;
  end if;
  if p_props is null or jsonb_typeof(p_props) <> 'object' or pg_column_size(p_props) > 1500 then
    p_props := '{}'::jsonb;
  end if;
  -- Freio contra laço: no máximo 60 eventos por minuto por navegador.
  if (select count(*) from analytics_events where install_id = p_install and created_at > now() - interval '1 minute') >= 60 then
    return false;
  end if;
  insert into analytics_events (install_id, event, props) values (p_install, p_event, p_props);
  return true;
end $$;

-- ── Guerra de distritos ─────────────────────────────────────────────────────
-- Soma, por distrito do DogCity, o melhor voo de cada piloto em cada rota na
-- semana (0 = atual, 1 = passada…). O distrito vem do cache do DogData
-- (dog_balances), então só conta carteira real que estava no snapshot.
create or replace function public.district_leaderboard(p_weeks_ago integer default 0, p_limit integer default 20)
returns table (district text, total_score bigint, pilots bigint, best_pilot_score bigint)
language sql stable security definer set search_path = public as $$
  with best as (
    select s.address, s.route_id, max(s.score) as score
    from scores s
    where s.created_at >= public.week_start(p_weeks_ago)
      and s.created_at < public.week_start(p_weeks_ago) + interval '7 days'
    group by s.address, s.route_id
  ),
  per_pilot as (
    select address, sum(score)::bigint as points from best group by address
  )
  select b.data->'dogcity'->>'district' as district,
         sum(p.points)::bigint as total_score,
         count(*)::bigint as pilots,
         max(p.points)::bigint as best_pilot_score
  from per_pilot p
  join dog_balances b on b.address = p.address
  where b.data->'dogcity'->>'status' = 'in_snapshot'
    and coalesce(b.data->'dogcity'->>'district', '') <> ''
  group by 1
  order by total_score desc, pilots desc
  limit least(greatest(p_limit, 1), 50)
$$;

-- ── Temporada mensal ────────────────────────────────────────────────────────
-- Início (horário de Brasília) do mês atual menos `p_months_ago` meses.
create or replace function public.season_start(p_months_ago integer default 0) returns timestamptz
language sql stable as $$
  select (date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo')
         - make_interval(months => greatest(p_months_ago, 0))
$$;

-- Pontos de temporada: 10 + score/10 por voo concluído (a mesma conta do jogo).
create or replace function public.season_leaderboard(p_limit integer default 20)
returns table (address text, dog_name text, tier text, title text, style text, season_points bigint, flights bigint)
language sql stable security definer set search_path = public as $$
  with m as (
    select s.address, sum(10 + s.score / 10)::bigint as season_points, count(*)::bigint as flights
    from scores s where s.created_at >= public.season_start(0)
    group by s.address
  ),
  latest as (
    select distinct on (address) address, dog_name, tier, title, style from scores order by address, created_at desc
  )
  select m.address, l.dog_name, l.tier, l.title, l.style, m.season_points, m.flights
  from m join latest l using (address)
  order by m.season_points desc, m.flights asc
  limit least(greatest(p_limit, 1), 100)
$$;

revoke all on function public.track_event(text, text, jsonb) from public;
revoke all on function public.district_leaderboard(integer, integer) from public;
revoke all on function public.season_leaderboard(integer) from public;
grant execute on function public.track_event(text, text, jsonb) to anon, authenticated;
grant execute on function public.district_leaderboard(integer, integer) to anon, authenticated;
grant execute on function public.season_leaderboard(integer) to anon, authenticated;
