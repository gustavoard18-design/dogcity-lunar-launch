// Monitoramento: confere o site publicado e o backend (Supabase) e sai com
// erro se algo estiver fora do ar. Roda a cada hora pelo GitHub Actions
// (.github/workflows/health.yml), que abre um chamado quando falha.
// Uso local: node scripts/health-check.mjs
const SITE = process.env.SITE_URL ?? 'https://gustavoard18-design.github.io/dogcity-lunar-launch/';
const SUPABASE = process.env.SUPABASE_URL ?? 'https://uknupldacjxbuoiaucfc.supabase.co';
const KEY = process.env.SUPABASE_KEY ?? 'sb_publishable_Mf-IQjrI81gzUgBZsodOyg_TmnTaWDR';
const TREASURY = 'bc1qv4q4j8mjxhjxwjuc7vy6sq7c57z6rdvteql4xy';
const headers = { apikey: KEY, 'Content-Type': 'application/json' };

async function req(url, init = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  const t0 = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const text = await res.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { status: res.status, body, ms: Date.now() - t0 };
  } finally {
    clearTimeout(timer);
  }
}

const checks = [
  ['site', async () => {
    const r = await req(SITE);
    if (r.status !== 200 || !String(r.body).includes('DogCity')) throw new Error(`HTTP ${r.status}`);
    const sw = await req(new URL('sw.js', SITE).href);
    const version = /dogcity-[\w.-]+/.exec(String(sw.body))?.[0];
    return `${r.ms} ms · ${version ?? 'sem sw'}`;
  }],
  ['ranking da semana', async () => {
    const r = await req(`${SUPABASE}/rest/v1/rpc/weekly_leaderboard_v2`, { method: 'POST', headers, body: '{"p_limit":1}' });
    if (r.status !== 200 || !Array.isArray(r.body)) throw new Error(`HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
    return `${r.ms} ms`;
  }],
  ['temporada', async () => {
    const r = await req(`${SUPABASE}/rest/v1/rpc/season_leaderboard`, { method: 'POST', headers, body: '{"p_limit":1}' });
    if (r.status !== 200 || !Array.isArray(r.body)) throw new Error(`HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
    return `${r.ms} ms`;
  }],
  ['DogData (dog-balance)', async () => {
    const r = await req(`${SUPABASE}/functions/v1/dog-balance?address=${TREASURY}`, { headers });
    if (r.status !== 200 || typeof r.body?.balance !== 'number') throw new Error(`HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
    return `${r.ms} ms`;
  }],
  ['loja de baús (chests)', async () => {
    const r = await req(`${SUPABASE}/functions/v1/chests?address=${TREASURY}`, { headers });
    if (r.status !== 200 || typeof r.body?.limits?.perDay !== 'number') throw new Error(`HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
    return `${r.ms} ms`;
  }],
  ['login (auth)', async () => {
    // Pedido inválido de propósito: a função no ar responde 400 sem gravar nada.
    const r = await req(`${SUPABASE}/functions/v1/auth`, { method: 'POST', headers, body: '{}' });
    if (r.status !== 400) throw new Error(`HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
    return `${r.ms} ms`;
  }],
];

let failed = 0;
const lines = [];
for (const [name, run] of checks) {
  try {
    lines.push(`✅ ${name}: ${await run()}`);
  } catch (e) {
    failed++;
    lines.push(`❌ ${name}: ${e.message}`);
  }
}
const report = lines.join('\n');
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import('node:fs');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### DogCity health check\n\n${lines.map(l => `- ${l}`).join('\n')}\n`);
}
process.exit(failed ? 1 : 0);
