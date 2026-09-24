// Edge Function: baús pagos com DOG.
//
// GET  ?address=X                         limites usados e pedidos recentes da carteira
// POST { action: 'order',  address, chestId }   reserva um baú (conta no limite)
// POST { action: 'claim',  orderId, txid }      confere o pagamento e sorteia o conteúdo
// POST { action: 'cancel', orderId }            cancela um pedido ainda não pago
//
// O pagamento é conferido no DogData (transação DOG já em bloco): a carteira do
// pedido enviou pelo menos o preço em DOG para a tesouraria, depois de criar o
// pedido, e o txid nunca foi usado. O sorteio acontece aqui, com as chances de
// _shared/chests.json (as mesmas que o jogo mostra).
import { createClient } from 'npm:@supabase/supabase-js@2';
import config from '../_shared/chests.json' with { type: 'json' };
import { type Chest, PENDING_HOLD_MS, checkPayment, countsForLimit, roll, windowStarts } from '../_shared/chest-rules.ts';

const DOGDATA = 'https://www.dogdata.xyz';
const ADDRESS_RE = /^(bc1[a-z0-9]{25,90}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/;
const TXID_RE = /^[0-9a-f]{64}$/;
const UUID_RE = /^[0-9a-f-]{36}$/;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const chestById = (id: string): Chest | undefined => config.chests.find(c => c.id === id);

async function usage(db: any, address: string) {
  const { dayStart, weekStart } = windowStarts();
  const { data, error } = await db
    .from('chest_orders')
    .select('id, chest_id, price_dog, status, txid, reward, created_at, paid_at')
    .eq('address', address)
    .gte('created_at', new Date(weekStart - PENDING_HOLD_MS).toISOString())
    .order('created_at', { ascending: false });
  if (error) throw error;
  const orders = (data ?? []) as any[];
  const counted = orders.filter(o => countsForLimit(o));
  return {
    orders,
    day: counted.filter(o => new Date(o.created_at).getTime() >= dayStart).length,
    week: counted.filter(o => new Date(o.created_at).getTime() >= weekStart).length,
  };
}

async function lookupTx(txid: string): Promise<any | null | 'unavailable'> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(`${DOGDATA}/api/dog-rune/search-tx?txid=${txid}`, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'DogCity-Lunar-Launch/1.0 (+https://gustavoard18-design.github.io/dogcity-lunar-launch/)' },
    });
    if (res.status === 404) return null; // ainda não indexada (sem confirmação)
    if (!res.ok) return 'unavailable';
    return await res.json();
  } catch {
    return 'unavailable';
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    if (req.method === 'GET') {
      const address = new URL(req.url).searchParams.get('address')?.trim() ?? '';
      if (!ADDRESS_RE.test(address)) return json({ error: 'endereço inválido' }, 400);
      const u = await usage(db, address);
      return json({ limits: { ...config.limits, usedToday: u.day, usedThisWeek: u.week }, orders: u.orders.slice(0, 10) });
    }

    if (req.method !== 'POST') return json({ error: 'método não aceito' }, 405);
    const body = await req.json().catch(() => ({}));

    if (body.action === 'order') {
      const address = String(body.address ?? '').trim();
      const chest = chestById(String(body.chestId ?? ''));
      if (!ADDRESS_RE.test(address) || !chest) return json({ error: 'pedido inválido' }, 400);
      // Pedido aberto antigo (mais de 24 h, sem pagamento enviado) deixa de segurar a vaga.
      await db
        .from('chest_orders')
        .update({ status: 'cancelled' })
        .eq('address', address)
        .eq('status', 'pending')
        .is('txid', null)
        .lt('created_at', new Date(Date.now() - PENDING_HOLD_MS).toISOString());
      const u = await usage(db, address);
      const open = u.orders.find(o => o.status === 'pending');
      if (open) return json({ error: 'pedido_aberto', order: open }, 409);
      if (u.day >= config.limits.perDay || u.week >= config.limits.perWeek) {
        return json({ error: 'limite', limits: { ...config.limits, usedToday: u.day, usedThisWeek: u.week } }, 429);
      }
      const { data, error } = await db.from('chest_orders').insert({ address, chest_id: chest.id, price_dog: chest.priceDog }).select().single();
      if (error) return json({ error: 'pedido_aberto' }, 409);
      return json({ order: data, treasury: config.treasury, rune: config.rune });
    }

    if (body.action === 'cancel') {
      const orderId = String(body.orderId ?? '');
      if (!UUID_RE.test(orderId)) return json({ error: 'pedido inválido' }, 400);
      await db.from('chest_orders').update({ status: 'cancelled' }).eq('id', orderId).eq('status', 'pending').is('txid', null);
      return json({ ok: true });
    }

    if (body.action === 'claim') {
      const orderId = String(body.orderId ?? '');
      const txid = String(body.txid ?? '').trim().toLowerCase();
      if (!UUID_RE.test(orderId) || !TXID_RE.test(txid)) return json({ error: 'dados inválidos' }, 400);
      const { data: order } = await db.from('chest_orders').select('*').eq('id', orderId).maybeSingle();
      if (!order) return json({ error: 'pedido não encontrado' }, 404);
      if (order.status === 'paid') {
        // Idempotente: repetir o mesmo txid devolve o mesmo prêmio.
        return order.txid === txid ? json({ status: 'paid', order }) : json({ error: 'pedido já pago com outra transação' }, 409);
      }
      const { data: used } = await db.from('chest_orders').select('id').eq('txid', txid).neq('id', orderId).maybeSingle();
      if (used) return json({ error: 'transação já usada em outro baú' }, 409);

      // Guarda o txid já no pedido (um pagamento enviado não é cancelado por prazo).
      if (!order.txid) await db.from('chest_orders').update({ txid }).eq('id', orderId).is('txid', null);

      const tx = await lookupTx(txid);
      if (tx === 'unavailable') return json({ status: 'waiting', reason: 'DogData indisponível' });
      if (tx === null) return json({ status: 'waiting', reason: 'aguardando confirmação' });
      const problem = checkPayment(tx, order);
      if (problem === 'aguardando confirmação') return json({ status: 'waiting', reason: problem });
      if (problem) return json({ status: 'rejected', reason: problem }, 402);

      const chest = chestById(order.chest_id);
      if (!chest) return json({ error: 'baú desconhecido' }, 500);
      const reward = roll(chest);
      const { data: paid, error } = await db
        .from('chest_orders')
        .update({ status: 'paid', reward, paid_at: new Date().toISOString(), txid })
        .eq('id', orderId)
        .neq('status', 'paid')
        .select()
        .maybeSingle();
      if (error) return json({ error: 'transação já usada em outro baú' }, 409);
      if (!paid) {
        // Outra chamada pagou no meio do caminho: devolve o que ficou gravado.
        const { data: again } = await db.from('chest_orders').select('*').eq('id', orderId).maybeSingle();
        return json({ status: 'paid', order: again });
      }
      return json({ status: 'paid', order: paid });
    }

    return json({ error: 'ação desconhecida' }, 400);
  } catch (e) {
    console.error('[chests]', e);
    return json({ error: 'erro interno' }, 500);
  }
});
