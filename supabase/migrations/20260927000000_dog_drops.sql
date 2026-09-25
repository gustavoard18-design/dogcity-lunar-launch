-- DOG no voo: metade do valor dos baús pagos vira um prêmio acumulado, e voos
-- de carteiras verificadas têm uma chance baixa de ter uma moeda de DOG. A Edge
-- Function `dog-drops` sorteia na decolagem (bilhete do voo) e registra o
-- prêmio quando o piloto pega a moeda. O pagamento é feito pela carteira da
-- tesouraria e marcado aqui (status 'paid' e txid).

create table if not exists public.flight_tickets (
  id uuid primary key default gen_random_uuid(),
  address text not null check (char_length(address) between 10 and 100),
  route_id text not null check (route_id ~ '^[a-z0-9-]{1,40}$'),
  drop_dog numeric check (drop_dog is null or drop_dog > 0),
  status text not null default 'open' check (status in ('open', 'claimed', 'expired')),
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);
create index if not exists flight_tickets_address_idx on public.flight_tickets (address, created_at desc);
create index if not exists flight_tickets_open_drop_idx on public.flight_tickets (created_at) where status = 'open' and drop_dog is not null;
alter table public.flight_tickets enable row level security;
revoke all on public.flight_tickets from anon, authenticated;

create table if not exists public.dog_drops (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null unique references public.flight_tickets (id),
  address text not null,
  amount_dog numeric not null check (amount_dog > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  txid text unique check (txid is null or txid ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists dog_drops_address_idx on public.dog_drops (address, created_at desc);
alter table public.dog_drops enable row level security;
revoke all on public.dog_drops from anon, authenticated;

-- Prêmio acumulado: parte dos baús pagos, menos os prêmios já dados e os
-- reservados em voos ainda em andamento (bilhetes abertos há menos de p_ttl minutos).
create or replace function public.jackpot_state(p_share numeric default 0.5, p_ttl_minutes integer default 15)
returns table (pool_dog numeric, income_dog numeric, awarded_dog numeric, paid_dog numeric, reserved_dog numeric, drops bigint)
language sql stable security definer set search_path = public as $$
  with income as (
    select coalesce(sum(price_dog), 0) * least(greatest(p_share, 0), 1) as v from chest_orders where status = 'paid'
  ),
  awarded as (
    select coalesce(sum(amount_dog), 0) as v,
           coalesce(sum(amount_dog) filter (where status = 'paid'), 0) as paid,
           count(*) as n
    from dog_drops where status <> 'cancelled'
  ),
  reserved as (
    select coalesce(sum(drop_dog), 0) as v from flight_tickets
    where status = 'open' and drop_dog is not null
      and created_at > now() - make_interval(mins => least(greatest(p_ttl_minutes, 1), 120))
  )
  select greatest(income.v - awarded.v - reserved.v, 0), income.v, awarded.v, awarded.paid, reserved.v, awarded.n
  from income, awarded, reserved
$$;

-- Últimos prêmios, com o endereço encurtado.
create or replace function public.recent_dog_drops(p_limit integer default 10)
returns table (address text, amount_dog numeric, status text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select left(address, 6) || '…' || right(address, 4), amount_dog, status, created_at
  from dog_drops where status <> 'cancelled'
  order by created_at desc
  limit least(greatest(p_limit, 1), 50)
$$;

revoke all on function public.jackpot_state(numeric, integer) from public;
revoke all on function public.recent_dog_drops(integer) from public;
grant execute on function public.jackpot_state(numeric, integer) to anon, authenticated, service_role;
grant execute on function public.recent_dog_drops(integer) to anon, authenticated, service_role;
