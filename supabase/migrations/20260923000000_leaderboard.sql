-- Ranking online do DogCity Lunar Launch.
-- A tabela só é gravada pela função submit_score (validação no servidor);
-- a leitura pública é feita pela função weekly_leaderboard.

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  address text not null check (char_length(address) between 10 and 100),
  dog_name text not null check (char_length(dog_name) between 1 and 40),
  tier text not null check (tier in ('Stray', 'Explorer', 'Pioneer', 'Commander', 'Legend')),
  route_id text not null,
  score integer not null check (score >= 0),
  created_at timestamptz not null default now()
);
create index if not exists scores_week_idx on public.scores (created_at desc, score desc);
create index if not exists scores_address_idx on public.scores (address, created_at desc);

alter table public.scores enable row level security;
-- Sem políticas: ninguém lê nem grava a tabela direto pela API.
revoke all on public.scores from anon, authenticated;

-- Pontuação máxima de cada rota (espelha src/lib/economy.ts).
create or replace function public.route_max_score(p_route text) returns integer
language sql immutable as $$
  select case p_route
    when 'low-orbit' then 100
    when 'sea-of-tranquility' then 250
    when 'asteroid-belt' then 500
    when 'mars-colony' then 1000
    else null
  end
$$;

create or replace function public.submit_score(
  p_address text, p_dog_name text, p_tier text, p_route text, p_score integer
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_max integer := public.route_max_score(p_route);
  v_last timestamptz;
begin
  if v_max is null or p_score is null or p_score < 0 or p_score > v_max then
    raise exception 'score inválido';
  end if;
  -- Um voo leva no mínimo ~20 s: recusa envios em sequência rápida.
  select max(created_at) into v_last from scores where address = p_address;
  if v_last is not null and v_last > now() - interval '20 seconds' then
    raise exception 'envios muito rápidos';
  end if;
  insert into scores (address, dog_name, tier, route_id, score)
  values (p_address, left(p_dog_name, 40), p_tier, p_route, p_score);
  return true;
end $$;

-- Melhor voo de cada piloto na semana atual (segunda 00:00 UTC-3).
create or replace function public.weekly_leaderboard(p_limit integer default 20)
returns table (address text, dog_name text, tier text, week_score integer, best_score integer, total_launches bigint)
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
    select distinct on (address) address, dog_name, tier from scores order by address, created_at desc
  ),
  totals as (
    select address, max(score) as best_score, count(*) as total_launches from scores group by address
  )
  select w.address, l.dog_name, l.tier, w.week_score, t.best_score, t.total_launches
  from w join latest l using (address) join totals t using (address)
  order by w.week_score desc, t.total_launches asc
  limit least(greatest(p_limit, 1), 100)
$$;

revoke all on function public.submit_score(text, text, text, text, integer) from public;
revoke all on function public.weekly_leaderboard(integer) from public;
grant execute on function public.submit_score(text, text, text, text, integer) to anon, authenticated;
grant execute on function public.weekly_leaderboard(integer) to anon, authenticated;

-- Cache do saldo DOG (preenchido pela Edge Function dog-balance).
create table if not exists public.dog_balances (
  address text primary key,
  balance numeric not null,
  updated_at timestamptz not null default now()
);
alter table public.dog_balances enable row level security;
revoke all on public.dog_balances from anon, authenticated;
