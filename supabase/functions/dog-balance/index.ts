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
//
// O DogData às vezes demora mais de 20 s. Por isso: cada chamada espera no
// máximo 5 s; com cache velho a resposta sai na hora (marcada `stale`) e a
// atualização continua por trás; gravar no cache nunca atrasa a resposta; e o
// cache só é gravado com as três consultas completas (holder que falhou não vira
// saldo 0 por 10 minutos).
import { createClient } from 'npm:@supabase/supabase-js@2';

const DOGDATA = 'https://www.dogdata.xyz';
const CACHE_MS = 10 * 60 * 1000;
// Identidade muda raramente: o ranking reaproveita por 6 h.
const IDENTITY_CACHE_MS = 6 * 60 * 60 * 1000;
const MAX_BATCH = 25;
const FETCH_MS = 5000;
const DB_MS = 4000;
// Ranking: responde com o que tiver em até 6 s; o resto entra no cache por trás.
const IDENTITY_BUDGET_MS = 6000;
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

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** O resultado da promessa, ou `fallback` se passar de `ms`. */
function withTimeout<T>(p: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([Promise.resolve(p).catch(() => fallback), sleep(ms).then(() => fallback)]);
}

/** Continua um trabalho depois da resposta (cache), sem atrasá-la. */
function background(p: Promise<unknown>) {
  const task = p.catch(e => console.error('[dog-balance]', e));
  const rt = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime;
  if (rt) rt.waitUntil(task);
}

/** JSON da API. `null` = 404 (não encontrado); `undefined` = falhou ou demorou. */
async function getJson(url: string): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'DogCity-Lunar-Launch/1.0 (+https://dogcity-lunar-launch.vercel.app/)' } });
    if (res.status === 404) return null;
    if (!res.ok) return undefined;
    return await res.json();
  } catch {
    return undefined;
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
  const { data: rows, error } = await withTimeout(db.from('dogdata_identities').select('address, data, updated_at').in('address', addresses), DB_MS, { data: null, error: 'timeout' });
  const fresh = new Map<string, any>();
  if (!error) for (const r of rows ?? []) if (Date.now() - new Date(r.updated_at).getTime() < IDENTITY_CACHE_MS) fresh.set(r.address, r.data);

  const missing = addresses.filter(a => !fresh.has(a));
  const fetched: { address: string; data: any; updated_at: string }[] = [];
  const work = (async () => {
    for (let i = 0; i < missing.length; i += 5) {
      await Promise.all(
        missing.slice(i, i + 5).map(async address => {
          const profile = await getJson(profileUrl(address));
          if (!profile) return; // DogData fora do ar ou sem perfil: tenta na próxima abertura
          const data = identityFrom(profile);
          fresh.set(address, data);
          fetched.push({ address, data, updated_at: new Date().toISOString() });
        })
      );
    }
  })();
  await Promise.race([work, sleep(IDENTITY_BUDGET_MS)]);
  // O que chegar (agora ou depois do prazo) vai para o cache por trás. Sem a migração da tabela, segue sem cache.
  if (!error) background(work.then(() => (fetched.length ? db.from('dogdata_identities').upsert(fetched) : null)));

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

  const { data: cached } = await withTimeout(db.from('dog_balances').select('balance, data, updated_at').eq('address', address).maybeSingle(), DB_MS, { data: null });
  const age = cached?.data ? Date.now() - new Date(cached.updated_at).getTime() : Infinity;
  if (age < CACHE_MS) return json({ ...cached.data, cached: true });
  // Cache velho: responde já com ele e atualiza por trás.
  if (cached?.data) {
    background(lookup(address).then(r => (r ? store(db, r) : null)));
    return json({ ...cached.data, cached: true, stale: true });
  }

  const r = await lookup(address);
  // Sem o saldo (holders falhou), não dá para responder: o jogo tenta de novo.
  if (!r || r.holderFailed) return json({ error: 'DogData indisponível' }, 502);
  background(store(db, r));
  return json({ ...r.result, cached: false });
});

/** As três consultas ao DogData em paralelo (até 5 s cada). `null` se todas falharam. */
async function lookup(address: string) {
  const enc = encodeURIComponent(address);
  const [holder, city, profile] = await Promise.all([
    getJson(`${DOGDATA}/api/dog-rune/holders?address=${enc}`),
    getJson(`${DOGDATA}/api/dogcity/lookup?address=${enc}`),
    getJson(profileUrl(address)),
  ]);
  if (holder === undefined && city === undefined && profile === undefined) return null;

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

  return {
    result,
    identity,
    holderFailed: holder === undefined,
    // Só grava no cache o que veio completo: uma consulta que falhou não pode virar "sem lote" ou "saldo 0".
    complete: holder !== undefined && city !== undefined && profile !== undefined,
  };
}

/** Grava no cache (fora do tempo da resposta). */
async function store(db: any, r: NonNullable<Awaited<ReturnType<typeof lookup>>>) {
  const now = new Date().toISOString();
  if (r.complete) await db.from('dog_balances').upsert({ address: r.result.address, balance: r.result.balance, data: r.result, updated_at: now });
  if (r.identity) await db.from('dogdata_identities').upsert({ address: r.result.address, data: r.identity, updated_at: now });
}
