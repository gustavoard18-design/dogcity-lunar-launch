import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'], defaultViewport: { width: 1280, height: 720 } });
const page = await b.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => m.type() === 'error' && errors.push(m.text()));
await page.evaluateOnNewDocument(() => {
  // Tudo o que o jogo manda para os alto-falantes passa também por um medidor.
  const orig = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...rest) {
    if (dest instanceof AudioDestinationNode) {
      const ctx = dest.context;
      if (!ctx.__an) { ctx.__an = ctx.createAnalyser(); ctx.__an.fftSize = 2048; window.__ctx = ctx; }
      orig.call(this, ctx.__an);
    }
    return orig.call(this, dest, ...rest);
  };
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const click = async t => {
  await page.waitForFunction(t => [...document.querySelectorAll('button')].some(b => b.textContent.includes(t)), { timeout: 60000 }, t);
  const h = await page.evaluateHandle(t => [...document.querySelectorAll('button')].find(b => b.textContent.includes(t)), t);
  await h.click(); // clique real: conta como gesto para liberar o áudio
};
// Medidor na saída principal do jogo (mesmo módulo que o app usa).
const meter = async label => {
  const r = await page.evaluate(async () => {
    const ctx = window.__ctx;
    if (!ctx) return { state: 'sem contexto' };
    const a = { ctx };
    const an = ctx.__an, buf = new Float32Array(an.fftSize);
    let peak = 0, sum = 0, n = 0;
    const t0 = performance.now();
    while (performance.now() - t0 < 1500) {
      an.getFloatTimeDomainData(buf);
      for (const v of buf) { peak = Math.max(peak, Math.abs(v)); sum += v * v; n++; }
      await new Promise(r => setTimeout(r, 50));
    }
    return { state: a.ctx.state, rms: +Math.sqrt(sum / n).toFixed(4), peak: +peak.toFixed(3) };
  });
  console.log(label, JSON.stringify(r));
};
await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
await sleep(2500);
await click('Jogar agora');
await sleep(3500);
await meter('hangar');
await click('Órbita Baixa');
await sleep(6000);
await meter('base');
await click('Iniciar sequência'); await sleep(800);
await click('TRAVAR'); await sleep(800); await click('TRAVAR');
await sleep(12000);
await meter('voo');
console.log(JSON.stringify(errors.slice(0, 5)));
await b.close();
