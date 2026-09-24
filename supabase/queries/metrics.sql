-- Consultas das métricas do jogo (cole no SQL Editor do Supabase).
-- Eventos: app_open, first_flight, flight_start, flight_complete, flight_lost,
-- flight_aborted, tutorial_skip, share, challenge_created, challenge_opened,
-- challenge_accepted, challenge_result, wallet_connect, streak_claim,
-- season_tier, chest_open.

-- 1. Jogadores por dia (navegadores distintos) nos últimos 30 dias
select date_trunc('day', created_at at time zone 'America/Sao_Paulo')::date as dia,
       count(distinct install_id) as jogadores,
       count(*) filter (where event = 'flight_complete') as voos_concluidos
from analytics_events
where created_at > now() - interval '30 days'
group by 1 order by 1 desc;

-- 2. Retorno no dia seguinte (D1): de quem apareceu pela primeira vez no dia X,
--    quantos voltaram no dia X+1
with first_day as (
  select install_id, min((created_at at time zone 'America/Sao_Paulo')::date) as d0
  from analytics_events group by 1
),
days as (
  select distinct install_id, (created_at at time zone 'America/Sao_Paulo')::date as d
  from analytics_events
)
select f.d0 as coorte,
       count(*) as novos,
       count(*) filter (where exists (select 1 from days x where x.install_id = f.install_id and x.d = f.d0 + 1)) as voltaram_d1,
       round(100.0 * count(*) filter (where exists (select 1 from days x where x.install_id = f.install_id and x.d = f.d0 + 1)) / count(*), 1) as d1_pct
from first_day f
where f.d0 > current_date - 30
group by 1 order by 1 desc;

-- 3. Funil do primeiro voo: abriu → começou um voo → concluiu um voo
select count(distinct install_id) filter (where event = 'app_open') as abriram,
       count(distinct install_id) filter (where event = 'flight_start') as comecaram_voo,
       count(distinct install_id) filter (where event = 'flight_complete') as concluiram_voo,
       count(distinct install_id) filter (where event = 'tutorial_skip') as pularam_tutorial
from analytics_events
where created_at > now() - interval '30 days';

-- 4. Onde a nave é perdida (rota, score e batidas médias)
select props->>'route' as rota,
       count(*) as naves_perdidas,
       round(avg((props->>'score')::numeric), 0) as score_medio,
       round(avg((props->>'hits')::numeric), 1) as batidas_medias
from analytics_events
where event = 'flight_lost' and created_at > now() - interval '30 days'
group by 1 order by 2 desc;

-- 5. Crescimento: compartilhamentos e desafios
select event, count(*) as total, count(distinct install_id) as jogadores
from analytics_events
where event in ('share', 'challenge_created', 'challenge_opened', 'challenge_accepted') and created_at > now() - interval '30 days'
group by 1 order by 2 desc;

-- 6. Idiomas e carteiras
select props->>'lang' as idioma, count(distinct install_id) as jogadores
from analytics_events where event = 'app_open' and created_at > now() - interval '30 days'
group by 1 order by 2 desc;

select props->>'wallet' as carteira, count(distinct install_id) as jogadores
from analytics_events where event = 'wallet_connect' and created_at > now() - interval '30 days'
group by 1 order by 2 desc;
