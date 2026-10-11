-- Relatório de métricas para o painel privado (public/metrics.html), lido pela
-- Edge Function `metrics` (protegida pela senha METRICS_KEY). Só o service role
-- executa: os eventos continuam inacessíveis pela chave pública.

create or replace function public.metrics_report(p_days integer default 30)
returns jsonb
language sql stable security definer set search_path = public as $$
  with params as (
    select least(greatest(p_days, 1), 180) as days,
           (now() at time zone 'America/Sao_Paulo')::date as today
  ),
  ev as (
    select e.*, (e.created_at at time zone 'America/Sao_Paulo')::date as d
    from analytics_events e, params
    where e.created_at > now() - make_interval(days => params.days)
  ),
  daily as (
    select coalesce(jsonb_agg(jsonb_build_object(
             'day', s.d, 'players', coalesce(x.players, 0), 'opens', coalesce(x.opens, 0),
             'starts', coalesce(x.starts, 0), 'completes', coalesce(x.completes, 0), 'lost', coalesce(x.lost, 0),
             'newPlayers', coalesce(n.novos, 0)) order by s.d), '[]'::jsonb) as v
    from params p
    cross join lateral generate_series(p.today - (p.days - 1), p.today, interval '1 day') as g(day)
    cross join lateral (select g.day::date as d) s
    left join (
      select d, count(distinct install_id) as players,
             count(*) filter (where event = 'app_open') as opens,
             count(*) filter (where event = 'flight_start') as starts,
             count(*) filter (where event = 'flight_complete') as completes,
             count(*) filter (where event = 'flight_lost') as lost
      from ev group by d
    ) x on x.d = s.d
    left join (
      select d0, count(*) as novos from (
        select install_id, min((created_at at time zone 'America/Sao_Paulo')::date) as d0 from analytics_events group by 1
      ) f group by d0
    ) n on n.d0 = s.d
  ),
  funnel as (
    select jsonb_build_object(
      'opened', count(distinct install_id) filter (where event = 'app_open'),
      'startedFlight', count(distinct install_id) filter (where event = 'flight_start'),
      'completedFlight', count(distinct install_id) filter (where event = 'flight_complete'),
      'connectedWallet', count(distinct install_id) filter (where event = 'wallet_connect' and props->>'wallet' <> 'guest'),
      'verifiedWallet', count(distinct install_id) filter (where event = 'wallet_verified'),
      'skippedTutorial', count(distinct install_id) filter (where event = 'tutorial_skip')
    ) as v from ev
  ),
  retention as (
    with first_day as (
      select install_id, min((created_at at time zone 'America/Sao_Paulo')::date) as d0 from analytics_events group by 1
    ),
    days as (
      select distinct install_id, (created_at at time zone 'America/Sao_Paulo')::date as d from analytics_events
    )
    select coalesce(jsonb_agg(jsonb_build_object('cohort', c.d0, 'new', c.n, 'd1', c.d1, 'd7', c.d7) order by c.d0 desc), '[]'::jsonb) as v
    from (
      select f.d0, count(*) as n,
             count(*) filter (where exists (select 1 from days x where x.install_id = f.install_id and x.d = f.d0 + 1)) as d1,
             count(*) filter (where exists (select 1 from days x where x.install_id = f.install_id and x.d between f.d0 + 1 and f.d0 + 7)) as d7
      from first_day f, params p
      where f.d0 > p.today - p.days
      group by f.d0
    ) c
  ),
  routes as (
    select coalesce(jsonb_agg(r order by (r->>'starts')::int desc), '[]'::jsonb) as v from (
      select jsonb_build_object(
        'route', props->>'route',
        'starts', count(*) filter (where event = 'flight_start'),
        'completes', count(*) filter (where event = 'flight_complete'),
        'lost', count(*) filter (where event = 'flight_lost'),
        'avgLostScore', round(avg((props->>'score')::numeric) filter (where event = 'flight_lost'), 0)
      ) as r
      from ev where event in ('flight_start', 'flight_complete', 'flight_lost') and props ? 'route'
      group by props->>'route'
    ) t
  ),
  breakdown as (
    select jsonb_build_object(
      'languages', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select coalesce(props->>'lang', '?') k, count(distinct install_id) n from ev where event = 'app_open' group by 1) a),
      'wallets', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select coalesce(props->>'wallet', '?') k, count(distinct install_id) n from ev where event = 'wallet_connect' group by 1) a),
      'installedApp', (select count(distinct install_id) from ev where event = 'app_open' and props->>'installed' = 'true'),
      'growth', (select coalesce(jsonb_object_agg(event, n), '{}'::jsonb) from (select event, count(*) n from ev where event in ('share', 'challenge_created', 'challenge_opened', 'challenge_accepted', 'streak_claim', 'season_tier', 'chest_open', 'dog_drop') group by 1) a)
    ) as v
  ),
  totals as (
    select jsonb_build_object(
      'playersAllTime', (select count(distinct install_id) from analytics_events),
      'playersToday', (select count(distinct install_id) from ev, params where ev.d = params.today),
      'players7d', (select count(distinct install_id) from ev, params where ev.d > params.today - 7),
      'playersPeriod', (select count(distinct install_id) from ev),
      'flightsCompletedPeriod', (select count(*) from ev where event = 'flight_complete'),
      'rankedPilots', (select count(distinct address) from scores),
      'rankedFlights', (select count(*) from scores),
      'verifiedWallets', (select count(distinct address) from wallet_sessions where kind = 'wallet'),
      'cloudSaves', (select count(*) from player_saves)
    ) as v
  ),
  economy as (
    select jsonb_build_object(
      'chestOrders', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (select status, count(*) n from chest_orders group by 1) a),
      'chestsPaidByType', (select coalesce(jsonb_object_agg(chest_id, n), '{}'::jsonb) from (select chest_id, count(*) n from chest_orders where status = 'paid' group by 1) a),
      'dogRevenue', (select coalesce(sum(price_dog), 0) from chest_orders where status = 'paid'),
      'jackpot', (select to_jsonb(j) from public.jackpot_state(0.5, 15) j),
      'dogDrops', (select coalesce(jsonb_object_agg(status, jsonb_build_object('count', n, 'dog', s)), '{}'::jsonb) from (select status, count(*) n, sum(amount_dog) s from dog_drops group by 1) a)
    ) as v
  ),
  top as (
    select coalesce(jsonb_agg(jsonb_build_object(
             'name', w.dog_name, 'score', w.week_score, 'flights', w.total_launches,
             'wallet', exists (select 1 from wallet_sessions ws where ws.address = w.address and ws.kind = 'wallet'))), '[]'::jsonb) as v
    from public.weekly_leaderboard_v2(10) w
  )
  select jsonb_build_object(
    'generatedAt', now(),
    'days', (select days from params),
    'totals', (select v from totals),
    'daily', (select v from daily),
    'funnel', (select v from funnel),
    'retention', (select v from retention),
    'routes', (select v from routes),
    'breakdown', (select v from breakdown),
    'economy', (select v from economy),
    'topWeek', (select v from top)
  )
$$;

revoke all on function public.metrics_report(integer) from public, anon, authenticated;
grant execute on function public.metrics_report(integer) to service_role;
