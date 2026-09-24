// Joga uma partida completa num navegador headless e salva prints.
import puppeteer from 'puppeteer-core';

const OUT = process.argv[2] ?? '.';
const ROUTE = process.argv[3] ?? 'Órbita Baixa';
const SMART = process.argv[4] !== 'dumb';
// Máquina lenta (SwiftShader a poucos fps): janela menor e mais tempo de voo.
const [W, H] = (process.env.QA_VIEWPORT ?? '1280x720').split('x').map(Number);
const FLIGHT_MS = Number(process.env.QA_FLIGHT_SECONDS ?? 170) * 1000;
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--window-size=${W},${H}`, '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: W, height: H },
});
const page = await browser.newPage();
const errors = [];
page.on('console', m => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clickText = async (text, sel = 'button') => {
  await page.waitForFunction((t, s) => [...document.querySelectorAll(s)].some(b => b.textContent.includes(t)), { timeout: 30000 }, text, sel);
  await page.evaluate((t, s) => [...document.querySelectorAll(s)].find(b => b.textContent.includes(t)).click(), text, sel);
};
const shot = name => page.screenshot({ path: `${OUT}/${name}.png` });

await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
await sleep(2500);
await shot('01-connect');
await clickText('Jogar agora');
await sleep(2500);
// QA_LEVEL=7 libera as rotas mais altas (piloto com nível e Stardust de sobra).
if (process.env.QA_LEVEL) {
  await page.evaluate(level => {
    const all = JSON.parse(localStorage.getItem('dogcity_game_state'));
    const p = all[localStorage.getItem('dogcity_guest_address')];
    p.dog.level = level;
    p.stardust = 5000;
    localStorage.setItem('dogcity_game_state', JSON.stringify(all));
  }, Number(process.env.QA_LEVEL));
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(2500);
  await clickText('Jogar agora').catch(() => {});
  await sleep(2500);
}
await shot('02-hangar');
await clickText(ROUTE, 'button');
await sleep(3000);
await clickText('Iniciar sequência');
await sleep(600);
await shot('03-aim');

// Mira: trava quando o ângulo estiver dentro do arco verde.
if (SMART) {
  await page.waitForFunction(() => {
    const paths = document.querySelectorAll('svg[viewBox="0 0 200 200"] path');
    const zone = [...paths].find(p => p.getAttribute('stroke') === '#4ade80');
    const txt = document.querySelector('svg[viewBox="0 0 200 200"]')?.parentElement?.querySelectorAll('span')[1]?.textContent;
    if (!zone || !txt) return false;
    const n = zone.getAttribute('d').match(/-?\d+(\.\d+)?/g).map(Number);
    const ang = (x, y) => (Math.atan2(180 - y, x - 20) * 180) / Math.PI;
    const a0 = ang(n[0], n[1]);
    const a1 = ang(n[7], n[8]);
    const a = parseFloat(txt);
    return a >= Math.min(a0, a1) && a <= Math.max(a0, a1);
  }, { polling: 'raf', timeout: 90000 }).catch(() => console.log('mira/força: travando fora da zona (poucos fps)'));
}
await clickText('TRAVAR');
await sleep(500);
if (SMART) {
  await page.waitForFunction(() => {
    const bars = [...document.querySelectorAll('div')].filter(d => d.className.includes?.('bg-amber-400/25'));
    const zone = bars[0];
    const txt = [...document.querySelectorAll('span')].find(s => /^\d+%$/.test(s.textContent) && s.closest('.hud-panel')?.textContent.includes('FORÇA'));
    if (!zone || !txt) return false;
    const b = parseFloat(zone.style.bottom);
    const h = parseFloat(zone.style.height);
    const p = parseFloat(txt.textContent);
    return p >= b && p <= b + h;
  }, { polling: 'raf', timeout: 90000 }).catch(() => console.log('mira/força: travando fora da zona (poucos fps)'));
}
await shot('04-power');
await clickText('TRAVAR');
await sleep(1500);
await shot('05-countdown');
await sleep(2300);
await shot('06-liftoff');
await sleep(1600);
await shot('07-liftoff2');

// Voo: movimento em lissajous com o mouse.
const t0 = Date.now();
let i = 0;
let fpsSample = null;
while (Date.now() - t0 < FLIGHT_MS) {
  const done = await page.evaluate(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Hangar')));
  if (done) break;
  const t = (Date.now() - t0) / 1000;
  await page.mouse.move(W / 2 + Math.sin(t * 1.3) * W * 0.33, H / 2 + Math.sin(t * 0.9) * H * 0.3);
  if (i % 400 === 0) await shot(`08-flight-${String(i / 100).padStart(2, '0')}`);
  if (i === 60) {
    fpsSample = await page.evaluate(() => new Promise(r => { let n = 0; const s = performance.now(); const f = () => { n++; performance.now() - s < 1000 ? requestAnimationFrame(f) : r(n); }; requestAnimationFrame(f); }));
  }
  i++;
  await sleep(50);
}
await sleep(2500);
await shot('09-result');
const resultText = await page.evaluate(() => document.body.innerText.slice(0, 800));
console.log(JSON.stringify({ fpsSample, flightSeconds: (Date.now() - t0) / 1000, errors: errors.slice(0, 10), resultText }, null, 2));
await browser.close();
