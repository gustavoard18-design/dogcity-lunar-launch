import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=swiftshader'] });
const p = await b.newPage();
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
for (const [name, ok, title, routeIdx] of [['card-ok', true, 'Rotina de Voo', 0], ['card-fail', false, '', 1]]) {
  const b64 = await p.evaluate(async (ok, title, routeIdx) => {
    const m = await import('/src/lib/shareCard.ts');
    const route = (await import('/src/lib/economy.ts')).ROUTES[routeIdx];
    const summary = { outcome: { score: ok ? 212 : 64, success: ok, aborted: false, launchQuality: 0.96, perfectLaunch: ok, orbs: 41, rings: 3, hits: ok ? 0 : 3, hullLeft: ok ? 3 : 0, hullMax: 3 }, quality: ok ? 0.85 : 0.26, stardustEarned: 21, xpGained: 31, lunarDustGained: 0, reputationGained: 5, levelsGained: 0, newLevel: 1, newBest: true, newAchievements: [] };
    const blob = await m.renderShareCard({ route, summary, pilotName: 'Orbittail', pilotTitle: title || undefined });
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return btoa(s);
  }, ok, title, routeIdx);
  fs.writeFileSync(`${name}.png`, Buffer.from(b64, 'base64'));
  console.log(name, 'ok');
}
await b.close();
