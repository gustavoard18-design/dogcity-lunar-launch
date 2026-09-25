// Edge Function: DOG que aparece no voo.
//
// GET  ?address=X                          prêmio acumulado, últimos prêmios e os da carteira
// POST { action: 'start', token, routeId } bilhete do voo; às vezes com uma moeda de DOG
// POST { action: 'claim', token, ticketId } fim do voo com a moeda pega: registra o prêmio
//
// O sorteio acontece aqui, na decolagem, e o valor fica reservado no prêmio
// acumulado até o bilhete vencer. Só carteiras verificadas (sessão da função
// `auth`) concorrem, com limite de voos por dia e de prêmios por semana.
// O resgate (função SQL claim_dog_drop, atômica por carteira) só vale com o voo
// concluído: score da mesma rota enviado depois da decolagem, com qualidade
// mínima, e o tempo do voo da rota.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { TOKEN_RE } from '../_shared/auth-rules.ts';
import { windowStarts } from '../_shared/chest-rules.ts';
import { DROPS, dropPoint, minFlightSecondsFor, rollDrop } from '../_shared/drop-rules.ts';

const ADDRESS_RE = /^(bc1[a-z0-9]{25,90}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/;
const UUID_RE = /^[0-9a-f-]{36}$/;
const ROUTE_RE = /^[a-z0-9-]{1,40}$/;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const TTL_MS = DROPS.ticketTtlMinutes * 60 * 1000;

async function sessionAddress(db: any, token: unknown): Promise<string | null> {
  const t = String(token ?? '');
  if (!TOKEN_RE.test(t)) return null;
  const { data } = await db.rpc('session_of', { p_token: t });
  const row = Array.isArray(data) ? data[0] : data;
  return row?.kind === 'wallet' ? String(row.address) : null;
}

async function poolState(db: any) {
  const { data, error } = await db.rpc('jackpot_state', { p_share: DROPS.poolShare, p_ttl_minutes: DROPS.ticketTtlMinutes });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    poolDog: Number(row?.pool_dog ?? 0),
    awardedDog: Number(row?.awarded_dog ?? 0),
    paidDog: Number(row?.paid_dog ?? 0),
    drops: Number(row?.drops ?? 0),
  };
}

async function dropsThisWeek(db: any, address: string) {
  const { weekStart } = windowStarts();
  const { count } = await db
    .from('dog_drops')
    .select('id', { count: 'exact', head: true })
    .eq('address', address)
    .neq('status', 'cancelled')
    .gte('created_at', new Date(weekStart).toISOString());
  return count ?? 0;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    if (req.method === 'GET') {
      const address = new URL(req.url).searchParams.get('address')?.trim() ?? '';
      const pool = await poolState(db);
      const { data: recent } = await db.rpc('recent_dog_drops', { p_limit: 10 });
      let mine: unknown[] = [];
      if (ADDRESS_RE.test(address)) {
        const { data } = await db
          .from('dog_drops')
          .select('id, amount_dog, status, txid, created_at, paid_at')
          .eq('address', address)
          .order('created_at', { ascending: false })
          .limit(20);
        mine = data ?? [];
      }
      return json({ ...pool, rules: DROPS, recent: recent ?? [], mine });
    }

    if (req.method !== 'POST') return json({ error: 'método não aceito' }, 405);
    const body = await req.json().catch(() => ({}));
    const owner = await sessionAddress(db, body.token);
    if (!owner) return json({ error: 'sessão inválida' }, 401);

    if (body.action === 'start') {
      const routeId = String(body.routeId ?? '');
      if (!ROUTE_RE.test(routeId)) return json({ error: 'rota inválida' }, 400);
      const { dayStart } = windowStarts();
      // Bilhetes vencidos liberam o valor reservado.
      await db
        .from('flight_tickets')
        .update({ status: 'expired' })
        .eq('status', 'open')
        .lt('created_at', new Date(Date.now() - TTL_MS).toISOString());
      const { count: today } = await db
        .from('flight_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('address', owner)
        .gte('created_at', new Date(dayStart).toISOString());
      // Uma moeda aberta por vez: não sorteia outra enquanto um bilhete com moeda estiver valendo.
      const { count: openDrops } = await db
        .from('flight_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('address', owner)
        .eq('status', 'open')
        .not('drop_dog', 'is', null)
        .gte('created_at', new Date(Date.now() - TTL_MS).toISOString());
      let drop: number | null = null;
      if ((today ?? 0) < DROPS.eligibleFlightsPerDay && !openDrops && (await dropsThisWeek(db, owner)) < DROPS.dropsPerWalletPerWeek) {
        drop = rollDrop((await poolState(db)).poolDog);
      }
      const { data: ticket, error } = await db.from('flight_tickets').insert({ address: owner, route_id: routeId, drop_dog: drop }).select('id').single();
      if (error) throw error;
      return json({ ticketId: ticket.id, drop: drop ? { amount: drop, at: dropPoint() } : null });
    }

    if (body.action === 'claim') {
      const ticketId = String(body.ticketId ?? '');
      if (!UUID_RE.test(ticketId)) return json({ error: 'bilhete inválido' }, 400);
      const { data: ticket } = await db.from('flight_tickets').select('route_id').eq('id', ticketId).maybeSingle();
      if (!ticket) return json({ error: 'bilhete sem prêmio' }, 404);
      const { data, error } = await db.rpc('claim_dog_drop', {
        p_ticket: ticketId,
        p_address: owner,
        p_min_age_seconds: minFlightSecondsFor(ticket.route_id),
        p_min_quality: DROPS.minQuality,
        p_per_week: DROPS.dropsPerWalletPerWeek,
        p_ttl_minutes: DROPS.ticketTtlMinutes,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      switch (row?.code) {
        case 'ok':
          return json({ drop: { id: row.drop_id, amount_dog: row.amount_dog, status: row.status, created_at: row.created_at } });
        case 'too_early':
          return json({ error: 'voo curto demais' }, 425);
        case 'no_flight':
          // O score do voo pode ainda estar chegando: o jogo tenta de novo.
          return json({ error: 'voo não concluído' }, 425);
        case 'expired':
          return json({ error: 'bilhete vencido' }, 410);
        case 'week_limit':
          return json({ error: 'limite da semana' }, 429);
        default:
          return json({ error: 'bilhete sem prêmio' }, 404);
      }
    }

    return json({ error: 'ação desconhecida' }, 400);
  } catch (e) {
    console.error('[dog-drops]', e);
    return json({ error: 'erro interno' }, 500);
  }
});
