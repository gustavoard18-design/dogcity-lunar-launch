// Edge Function: saldo real da Rune DOG•GO•TO•THE•MOON (id 840000:3) de um endereço.
// A chave da UniSat Open API fica no segredo UNISAT_API_KEY (nunca no site).
// Resultado em cache na tabela dog_balances por 10 minutos.
import { createClient } from 'npm:@supabase/supabase-js@2';

const DOG_RUNE_ID = '840000:3';
const CACHE_MS = 10 * 60 * 1000;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const address = new URL(req.url).searchParams.get('address')?.trim() ?? '';
  // Endereços Bitcoin mainnet (legado, P2SH, bech32/taproot).
  if (!/^(bc1[a-z0-9]{25,90}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(address)) {
    return json({ error: 'endereço inválido' }, 400);
  }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: cached } = await db.from('dog_balances').select('balance, updated_at').eq('address', address).maybeSingle();
  if (cached && Date.now() - new Date(cached.updated_at).getTime() < CACHE_MS) {
    return json({ address, balance: Number(cached.balance), cached: true });
  }

  const key = Deno.env.get('UNISAT_API_KEY');
  if (!key) return json({ error: 'UNISAT_API_KEY não configurada' }, 503);

  const res = await fetch(`https://open-api.unisat.io/v1/indexer/address/${address}/runes/${DOG_RUNE_ID}/balance`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const body = await res.json().catch(() => null);
  let balance = 0;
  if (body?.code === 0 && body.data) {
    const decimals = Number(body.data.divisibility ?? 5);
    balance = Number(body.data.amount ?? 0) / 10 ** decimals;
  } else if (!(body && /not found|no rune/i.test(String(body.msg ?? '')))) {
    // Erro da UniSat (limite, chave inválida…): devolve o cache antigo se houver.
    if (cached) return json({ address, balance: Number(cached.balance), cached: true, stale: true });
    return json({ error: 'falha ao consultar a UniSat', detail: body?.msg ?? res.status }, 502);
  }

  await db.from('dog_balances').upsert({ address, balance, updated_at: new Date().toISOString() });
  return json({ address, balance, cached: false });
});
