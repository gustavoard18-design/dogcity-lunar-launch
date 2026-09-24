-- Dono da carteira e progresso na nuvem.
--
-- A Edge Function `auth` confere uma assinatura BIP-322 da carteira (ou cria
-- uma sessão de convidado para endereços de convidado, que não são endereços
-- Bitcoin válidos) e grava aqui o hash do token de sessão. O jogo envia o token
-- em vez do endereço: pontuação, pedidos de baú e progresso salvo só valem
-- para a carteira dona da sessão.

create table if not exists public.wallet_sessions (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  address text not null check (char_length(address) between 10 and 100),
  kind text not null check (kind in ('wallet', 'guest')),
  ip_hash text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists wallet_sessions_address_idx on public.wallet_sessions (address);
create index if not exists wallet_sessions_ip_idx on public.wallet_sessions (ip_hash, created_at desc);
alter table public.wallet_sessions enable row level security;
revoke all on public.wallet_sessions from anon, authenticated;

-- Endereço e tipo da sessão do token (null se inválido ou vencido).
create or replace function public.session_of(p_token text)
returns table (address text, kind text)
language sql stable security definer set search_path = public as $$
  select s.address, s.kind from wallet_sessions s
  where p_token ~ '^[A-Za-z0-9_-]{32,128}$'
    and s.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    and s.expires_at > now()
$$;

-- Envio de voo com sessão: o endereço vem do token, não do jogo.
create or replace function public.submit_score_v3(
  p_token text, p_dog_name text, p_tier text, p_route text, p_score integer,
  p_title text default null, p_style text default null
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_address text;
begin
  select address into v_address from public.session_of(p_token);
  if v_address is null then
    raise exception 'sessão inválida';
  end if;
  return public.submit_score_v2(v_address, p_dog_name, p_tier, p_route, p_score, p_title, p_style);
end $$;

-- Progresso salvo na nuvem (só carteiras verificadas). A revisão sobe a cada
-- gravação no aparelho; a nuvem só aceita uma revisão maior que a guardada.
create table if not exists public.player_saves (
  address text primary key,
  profile jsonb not null,
  revision integer not null check (revision >= 0),
  updated_at timestamptz not null default now()
);
alter table public.player_saves enable row level security;
revoke all on public.player_saves from anon, authenticated;

create or replace function public.save_progress(p_token text, p_profile jsonb, p_revision integer)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_address text;
  v_kind text;
  v_rev integer;
begin
  select address, kind into v_address, v_kind from public.session_of(p_token);
  if v_address is null or v_kind <> 'wallet' then
    raise exception 'sessão inválida';
  end if;
  if jsonb_typeof(p_profile) <> 'object' or octet_length(p_profile::text) > 200000 or p_profile->>'address' is distinct from v_address then
    raise exception 'progresso inválido';
  end if;
  insert into player_saves as ps (address, profile, revision, updated_at)
  values (v_address, p_profile, greatest(p_revision, 0), now())
  on conflict (address) do update
    set profile = excluded.profile, revision = excluded.revision, updated_at = now()
    where ps.revision < excluded.revision;
  select revision into v_rev from player_saves where address = v_address;
  return v_rev;
end $$;

create or replace function public.load_progress(p_token text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_address text;
  v_kind text;
  v_row player_saves;
begin
  select address, kind into v_address, v_kind from public.session_of(p_token);
  if v_address is null or v_kind <> 'wallet' then
    raise exception 'sessão inválida';
  end if;
  select * into v_row from player_saves where address = v_address;
  if not found then
    return null;
  end if;
  return jsonb_build_object('profile', v_row.profile, 'revision', v_row.revision, 'updated_at', v_row.updated_at);
end $$;

revoke all on function public.session_of(text) from public, anon, authenticated;
grant execute on function public.session_of(text) to service_role;
revoke all on function public.submit_score_v3(text, text, text, text, integer, text, text) from public;
revoke all on function public.save_progress(text, jsonb, integer) from public;
revoke all on function public.load_progress(text) from public;
grant execute on function public.submit_score_v3(text, text, text, text, integer, text, text) to anon, authenticated;
grant execute on function public.save_progress(text, jsonb, integer) to anon, authenticated;
grant execute on function public.load_progress(text) to anon, authenticated;

-- Fecha o envio sem sessão: só o submit_score_v3 grava no ranking.
revoke execute on function public.submit_score(text, text, text, text, integer, text) from anon, authenticated;
revoke execute on function public.submit_score_v2(text, text, text, text, integer, text, text) from anon, authenticated;
