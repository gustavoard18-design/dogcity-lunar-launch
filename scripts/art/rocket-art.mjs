// Gera as artes 2D do foguete a partir do foguete 3D do jogo.
// Uso: `npm run dev` em outro terminal e `node scripts/art/rocket-art.mjs [pasta]`
// (padrão: public/art). Requer Playwright (`npm i --no-save playwright`).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] ?? 'public/art';
const base = process.env.DEV_URL ?? 'http://localhost:5173';

// [arquivo, modo, largura, altura, qualidade WebP]
const jobs = [
  ...[1, 2, 3, 4, 5].map(t => [`rocket-${t}.webp`, `mode=tier&tier=${t}`, 440, 604, 0.86]),
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
