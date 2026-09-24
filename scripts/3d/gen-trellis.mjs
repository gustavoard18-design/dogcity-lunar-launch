// Gera o foguete Bitcoin em 3D com TRELLIS.2 (30 créditos) e baixa o GLB.
import fs from 'node:fs';
const KEY = fs.readFileSync('C:/Users/Gustavo/Downloads/DOG/.env.local', 'utf8').match(/THREEDAI_API_KEY=(\S+)/)[1];
const API = 'https://api.3daistudio.com';
const auth = { Authorization: `Bearer ${KEY}` };
const TASK = 'btc-task.json';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let task = fs.existsSync(TASK) ? JSON.parse(fs.readFileSync(TASK, 'utf8')) : null;
if (!task) {
  const img = fs.readFileSync('rocket-btc.png').toString('base64');
  const r = await fetch(`${API}/v1/3d-models/trellis2/generate/`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: `data:image/png;base64,${img}`, resolution: '1024', textures: true, texture_size: 2048, decimation_target: 24000 }),
  });
  const txt = await r.text();
  console.log('submit', r.status, txt);
  if (!r.ok) process.exit(1);
  task = JSON.parse(txt);
  fs.writeFileSync(TASK, JSON.stringify(task));
}
const t0 = Date.now();
while (Date.now() - t0 < 12 * 60 * 1000) {
  const st = await (await fetch(`${API}/v1/generation-request/${task.task_id}/status/`, { headers: auth })).json();
  console.log(new Date().toISOString().slice(11, 19), st.status, st.progress ?? '', st.failure_reason ?? '');
  if (st.status === 'FINISHED') {
    const a = st.results.find(x => x.asset_type === '3D_MODEL') ?? st.results[0];
    const glb = Buffer.from(await (await fetch(a.asset)).arrayBuffer());
    fs.writeFileSync('rocket-btc-raw.glb', glb);
    console.log('saved', glb.length);
    break;
  }
  if (st.status === 'FAILED') process.exit(1);
  await sleep(8000);
}
console.log('saldo', (await (await fetch(`${API}/account/user/wallet/`, { headers: auth })).json()).balance);
