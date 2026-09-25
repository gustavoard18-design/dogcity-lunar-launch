import puppeteer from 'puppeteer-core';
const OUT = process.argv[2] ?? 'ev';
const mobile = process.argv[3] === 'mobile';
const b = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', protocolTimeout: 900000, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'], defaultViewport: mobile ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1280, height: 900 } });
const page = await b.newPage();
// Os scripts clicam nos botões pelo texto em português.
await page.evaluateOnNewDocument(() => localStorage.setItem('dogcity_lang', 'pt'));
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
// piloto nível 3 com 12 voos no histórico antigo (testa migração e conquistas)
await page.evaluate(() => {
  const all = JSON.parse(localStorage.getItem('dogcity_game_state'));
  const p = all[localStorage.getItem('dogcity_guest_address')];
  p.dog.level = 3; p.dog.missions = 12; p.stardust = 500;
  delete p.stats; delete p.achievements;
  localStorage.setItem('dogcity_game_state', JSON.stringify(all));
});
await page.reload({ waitUntil: 'networkidle2' });
await sleep(3000);
await click('Jogar agora');
await sleep(2500);
await page.screenshot({ path: `${OUT}/launch.png`, fullPage: true });
for (const [tab, name] of [['Missões','missions'],['Oficina','upgrades'],['Loja','shop'],['Ranking','ranking'],['Diário','history']]) {
  await click(tab);
  await sleep(1800);
  if (name === 'missions') {
    // resgata e usa a primeira conquista como título
    const ok = await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Resgatar'); b?.click(); return !!b; });
    await sleep(800);
    await page.evaluate(() => [...document.querySelectorAll('button')].find(x=>x.textContent.includes('Usar título'))?.click());
    await sleep(800);
  }
  if (name === 'ranking') { await sleep(2500); await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }); await click('Evento:'); await sleep(3000); await page.screenshot({ path: `${OUT}/ranking-event.png`, fullPage: true }); continue; }
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}
console.log(JSON.stringify(errors.slice(0, 8)));
await b.close();
