-- Baús pagos com DOG. Um pedido reserva a vaga do limite (1 por dia, 5 por
-- semana), o jogador paga em DOG para a tesouraria e a Edge Function `chests`
-- confere o pagamento on-chain (DogData), sorteia o conteúdo e marca como pago.
-- Só a função (service role) lê e escreve aqui.
create table if not exists public.chest_orders (
  id uuid primary key default gen_random_uuid(),
  address text not null check (address ~ '^(bc1[a-z0-9]{25,90}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$'),
  chest_id text not null check (chest_id ~ '^[a-z0-9_]{1,24}$'),
  price_dog numeric not null check (price_dog > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  txid text unique check (txid is null or txid ~ '^[0-9a-f]{64}$'),
  reward jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists chest_orders_address_idx on public.chest_orders (address, created_at desc);
-- No máximo um pedido aberto (não pago) por carteira.
create unique index if not exists chest_orders_one_pending on public.chest_orders (address) where status = 'pending';
alter table public.chest_orders enable row level security;
revoke all on public.chest_orders from anon, authenticated;
