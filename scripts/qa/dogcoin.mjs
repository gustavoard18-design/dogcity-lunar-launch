// Moeda de DOG no voo, de ponta a ponta, com o servidor simulado.
//
// Roda contra o jogo em modo "qa" (npx vite --mode qa --port 5174): o jogo
// aponta para https://qa-mock.invalid e este script responde cada chamada.
// Nada vai para o Supabase de verdade. Cenários:
//   1. carteira verificada pega a moeda e conclui o voo: o resultado mostra
//      "conferindo" e depois "registrados" (o servidor responde 425 uma vez,
//      como quando o score ainda está chegando);
//   2. pega a moeda e aborta: o resultado diz que a moeda voltou para o prêmio.
// A moeda nasce perto da nave num ponto sorteado; durante o voo o sorteio do
// navegador fica fixo no meio, então ela aparece no centro, onde a nave está.
import puppeteer from 'puppeteer-core';

const URL = process.env.QA_URL ?? 'http://localhost:5174';
const MOCK = 'https://qa-mock.invalid';
const ADDRESS = 'bc1pqa0dogcoin0000000000000000000000000000000000000000000000';
const TICKET = '11111111-1111-4111-8111-111111111111';
const AMOUNT = 350;

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  protocolTimeout: 900000,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  defaultViewport: { width: 1000, height: 640 },
});
const page = await browser.newPage();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (name, ok, info = '') => {
  results.push(ok);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`);
};
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => m.type() === 'error' && !/qa-mock|Failed to load resource/.test(m.text()) && errors.push(m.text()));

// ── Servidor simulado ──────────────────────────────────────────────────────
const calls = [];
let claims = 0;
const leaked = [];
await page.setRequestInterception(true);
page.on('request', req => {
  const url = req.url();
  if (/supabase\.co|dogdata\.xyz/.test(url)) {
    leaked.push(url);
    return req.abort();
  }
  if (!url.startsWith(MOCK)) return req.continue();
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
  const json = (body, status = 200) => req.respond({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
  if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers: cors, body: '' });
  const path = url.slice(MOCK.length);
  const body = req.postData() ? JSON.parse(req.postData()) : {};
  calls.push(`${req.method()} ${path.split('?')[0]}${body.action ? ' ' + body.action : ''}`);
  if (path.startsWith('/functions/v1/dog-balance?addresses=')) return json({ identities: {} });
  if (path.startsWith('/functions/v1/dog-balance')) return json({ balance: 5000, rank: 42, dogcity: { status: 'not_in_snapshot' }, identity: null });
  if (path.startsWith('/functions/v1/chests')) return json({ limits: { perDay: 1, perWeek: 5, usedToday: 0, usedThisWeek: 0 }, orders: [], paid: [] });
  if (path.startsWith('/functions/v1/dog-drops')) {
    if (req.method() === 'GET') return json({ poolDog: 10000, awardedDog: 0, paidDog: 0, drops: 0, recent: [], mine: [] });
    if (body.action === 'start') return json({ ticketId: TICKET, drop: { amount: AMOUNT, at: 0.08 } });
    if (body.action === 'claim') {
      claims++;
      // A primeira tentativa chega antes do score: o servidor pede para tentar de novo.
      if (claims === 1) return json({ error: 'voo não concluído' }, 425);
      return json({ drop: { id: 'd1', amount_dog: AMOUNT, status: 'pending', created_at: new Date().toISOString() } });
    }
  }
  if (path.startsWith('/rest/v1/rpc/load_progress')) return json(null);
  if (path.startsWith('/rest/v1/rpc/')) return json(path.includes('submit_score') || path.includes('save_progress') ? true : []);
  return json({ error: 'sem mock' }, 404);
});

// Piloto com carteira verificada (sessão guardada) que reabre direto no hangar.
await page.evaluateOnNewDocument(address => {
  localStorage.setItem('dogcity_lang', 'pt');
  localStorage.setItem(`dogcity_tutorial_done_${address}`, '1');
  localStorage.setItem('dogcity_sessions', JSON.stringify({ [address]: { token: 'qa_mock_token_0123456789abcdefghijklmno', kind: 'wallet', expiresAt: '2099-01-01T00:00:00.000Z' } }));
  sessionStorage.setItem('dogcity_resume', JSON.stringify({ address, provider: 'Xverse' }));
}, ADDRESS);

const click = async (t, sel = 'button') => {
  await page.waitForFunction((t, s) => [...document.querySelectorAll(s)].some(b => b.textContent.includes(t) && !b.disabled), { timeout: 120000 }, t, sel);
  await page.evaluate((t, s) => [...document.querySelectorAll(s)].find(b => b.textContent.includes(t) && !b.disabled).click(), t, sel);
};
const text = () => page.evaluate(() => document.body.innerText);
const waitText = (re, timeout = 600000) => page.waitForFunction(r => new RegExp(r).test(document.body.innerText), { timeout, polling: 1000 }, re.source);

// Trava a mira e a força dentro das zonas (lançamento bom = voo com pontos).
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
  }, { polling: 'raf', timeout: 60000 }).catch(() => {});
  await click('TRAVAR');
  await sleep(400);
  await page.waitForFunction(() => {
    const zone = [...document.querySelectorAll('div')].find(d => d.className.includes?.('bg-amber-400/25'));
    const txt = [...document.querySelectorAll('span')].find(s => /^\d+%$/.test(s.textContent) && s.closest('.hud-panel')?.textContent.includes('FORÇA'));
    if (!zone || !txt) return false;
    const b = parseFloat(zone.style.bottom), h = parseFloat(zone.style.height), p = parseFloat(txt.textContent);
    return p >= b && p <= b + h;
  }, { polling: 'raf', timeout: 60000 }).catch(() => {});
  await click('TRAVAR');
  // Sorteio fixo no meio: a moeda nasce no centro da tela, na frente da nave.
  await page.evaluate(() => {
    window.__random = window.__random ?? Math.random;
    Math.random = () => 0.5;
  });
};

await page.goto(URL, { waitUntil: 'networkidle2' });
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Órbita Baixa')), { timeout: 120000 });
check('carteira verificada abre no hangar', true);
await waitText(/Saldo DOG[\s\S]{0,40}on-chain/, 60000).catch(() => {});
check('saldo DOG lido (simulado) aparece como on-chain', /Saldo DOG[\s\S]{0,40}on-chain[\s\S]{0,20}5\.000/.test(await text()));

// Piloto reforçado (casco 5, mais escudos e ímã): o voo com a moeda tende a chegar ao fim.
await page.evaluate(address => {
  const all = JSON.parse(localStorage.getItem('dogcity_game_state'));
  Object.assign(all[address].dog, { power: 10, accuracy: 10, luck: 10, speed: 10 });
  localStorage.setItem('dogcity_game_state', JSON.stringify(all));
}, ADDRESS);
await page.reload({ waitUntil: 'networkidle2' });
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Órbita Baixa')), { timeout: 120000 });

// Cenário 1: pega a moeda e conclui (até 3 tentativas: um asteroide pode derrubar a nave)
let completed = false;
for (let attempt = 1; attempt <= 3 && !completed; attempt++) {
  if (attempt === 1) await click('Órbita Baixa');
  else {
    await page.evaluate(() => (Math.random = window.__random));
    await click('Voar de novo');
  }
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Iniciar sequência')), { timeout: 120000 });
  if (attempt === 1) check('bilhete do voo pedido na entrada', calls.some(c => c.includes('dog-drops start')));
  await lockGood();
  await waitText(/\+350 DOG/, 600000);
  if (attempt === 1) {
    check('moeda aparece e é pega no voo', true, 'popup +350 DOG');
    check('popup avisa o mínimo de pontos', /Conclua o voo com 20% dos pontos ou mais/.test(await text()));
  }
  await waitText(/MISSÃO CUMPRIDA|NAVE PERDIDA/, 900000);
  const first = await text();
  if (/MISSÃO CUMPRIDA/.test(first)) {
    completed = true;
    check('resultado mostra a moeda', /MOEDA DE DOG/.test(first));
    const low = /precisa de um voo com 20% dos pontos/.test(first);
    if (low) check('voo abaixo de 20%: resultado explica e não pede resgate', claims === 0);
    else {
      await waitText(/350 DOG registrados/, 90000).catch(() => {});
      const after = await text();
      check('depois do 425 o jogo tenta de novo e registra', /\+350 DOG registrados! A tesouraria envia/.test(after), `tentativas de resgate=${claims}`);
      check('score enviado antes do resgate', calls.findIndex(c => c.includes('submit_score_v3')) < calls.findIndex(c => c.includes('dog-drops claim')));
    }
  } else if (attempt === 1) {
    check('nave perdida: resultado diz que a moeda voltou ao prêmio', /só vale com o voo concluído/.test(first));
    check('sem resgate quando o voo não conclui', claims === 0);
  }
}
check('um voo com a moeda chegou ao fim', completed);

// Cenário 2: pega a moeda e aborta
await page.evaluate(() => (Math.random = window.__random)); // volta ao sorteio de verdade entre os voos
await click('Voar de novo');
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Iniciar sequência')), { timeout: 120000 });
await lockGood();
const claimsBefore = claims;
await waitText(/\+350 DOG/, 600000);
await click('Abortar');
await waitText(/MISSÃO ABORTADA/, 120000);
const aborted = await text();
check('abortar com a moeda: volta ao prêmio', /A moeda de 350 DOG só vale com o voo concluído/.test(aborted));
check('abortar não pede resgate', claims === claimsBefore);

check('nada saiu para o Supabase ou o DogData de verdade', leaked.length === 0, leaked.slice(0, 2).join(' '));
check('sem erros no console', errors.length === 0, errors.slice(0, 3).join(' | '));
const failed = results.filter(ok => !ok).length;
console.log(`\n${results.length - failed}/${results.length} verificações OK`);
await browser.close();
process.exit(failed ? 1 : 0);
