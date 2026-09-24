// Gera o DOG astronauta em 3D (Tripo 3.2 via 3D AI Studio) e baixa o GLB.
// Guarda o task_id em disco: rodar de novo retoma a mesma geração sem cobrar outra vez.
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const ENV = 'C:/Users/Gustavo/Downloads/DOG/.env.local';
const KEY = fs.readFileSync(ENV, 'utf8').match(/THREEDAI_API_KEY=(\S+)/)[1];
const API = 'https://api.3daistudio.com';
const TASK_FILE = path.join(HERE, 'dog-task.json');
const OUT = path.join(HERE, 'dog-raw.glb');
const auth = { Authorization: `Bearer ${KEY}` };
const sleep = ms => new Promise(r => setTimeout(r, ms));

let task = fs.existsSync(TASK_FILE) ? JSON.parse(fs.readFileSync(TASK_FILE, 'utf8')) : null;
if (!task) {
  const img = fs.readFileSync(path.join(HERE, 'dog.png')).toString('base64');
  const body = {
    image: `data:image/png;base64,${img}`,
    texture: true,
    pbr: true,
    texture_quality: 'standard',
    texture_alignment: 'original_image',
    smart_low_poly: true,
    face_limit: 8000,
  };
  const r = await fetch(`${API}/v1/3d-models/tripo/image-to-3d/3.2/`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const txt = await r.text();
  console.log('submit', r.status, txt);
  if (!r.ok) process.exit(1);
  task = JSON.parse(txt);
  fs.writeFileSync(TASK_FILE, JSON.stringify(task));
}

const t0 = Date.now();
while (Date.now() - t0 < 15 * 60 * 1000) {
  const r = await fetch(`${API}/v1/generation-request/${task.task_id}/status/`, { headers: auth });
  const st = await r.json();
  console.log(new Date().toISOString().slice(11, 19), st.status, st.progress ?? '', st.failure_reason ?? '');
  if (st.status === 'FINISHED') {
    const asset = st.results.find(x => x.asset_type === '3D_MODEL') ?? st.results[0];
    const glb = Buffer.from(await (await fetch(asset.asset)).arrayBuffer());
    fs.writeFileSync(OUT, glb);
    console.log('saved', OUT, glb.length, 'bytes');
    break;
  }
  if (st.status === 'FAILED') process.exit(1);
  await sleep(10000);
}
const w = await (await fetch(`${API}/account/user/wallet/`, { headers: auth })).json();
console.log('saldo', w.balance);
