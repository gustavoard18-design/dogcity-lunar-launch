// Tempo até o botão "Play now" aparecer, num celular com rede limitada e cache vazio.
// Uso: node scripts/qa/loadtime.mjs [url]   (padrão: o jogo publicado)
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'https://dogcity-lunar-launch.vercel.app/';
// Perfis de rede (download/upload em bytes/s, latência em ms), no estilo do Lighthouse.
const NETWORKS = {
  '4G': { download: (9 * 1024 * 1024) / 8, upload: (1.5 * 1024 * 1024) / 8, latency: 170 },
  '4G lento': { download: (1.6 * 1024 * 1024) / 8, upload: (750 * 1024) / 8, latency: 150 },
};

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox'],
});

for (const [name, net] of Object.entries(NETWORKS)) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const cdp = await page.createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  // Não fala com o Supabase: a visita do teste não entra nas métricas nem no ranking.
  await cdp.send('Network.setBlockedURLs', { urls: ['*supabase.co*'] });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, downloadThroughput: net.download, uploadThroughput: net.upload, latency: net.latency });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); // celular médio

  let bytes = 0;
  const big = [];
  cdp.on('Network.loadingFinished', e => (bytes += e.encodedDataLength));
  const urls = new Map();
  cdp.on('Network.responseReceived', e => urls.set(e.requestId, e.response.url));
  cdp.on('Network.loadingFinished', e => {
    if (e.encodedDataLength > 50_000) big.push(`${Math.round(e.encodedDataLength / 1024)} KB ${urls.get(e.requestId)?.replace(/^https?:\/\/[^/]+\//, '')}`);
  });

  const t0 = Date.now();
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Play now|Jogar agora|Jugar ahora/.test(b.textContent)), { timeout: 120000, polling: 100 });
  const playAt = Date.now() - t0;
  const bytesAtPlay = bytes;
  const fcp = await page.evaluate(() => performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null);
  console.log(`\n[${name}] botão "Play now" em ${(playAt / 1000).toFixed(1)} s · primeira pintura em ${fcp ? (fcp / 1000).toFixed(1) + ' s' : '—'} · ${Math.round(bytesAtPlay / 1024)} KB baixados até lá`);
  console.log('  arquivos grandes: ' + big.join(' | '));
  // Quem lê a tela por ~4 s e toca em "Play now": quanto falta para o primeiro voo abrir.
  await new Promise(r => setTimeout(r, 4000));
  const t1 = Date.now();
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /Play now|Jogar agora|Jugar ahora/.test(b.textContent)).click());
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Start sequence|Iniciar sequência|Iniciar secuencia/.test(b.textContent)), { timeout: 120000, polling: 100 });
  console.log(`  toque em "Play now" → primeiro voo pronto em ${((Date.now() - t1) / 1000).toFixed(1)} s · ${Math.round(bytes / 1024)} KB no total`);
  await ctx.close();
}
await browser.close();
