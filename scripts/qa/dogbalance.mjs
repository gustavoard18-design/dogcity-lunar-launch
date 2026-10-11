// Testa a Edge Function dog-balance em Node, sem Deno: banco falso e DogData
// simulado (rápido, lento, 404). Uso: node scripts/qa/dogbalance.mjs .
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(process.argv[2] + '/package.json');
const esbuild = require('esbuild');
let src = fs.readFileSync(process.argv[2] + '/supabase/functions/dog-balance/index.ts', 'utf8');
src = src.replace(/^import \{ createClient \} from 'npm:@supabase\/supabase-js@2';$/m, 'const createClient = globalThis.__createClient;');
const { code } = await esbuild.transform(src, { loader: 'ts', format: 'esm' });

const tables = { dog_balances: new Map(), dogdata_identities: new Map() };
const writes = [];
const q = (table) => {
  const st = { table, filters: [] };
  const run = async () => {
    if (st.single) return { data: tables[table].get(st.eq) ?? null, error: null };
    return { data: [...tables[table].values()].filter(r => st.in.includes(r.address)), error: null };
  };
  const b = {
    select: () => b,
    eq: (_c, v) => ((st.eq = v), b),
    in: (_c, v) => ((st.in = v), Object.assign(run(), b)),
    maybeSingle: () => ((st.single = true), run()),
    upsert: async rows => { for (const r of [].concat(rows)) { tables[table].set(r.address, r); writes.push(table); } return { error: null }; },
  };
  return b;
};
globalThis.__createClient = () => ({ from: q });
let handler;
const pending = [];
globalThis.Deno = { serve: h => (handler = h), env: { get: () => 'x' } };
globalThis.EdgeRuntime = { waitUntil: p => pending.push(p) };

// DogData simulado: por caminho, { status, body, delay }
let api = {};
globalThis.fetch = async (url, { signal } = {}) => {
  const path = new URL(url).pathname;
  const r = api[path] ?? { status: 200, body: {} };
  await new Promise((res, rej) => {
    const t = setTimeout(res, r.delay ?? 10);
    signal?.addEventListener('abort', () => { clearTimeout(t); rej(new Error('abort')); });
  });
  return { ok: r.status === 200, status: r.status, json: async () => r.body };
};
await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));

const A = 'bc1qv4q4j8mjxhjxwjuc7vy6sq7c57z6rdvteql4xy';
const call = async qs => { const t0 = Date.now(); const res = await handler(new Request('https://x/f?' + qs)); return { ms: Date.now() - t0, status: res.status, body: await res.json() }; };
const ok = (name, cond, info = '') => { console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`); if (!cond) process.exitCode = 1; };
const holderOk = { status: 200, body: { holder: { total_dog: 12345, rank: 7 }, pagination: { total: 90000 } } };
const cityOk = { status: 200, body: { status: 'not_in_snapshot' } };
const profOk = { status: 200, body: { handle: 'dogfan', avatar_inscription_id: null } };

// 1. sem cache, DogData rápido: responde e grava o cache por trás
api = { '/api/dog-rune/holders': holderOk, '/api/dogcity/lookup': cityOk, '/api/profile': profOk };
let r = await call('address=' + A);
await Promise.all(pending.splice(0));
ok('sem cache: saldo do DogData', r.status === 200 && r.body.balance === 12345 && r.body.cached === false);
ok('grava o cache completo', tables.dog_balances.get(A)?.balance === 12345);

// 2. cache fresco: não chama o DogData
api = { '/api/dog-rune/holders': { ...holderOk, delay: 30000 } };
r = await call('address=' + A);
ok('cache fresco responde na hora', r.status === 200 && r.body.cached === true && r.ms < 200, `${r.ms} ms`);

// 3. cache velho e DogData lento: responde na hora com o velho (stale) e atualiza por trás
tables.dog_balances.get(A).updated_at = new Date(Date.now() - 3600e3).toISOString();
api = { '/api/dog-rune/holders': { status: 200, body: { holder: { total_dog: 99999, rank: 1 } }, delay: 300 }, '/api/dogcity/lookup': cityOk, '/api/profile': profOk };
r = await call('address=' + A);
ok('cache velho: responde já, marcado stale', r.body.stale === true && r.body.balance === 12345 && r.ms < 200, `${r.ms} ms`);
await Promise.all(pending.splice(0));
ok('atualização por trás grava o saldo novo', tables.dog_balances.get(A).balance === 99999);

// 4. sem cache, holders estoura o tempo: não inventa saldo 0, não grava cache
const B = 'bc1qnovo0000000000000000000000000000000000000';
api = { '/api/dog-rune/holders': { ...holderOk, delay: 30000 }, '/api/dogcity/lookup': cityOk, '/api/profile': profOk };
r = await call('address=' + B);
ok('holders lento: 502 em ~5 s, sem saldo inventado', r.status === 502 && r.ms < 6500, `${r.ms} ms`);
await Promise.all(pending.splice(0));
ok('holders lento: nada de saldo no cache', !tables.dog_balances.has(B));

// 5. não é holder (404): saldo 0 de verdade, gravado
const C = 'bc1qsemdog000000000000000000000000000000000000';
api = { '/api/dog-rune/holders': { status: 404, body: {} }, '/api/dogcity/lookup': cityOk, '/api/profile': { status: 404, body: {} } };
r = await call('address=' + C);
await Promise.all(pending.splice(0));
ok('não holder: saldo 0 e cache gravado', r.status === 200 && r.body.balance === 0 && tables.dog_balances.get(C)?.balance === 0);

// 6. ranking: DogData lento responde no teto de 6 s com o que tiver
const list = Array.from({ length: 10 }, (_, i) => 'bc1qrank' + String(i).padStart(34, '0'));
api = { '/api/profile': { ...profOk, delay: 20000 } };
r = await call('addresses=' + list.join(','));
ok('ranking lento: responde em ~6 s', r.status === 200 && r.ms < 7000, `${r.ms} ms`);
console.log('gravações:', writes.join(', '));
process.exit(process.exitCode ?? 0);
