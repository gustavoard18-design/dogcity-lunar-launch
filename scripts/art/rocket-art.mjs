// Gera as artes 2D do foguete a partir do foguete 3D do jogo.
// Uso: `npm run dev` em outro terminal e `node scripts/art/rocket-art.mjs [pasta] [--tiers]`
// (padrão: public/art). Requer Playwright (`npm i --no-save playwright`).
// A vitrine da Loja/Oficina usa as artes 2D das 5 fases (rocket-1..5.webp, recortadas
// da arte "Evolução do foguete"); só com
// --tiers o script gera versões 3D delas.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const out = args.find(a => !a.startsWith('--')) ?? 'public/art';
const tiers = args.includes('--tiers');
const base = process.env.DEV_URL ?? 'http://localhost:5173';

// [arquivo, modo, largura, altura, qualidade WebP]
const jobs = [
  ...(tiers ? [1, 2, 3, 4, 5].map(t => [`rocket-${t}.webp`, `mode=tier&tier=${t}`, 440, 604, 0.86]) : []),
  ['cutout-rocket.webp', 'mode=cutout', 625, 1024, 0.9],
  ['sprite-rocket.webp', 'mode=icon', 625, 964, 0.9],
];

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [file, query, width, height, quality] of jobs) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on('pageerror', e => console.log('ERR', e.message));
  await page.goto(`${base}/scripts/art/rocket-art.html?${query}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 180_000 });
  const url = await page.evaluate(q => window.__gl.domElement.toDataURL('image/webp', q), quality);
  const buf = Buffer.from(url.split(',')[1], 'base64');
  fs.writeFileSync(path.join(out, file), buf);
  console.log(file, `${(buf.length / 1024).toFixed(1)} KB`);
  await page.close();
}
await browser.close();
