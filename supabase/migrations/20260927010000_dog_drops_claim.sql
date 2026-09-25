-- DOG no voo, resgate seguro:
-- 1. A moeda só vale com voo concluído: precisa existir um score da mesma
--    carteira, na mesma rota, enviado depois da decolagem (bilhete), com
--    qualidade mínima, e o bilhete precisa ter a idade mínima do voo da rota.
-- 2. Limite de prêmios por semana atômico: um lock por carteira impede que dois
--    resgates em paralelo passem juntos pela checagem.
-- Chamada só pela Edge Function `dog-drops` (service role).

create or replace function public.claim_dog_drop(
  p_ticket uuid,
  p_address text,
  p_min_age_seconds integer,
  p_min_quality numeric,
  p_per_week integer,
  p_ttl_minutes integer
) returns table (code text, drop_id uuid, amount_dog numeric, status text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  t flight_tickets%rowtype;
  v_max integer;
  v_week integer;
  v_drop dog_drops%rowtype;
begin
  -- Um resgate por vez para cada carteira (vale até o fim da transação).
  perform pg_advisory_xact_lock(hashtext('dog_drop:' || p_address));

  select * into t from flight_tickets where id = p_ticket for update;
  if not found or t.address <> p_address or t.drop_dog is null then
    return query select 'no_prize'::text, null::uuid, null::numeric, null::text, null::timestamptz;
    return;
  end if;

  if t.status = 'claimed' then
    return query select 'ok'::text, d.id, d.amount_dog, d.status, d.created_at from dog_drops d where d.ticket_id = p_ticket;
    return;
  end if;

  if t.status <> 'open' or t.created_at < now() - make_interval(mins => least(greatest(p_ttl_minutes, 1), 120)) then
    return query select 'expired'::text, null::uuid, null::numeric, null::text, null::timestamptz;
    return;
  end if;

  if t.created_at > now() - make_interval(secs => greatest(p_min_age_seconds, 1)) then
    return query select 'too_early'::text, null::uuid, null::numeric, null::text, null::timestamptz;
    return;
  end if;

  -- Voo concluído: score da mesma rota depois da decolagem, com qualidade mínima.
  v_max := public.route_max_score(t.route_id);
  if v_max is null or not exists (
    select 1 from scores s
    where s.address = p_address and s.route_id = t.route_id and s.created_at > t.created_at
      and s.score >= ceil(v_max * least(greatest(p_min_quality, 0), 1))
  ) then
    return query select 'no_flight'::text, null::uuid, null::numeric, null::text, null::timestamptz;
    return;
  end if;

  select count(*) into v_week from dog_drops d
  where d.address = p_address and d.status <> 'cancelled' and d.created_at >= public.week_start(0);
  if v_week >= greatest(p_per_week, 0) then
    return query select 'week_limit'::text, null::uuid, null::numeric, null::text, null::timestamptz;
    return;
  end if;

  update flight_tickets set status = 'claimed', claimed_at = now() where id = p_ticket;
  insert into dog_drops (ticket_id, address, amount_dog) values (p_ticket, p_address, t.drop_dog) returning * into v_drop;
  return query select 'ok'::text, v_drop.id, v_drop.amount_dog, v_drop.status, v_drop.created_at;
end $$;

revoke all on function public.claim_dog_drop(uuid, text, integer, numeric, integer, integer) from public, anon, authenticated;
grant execute on function public.claim_dog_drop(uuid, text, integer, numeric, integer, integer) to service_role;
