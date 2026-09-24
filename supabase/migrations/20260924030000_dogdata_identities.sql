-- Identidade DogData (handle e avatar Ordinal) de cada endereço, para o ranking
-- mostrar quem é quem sem perguntar ao DogData a cada abertura da aba.
-- Escrita só pela Edge Function dog-balance (service role); o cliente não lê direto.
create table if not exists public.dogdata_identities (
  address text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.dogdata_identities enable row level security;
revoke all on public.dogdata_identities from anon, authenticated;
