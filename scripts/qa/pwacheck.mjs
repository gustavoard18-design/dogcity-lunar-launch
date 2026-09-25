import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=swiftshader'], protocolTimeout: 900000 });
const page = await b.newPage();
// Os scripts clicam nos botões pelo texto em português.
await page.evaluateOnNewDocument(() => localStorage.setItem('dogcity_lang', 'pt'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle2' });
await sleep(3000);
const cdp = await page.createCDPSession();
const manifest = await cdp.send('Page.getAppManifest');
console.log('manifest errors', JSON.stringify(manifest.errors), 'url', manifest.url);
const inst = await cdp.send('Page.getInstallabilityErrors');
console.log('installability', JSON.stringify(inst.installabilityErrors));
console.log('sw', await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return r ? r.active?.state ?? 'sem active' : 'nenhum'; }));
await page.reload({ waitUntil: 'networkidle2' });
await sleep(2000);
console.log('controlado', await page.evaluate(() => !!navigator.serviceWorker.controller));
// O nome do cache muda a cada build (dogcity-<carimbo>).
console.log('cache', await page.evaluate(async () => { const names = (await caches.keys()).filter(k => k.startsWith('dogcity-')); return { names, files: names.length ? (await (await caches.open(names[0])).keys()).length : 0 }; }));
await page.setOfflineMode(true);
await page.reload({ waitUntil: 'domcontentloaded' });
await sleep(4000);
console.log('offline texto', JSON.stringify(await page.evaluate(() => document.body.innerText.slice(0, 120))));
await page.screenshot({ path: process.argv[2] ?? 'offline.png' });
await b.close();
