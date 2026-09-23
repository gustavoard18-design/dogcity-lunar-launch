// Edge Function: dados on-chain de DOG de um endereço, via DogData (dogdata.xyz).
// - Saldo e ranking de holder da Rune DOG•GO•TO•THE•MOON (840000:3)
// - Lote no DogCity (snapshot do bloco 966.670): área, distrito, tipologia, selo Genesis
// As APIs do DogData não têm CORS, por isso passam por aqui. Cache de 10 min
// na tabela dog_balances para não sobrecarregar o serviço deles.
import { createClient } from 'npm:@supabase/supabase-js@2';

const DOGDATA = 'https://www.dogdata.xyz';
const CACHE_MS = 10 * 60 * 1000;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

async function getJson(url: string): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'DogCity-Lunar-Launch/1.0 (+https://gustavoard18-design.github.io/dogcity-lunar-launch/)' } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const address = new URL(req.url).searchParams.get('address')?.trim() ?? '';
  if (!/^(bc1[a-z0-9]{25,90}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(address)) {
    return json({ error: 'endereço inválido' }, 400);
  }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: cached } = await db.from('dog_balances').select('balance, data, updated_at').eq('address', address).maybeSingle();
  if (cached?.data && Date.now() - new Date(cached.updated_at).getTime() < CACHE_MS) {
    return json({ ...cached.data, cached: true });
  }

  const enc = encodeURIComponent(address);
  const [holder, city] = await Promise.all([
    getJson(`${DOGDATA}/api/dog-rune/holders?address=${enc}`),
    getJson(`${DOGDATA}/api/dogcity/lookup?address=${enc}`),
  ]);

  if (!holder && !city) {
    if (cached?.data) return json({ ...cached.data, cached: true, stale: true });
    return json({ error: 'DogData indisponível' }, 502);
  }

  const h = holder?.holder;
  const result = {
    address,
    // Endereço sem Runes DOG não aparece na lista de holders: saldo 0.
    balance: typeof h?.total_dog === 'number' ? h.total_dog : 0,
    rank: typeof h?.rank === 'number' ? h.rank : null,
    totalHolders: holder?.pagination?.total ?? null,
    dogcity: city
      ? {
          status: city.status as string, // in_snapshot | not_in_snapshot | exchange
          identity: city.identity_name ?? null,
          genesis: !!city.genesis,
          areaM2: city.area_m2 ?? null,
          snapshotDog: city.dog ?? null,
          lotId: city.lot?.lot_id ?? null,
          district: city.lot?.district ?? null,
          typology: city.lot?.typology ?? null,
          mapUrl: city.lot?.map ? `${DOGDATA}${city.lot.map}` : null,
        }
      : null,
    source: 'dogdata.xyz',
  };

  await db.from('dog_balances').upsert({ address, balance: result.balance, data: result, updated_at: new Date().toISOString() });
  return json({ ...result, cached: false });
});
