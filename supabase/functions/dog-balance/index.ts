// Edge Function: dados on-chain de DOG de um endereço, via DogData (dogdata.xyz).
// - Saldo e ranking de holder da Rune DOG•GO•TO•THE•MOON (840000:3)
// - Lote no DogCity (snapshot do bloco 966.670): área, distrito, tipologia, selo Genesis,
//   rua, número, zona e prestígio
// - Identidade DogData: handle e avatar Ordinal escolhidos no perfil do DogData
//
// GET ?address=X          tudo do endereço (perfil do jogador)
// GET ?addresses=A,B,C    só a identidade de até 25 endereços (ranking)
// As APIs do DogData não têm CORS, por isso passam por aqui. Cache de 10 min
// na tabela dog_balances para não sobrecarregar o serviço deles.
import { createClient } from 'npm:@supabase/supabase-js@2';

const DOGDATA = 'https://www.dogdata.xyz';
const CACHE_MS = 10 * 60 * 1000;
// Identidade muda raramente: o ranking reaproveita por 6 h.
const IDENTITY_CACHE_MS = 6 * 60 * 60 * 1000;
const MAX_BATCH = 25;
const ADDRESS_RE = /^(bc1[a-z0-9]{25,90}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/;
const HANDLE_RE = /^[a-z0-9_]{3,15}$/;
const INSCRIPTION_RE = /^[0-9a-f]{64}i\d{1,6}$/;
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

/** Handle e avatar do perfil DogData, só com valores no formato esperado. */
function identityFrom(profile: any): { handle: string | null; avatarId: string | null } {
  const handle = typeof profile?.handle === 'string' && HANDLE_RE.test(profile.handle) ? profile.handle : null;
  const avatarId = typeof profile?.avatar_inscription_id === 'string' && INSCRIPTION_RE.test(profile.avatar_inscription_id) ? profile.avatar_inscription_id : null;
  return { handle, avatarId };
}

const profileUrl = (address: string) => `${DOGDATA}/api/profile?address=${encodeURIComponent(address)}`;

/** Ranking: identidade de vários endereços, do cache ou do DogData (5 por vez). */
async function identities(db: any, addresses: string[]) {
  const out: Record<string, { handle: string | null; avatarId: string | null }> = {};
  const { data: rows, error } = await db.from('dogdata_identities').select('address, data, updated_at').in('address', addresses);
  const fresh = new Map<string, any>();
  if (!error) for (const r of rows ?? []) if (Date.now() - new Date(r.updated_at).getTime() < IDENTITY_CACHE_MS) fresh.set(r.address, r.data);

  const missing = addresses.filter(a => !fresh.has(a));
  const fetched: { address: string; data: any; updated_at: string }[] = [];
  for (let i = 0; i < missing.length; i += 5) {
    await Promise.all(
      missing.slice(i, i + 5).map(async address => {
        const profile = await getJson(profileUrl(address));
        if (!profile) return; // DogData fora do ar: tenta na próxima abertura
        const data = identityFrom(profile);
        fresh.set(address, data);
        fetched.push({ address, data, updated_at: new Date().toISOString() });
      })
    );
  }
  // Sem a migração da tabela, segue sem cache.
  if (fetched.length && !error) await db.from('dogdata_identities').upsert(fetched);

  for (const [address, data] of fresh) if (data?.handle || data?.avatarId) out[address] = { handle: data.handle ?? null, avatarId: data.avatarId ?? null };
  return out;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const params = new URL(req.url).searchParams;
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const batch = params.get('addresses');
  if (batch !== null) {
    const list = [...new Set(batch.split(',').map(a => a.trim()).filter(a => ADDRESS_RE.test(a)))].slice(0, MAX_BATCH);
    if (list.length === 0) return json({ identities: {} });
    return json({ identities: await identities(db, list) });
  }

  const address = params.get('address')?.trim() ?? '';
  if (!ADDRESS_RE.test(address)) {
    return json({ error: 'endereço inválido' }, 400);
  }

  const { data: cached } = await db.from('dog_balances').select('balance, data, updated_at').eq('address', address).maybeSingle();
  if (cached?.data && Date.now() - new Date(cached.updated_at).getTime() < CACHE_MS) {
    return json({ ...cached.data, cached: true });
  }

  const enc = encodeURIComponent(address);
  const [holder, city, profile] = await Promise.all([
    getJson(`${DOGDATA}/api/dog-rune/holders?address=${enc}`),
    getJson(`${DOGDATA}/api/dogcity/lookup?address=${enc}`),
    getJson(profileUrl(address)),
  ]);

  if (!holder && !city && !profile) {
    if (cached?.data) return json({ ...cached.data, cached: true, stale: true });
    return json({ error: 'DogData indisponível' }, 502);
  }

  const h = holder?.holder;
  const lot = profile?.lot ?? null;
  const identity = profile ? identityFrom(profile) : null;
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
          // Registro da cidade (perfil DogData): endereço do lote e prestígio
          street: typeof lot?.street === 'string' ? lot.street : null,
          number: lot?.number ?? null,
          zone: typeof lot?.zone === 'string' ? lot.zone : null,
          prestige: typeof lot?.prestige === 'number' ? lot.prestige : null,
          heightTier: typeof lot?.height_tier === 'number' ? lot.height_tier : null,
          state: typeof lot?.state === 'string' ? lot.state : null,
        }
      : null,
    identity,
    source: 'dogdata.xyz',
  };

  await db.from('dog_balances').upsert({ address, balance: result.balance, data: result, updated_at: new Date().toISOString() });
  if (identity) await db.from('dogdata_identities').upsert({ address, data: identity, updated_at: new Date().toISOString() });
  return json({ ...result, cached: false });
});
