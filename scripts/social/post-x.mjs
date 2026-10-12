// Robô do X: publica o próximo post aprovado e vencido da fila (social/x-posts.json).
// Roda de hora em hora pelo GitHub Actions (.github/workflows/x-posts.yml).
//
// Chaves (segredos do repositório, cadastrados pelo dono da conta, nunca no código):
//   X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET
// Sem as chaves, ou com --dry-run, só mostra o que publicaria.
//
// Uso local:  node scripts/social/post-x.mjs --check    confere a fila inteira
//             node scripts/social/post-x.mjs --dry-run  mostra o próximo post
//             node scripts/social/post-x.mjs --whoami   testa as chaves sem postar (mostra a conta)
import crypto from 'node:crypto';
import fs from 'node:fs';
import { MAX_ATTEMPTS, isTransient, nextPost, validatePost, xLength } from './x-queue.mjs';

const QUEUE = 'social/x-posts.json';
const STATE = 'social/x-posted.json';
const ENDPOINT = 'https://api.x.com/2/tweets';

const posts = JSON.parse(fs.readFileSync(QUEUE, 'utf8'));
const posted = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {};
const args = new Set(process.argv.slice(2));

if (args.has('--check')) {
  let bad = 0;
  const ids = new Set();
  for (const p of posts) {
    const errors = validatePost(p);
    if (ids.has(p.id)) errors.push('id repetido');
    ids.add(p.id);
    if (errors.length) bad++;
    console.log(`${errors.length ? '❌' : '✅'} ${p.id} · ${p.at} · ${xLength(p.text ?? '')} car.${p.approved ? '' : ' · NÃO APROVADO'}${errors.length ? ' · ' + errors.join(', ') : ''}`);
  }
  process.exit(bad ? 1 : 0);
}

const keys = {
  consumerKey: process.env.X_API_KEY,
  consumerSecret: process.env.X_API_SECRET,
  token: process.env.X_ACCESS_TOKEN,
  tokenSecret: process.env.X_ACCESS_SECRET,
};
const missingKeys = Object.values(keys).some(v => !v);

// Assinatura OAuth 1.0a (contexto do usuário). Corpo JSON não entra na assinatura.
const enc = s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
function authHeader(method, url) {
  const oauth = {
    oauth_consumer_key: keys.consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: keys.token,
    oauth_version: '1.0',
  };
  const paramString = Object.keys(oauth).sort().map(k => `${enc(k)}=${enc(oauth[k])}`).join('&');
  const base = [method, enc(url), enc(paramString)].join('&');
  oauth.oauth_signature = crypto.createHmac('sha1', `${enc(keys.consumerSecret)}&${enc(keys.tokenSecret)}`).update(base).digest('base64');
  return 'OAuth ' + Object.keys(oauth).sort().map(k => `${enc(k)}="${enc(oauth[k])}"`).join(', ');
}

if (args.has('--whoami')) {
  if (missingKeys) {
    console.error('Faltam as chaves do X (X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET).');
    process.exit(1);
  }
  const url = 'https://api.x.com/2/users/me';
  const r = await fetch(url, { headers: { Authorization: authHeader('GET', url) } });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error(`❌ as chaves não funcionaram: HTTP ${r.status} ${JSON.stringify(b).slice(0, 300)}`);
    process.exit(1);
  }
  console.log(`✅ chaves ok: conta @${b.data.username} (${b.data.name}). Nada foi postado.`);
  process.exit(0);
}

const post = nextPost(posts, posted);
if (!post) {
  console.log('Nada para publicar agora.');
  process.exit(0);
}
if (args.has('--dry-run') || missingKeys) {
  console.log(`(simulação${missingKeys ? ': sem as chaves do X' : ''}) publicaria ${post.id}:

${post.text}`);
  process.exit(0);
}

let res;
let body = {};
try {
  res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: authHeader('POST', ENDPOINT), 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: post.text }),
  });
  body = await res.json().catch(() => ({}));
} catch (e) {
  res = { ok: false, status: 0 };
  body = { error: String(e) };
}

// O id fica registrado. Publicado ou falha definitiva (texto recusado, chave errada…)
// não é tentado de novo; falha passageira (limite de uso, X fora do ar, rede) volta
// na próxima hora, até MAX_ATTEMPTS vezes.
const attempts = (posted[post.id]?.attempts ?? 0) + 1;
const now = new Date().toISOString();
const error = JSON.stringify(body).slice(0, 300);
posted[post.id] = res.ok
  ? { postedAt: now, tweetId: body?.data?.id ?? null, attempts }
  : isTransient(res.status) && attempts < MAX_ATTEMPTS
    ? { attempts, lastTryAt: now, status: res.status, error }
    : { failedAt: now, status: res.status, error, attempts };
fs.writeFileSync(STATE, JSON.stringify(posted, null, 2) + '\n');

if (!res.ok) {
  console.error(`❌ ${post.id}: HTTP ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  process.exit(1);
}
console.log(`✅ ${post.id} publicado: https://x.com/i/web/status/${body.data.id}`);
