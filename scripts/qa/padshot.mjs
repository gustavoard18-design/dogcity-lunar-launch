import puppeteer from 'puppeteer-core';
const OUT = process.argv[2] ?? 'after';
const mobile = process.argv[3] === 'mobile';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'], defaultViewport: mobile ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1280, height: 720 } });
const page = await b.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => m.type() === 'error' && errors.push(m.text()));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const click = async (t, sel = 'button') => {
  await page.waitForFunction((t, s) => [...document.querySelectorAll(s)].some(b => b.textContent.includes(t)), { timeout: 60000 }, t, sel);
  await page.evaluate((t, s) => [...document.querySelectorAll(s)].find(b => b.textContent.includes(t)).click(), t, sel);
};
await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
await sleep(3000);
await click('Jogar agora');
await sleep(1500);
await sleep(1500); await click('Órbita Baixa');
await sleep(9000);
await page.screenshot({ path: `${OUT}/pad-brief.png` });
await click('Iniciar sequência');
await sleep(2500);
await page.screenshot({ path: `${OUT}/pad-aim.png` });
if (process.argv[4] === 'launch') {
  await click('TRAVAR'); await sleep(700); await click('TRAVAR');
  await sleep(250); await page.screenshot({ path: `${OUT}/pad-board1.png` });
  await sleep(250); await page.screenshot({ path: `${OUT}/pad-board2.png` });
  await sleep(4200); await page.screenshot({ path: `${OUT}/pad-liftoff.png` });
  await sleep(1200); await page.screenshot({ path: `${OUT}/pad-liftoff2.png` });
}
console.log(JSON.stringify(errors.slice(0, 8)));
await b.close();
