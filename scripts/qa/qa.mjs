// QA funcional: fluxos de jogador de ponta a ponta.
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173';
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  defaultViewport: { width: 1280, height: 800 },
});
const page = await browser.newPage();
// Os scripts clicam nos botões pelo texto em português.
await page.evaluateOnNewDocument(() => localStorage.setItem('dogcity_lang', 'pt'));
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => m.type() === 'error' && errors.push(m.text()));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (name, ok, info = '') => {
  results.push({ name, ok, info });
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`);
};
const hasButton = t => page.evaluate(t => [...document.querySelectorAll('button')].some(b => b.textContent.includes(t) && !b.disabled), t);
const click = async (t, sel = 'button') => {
  await page.waitForFunction((t, s) => [...document.querySelectorAll(s)].some(b => b.textContent.includes(t)), { timeout: 30000 }, t, sel);
  await page.evaluate((t, s) => [...document.querySelectorAll(s)].find(b => b.textContent.includes(t)).click(), t, sel);
};
const profile = () =>
  page.evaluate(() => {
    const all = JSON.parse(localStorage.getItem('dogcity_game_state') || '{}');
    const addr = localStorage.getItem('dogcity_guest_address');
    return all[addr];
  });
const setProfile = patch =>
  page.evaluate(patch => {
    const all = JSON.parse(localStorage.getItem('dogcity_game_state'));
    const addr = localStorage.getItem('dogcity_guest_address');
    const p = all[addr];
    for (const [k, v] of Object.entries(patch)) {
      if (k === 'dog') Object.assign(p.dog, v);
      else p[k] = v;
    }
    localStorage.setItem('dogcity_game_state', JSON.stringify(all));
  }, patch);
const relogin = async () => {
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(1200);
  await click('Jogar agora');
  await sleep(1500);
};
const waitAim = () =>
  page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Iniciar sequência')), { timeout: 30000 });
const lockGood = async () => {
  await click('Iniciar sequência');
  await sleep(400);
  await page.waitForFunction(() => {
    const svg = document.querySelector('svg[viewBox="0 0 200 200"]');
    const zone = [...(svg?.querySelectorAll('path') ?? [])].find(p => p.getAttribute('stroke') === '#4ade80');
    const txt = svg?.parentElement?.querySelectorAll('span')[1]?.textContent;
    if (!zone || !txt) return false;
    const n = zone.getAttribute('d').match(/-?\d+(\.\d+)?/g).map(Number);
    const ang = (x, y) => (Math.atan2(180 - y, x - 20) * 180) / Math.PI;
    const a = parseFloat(txt);
    return a >= Math.min(ang(n[0], n[1]), ang(n[7], n[8])) && a <= Math.max(ang(n[0], n[1]), ang(n[7], n[8]));
  }, { polling: 'raf', timeout: 30000 });
  await click('TRAVAR');
  await sleep(400);
  await page.waitForFunction(() => {
    const zone = [...document.querySelectorAll('div')].find(d => d.className.includes?.('bg-amber-400/25'));
    const txt = [...document.querySelectorAll('span')].find(s => /^\d+%$/.test(s.textContent) && s.closest('.hud-panel')?.textContent.includes('FORÇA'));
    if (!zone || !txt) return false;
    const b = parseFloat(zone.style.bottom), h = parseFloat(zone.style.height), p = parseFloat(txt.textContent);
    return p >= b && p <= b + h;
  }, { polling: 'raf', timeout: 30000 });
  await click('TRAVAR');
};

await page.goto(URL, { waitUntil: 'networkidle2' });
await sleep(1500);
await click('Jogar agora');
await sleep(1500);
let p = await profile();
check('novo perfil criado com 150 Stardust', p?.stardust === 150, `stardust=${p?.stardust}`);
check('3 missões diárias', p?.dailyMissions?.length === 3);

// 1. Cancelar antes da decolagem reembolsa
await click('Órbita Baixa', 'button');
await waitAim();
p = await profile();
check('custo debitado ao entrar na missão', p.stardust === 140, `stardust=${p.stardust}`);
await click('Cancelar');
await sleep(1200);
p = await profile();
check('cancelar antes da decolagem reembolsa', p.stardust === 150, `stardust=${p.stardust}`);

// 2. Abortar durante o voo não reembolsa e conta como falha
await click('Órbita Baixa', 'button');
await waitAim();
await lockGood();
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Abortar')), { timeout: 30000 });
await sleep(800);
await click('Abortar');
await page.waitForFunction(() => document.body.innerText.includes('MISSÃO ABORTADA'), { timeout: 60000 });
p = await profile();
check('abortar registra voo de falha', p.launches.length === 1 && p.launches[0].success === false);
check('abortar não reembolsa', p.stardust <= 140 + 3, `stardust=${p.stardust}`);

// 3. Voar de novo cobra de novo e reinicia a missão
const before = p.stardust;
await click('Voar de novo');
await waitAim();
p = await profile();
check('"Voar de novo" cobra a rota e abre a mira', p.stardust === before - 10, `${before} -> ${p.stardust}`);

// 4. Voo completo (sem mexer: deve concluir se nenhum asteroide acertar; senão falha)
await lockGood();
const t0 = Date.now();
await page.waitForFunction(() => /MISSÃO CUMPRIDA|NAVE PERDIDA/.test(document.body.innerText), { timeout: 240000, polling: 1000 });
const outcome = await page.evaluate(() => (document.body.innerText.includes('MISSÃO CUMPRIDA') ? 'sucesso' : 'falha'));
p = await profile();
check('voo completo termina com tela de resultado', true, `${outcome} em ${Math.round((Date.now() - t0) / 1000)}s`);
check('histórico com 2 voos', p.launches.length === 2);
const launchMission = p.dailyMissions.find(m => m.missionId.startsWith('launch'));
if (launchMission) check('missão de lançamentos progride', launchMission.progress === 2, `progress=${launchMission.progress}`);

// 5. Volta ao hangar
await click('Hangar');
await sleep(1500);
check('botão Hangar volta ao hangar', await hasButton('Oficina'));

// 6. Compra de upgrade e de cosmético
await setProfile({ stardust: 1000 });
await relogin();
await click('Oficina');
await sleep(800);
await page.evaluate(() => {
  const h = [...document.querySelectorAll('h4')].find(x => x.textContent.startsWith('Precisão'));
  h.closest('div.p-4').querySelector('button').click();
});
await sleep(800);
p = await profile();
check('upgrade de Precisão comprado', p.dog.accuracy === 2 && p.stardust === 955, `acc=${p.dog.accuracy} stardust=${p.stardust}`);
await click('Loja');
await sleep(800);
await page.evaluate(() => [...document.querySelectorAll('h5')].find(h => h.textContent === 'Rastro Azul').closest('[role=button]').querySelector('button').click());
await sleep(800);
p = await profile();
check('rastro comprado e equipado pela Loja', p.dog.trail === 'trail_blue' && p.ownedCosmetics.includes('trail_blue'));
await page.evaluate(() => [...document.querySelectorAll('h5')].find(h => h.textContent === 'Rastro Azul').closest('[role=button]').querySelector('button').click());
await sleep(600);
p = await profile();
check('clicar em equipado desequipa', p.dog.trail === 'orange');

// 7. Missão completa -> resgatar
await page.evaluate(() => {
  const all = JSON.parse(localStorage.getItem('dogcity_game_state'));
  const p = all[localStorage.getItem('dogcity_guest_address')];
  p.dailyMissions[0].progress = 999;
  p.dailyMissions[0].completed = true;
  localStorage.setItem('dogcity_game_state', JSON.stringify(all));
});
await relogin();
await click('Missões');
await sleep(800);
const sBefore = (await profile()).stardust;
await click('Resgatar recompensa');
await sleep(800);
p = await profile();
check('resgatar missão credita e marca como resgatada', p.stardust > sBefore && p.dailyMissions[0].claimed, `${sBefore} -> ${p.stardust}`);

// 8. Troca de missões
const ids = (await profile()).dailyMissions.map(m => m.missionId).join();
await click('Trocar');
await sleep(800);
p = await profile();
check('trocar missões mantém a resgatada e troca as outras', p.dailyMissions.map(m => m.missionId).join() !== ids && p.dailyMissions.some(m => m.claimed));
check('troca só uma vez por dia', !(await hasButton('Trocar')));

// 9. Subir de nível desbloqueia rota
await setProfile({ dog: { level: 1, xp: 49, xpToNext: 50 } });
await relogin();
const locked = await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Mar da Tranquilidade'))?.disabled);
check('Mar da Tranquilidade bloqueado no nível 1', locked === true);
await setProfile({ dog: { level: 2, xp: 0, xpToNext: 75 } });
await relogin();
const unlocked = await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Mar da Tranquilidade'))?.disabled);
check('Mar da Tranquilidade liberado no nível 2', unlocked === false);

// 10. Treino grátis sem Stardust
await setProfile({ stardust: 3 });
await relogin();
check('Órbita Baixa mostra GRÁTIS sem Stardust', await page.evaluate(() => document.body.innerText.includes('GRÁTIS')));
await click('Órbita Baixa', 'button');
await waitAim();
p = await profile();
check('treino grátis não cobra', p.stardust === 3);
check('HUD indica treino gratuito', await page.evaluate(() => document.body.innerText.includes('Treino gratuito')));
await click('Cancelar');
await sleep(800);

// 11. Persistência e som
await page.reload({ waitUntil: 'networkidle2' });
await sleep(1000);
await click('Jogar agora');
await sleep(1200);
p = await profile();
check('progresso persiste após recarregar', p.launches.length === 2 && p.dog.level === 2);
await page.evaluate(() => document.querySelector('button[aria-label="Silenciar"]')?.click());
check('botão de som alterna e salva', await page.evaluate(() => localStorage.getItem('dogcity_muted') === '1'));

check('sem erros no console', errors.length === 0, errors.slice(0, 3).join(' | '));
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} verificações OK`);
await browser.close();
