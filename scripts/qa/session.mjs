// Login com assinatura e progresso na nuvem, de ponta a ponta, com carteiras
// simuladas que assinam de verdade (BIP-322) e um servidor simulado que confere
// a assinatura como a Edge Function `auth`.
// Uso: `VITE_SUBMIT_IN_DEV=1 npm run dev` em outro terminal, `npm i --no-save playwright bip322-js`
// e `node --experimental-strip-types scripts/qa/session.mjs`. As capturas vão para a pasta atual.
import { chromium } from 'playwright';
import { Signer, Verifier } from 'bip322-js';
import { checkSignInMessage } from '../../supabase/functions/_shared/auth-rules.ts';
const URL = process.env.QA_URL ?? 'http://localhost:5173';
const WIF = 'L3VFeEujGtevx9w18HD1fhRbCH67Az2dpCymeRE1SoPK6XQtaN2k';
const ME = 'bc1ppv609nr0vr25u07u95waq5lucwfm6tde4nydujnu8npg4q75mr5sxq8lt3';
const TOKEN = 'T'.repeat(43);
const b = await chromium.launch();
const out = [];
const log = (...a) => { console.log(...a); out.push(a.join(' ')); };

async function run(name, { canSign, cloud, xverse = false }) {
  const page = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.exposeFunction('nodeSign', msg => Signer.sign(WIF, ME, msg));
  if (xverse) await page.addInitScript(addr => {
    const provider = { async request(method, params) {
      if (method === 'getInfo') return { jsonrpc: '2.0', id: '1', result: { version: '1.0.0', methods: ['getAccounts', 'signMessage'], supports: [] } };
      if (method === 'getAccounts') return { jsonrpc: '2.0', id: '2', result: [{ address: addr, publicKey: '02bb', purpose: 'ordinals', addressType: 'p2tr', walletType: 'software' }] };
      if (method === 'signMessage') { window.__signParams = params; const signature = await window.nodeSign(params.message); return { jsonrpc: '2.0', id: '3', result: { signature, messageHash: 'x', address: params.address, protocol: params.protocol } }; }
      return { jsonrpc: '2.0', id: '9', error: { code: -32601, message: 'no' } };
    } };
    window.XverseProviders = { BitcoinProvider: provider };
    window.btc_providers = [{ id: 'XverseProviders.BitcoinProvider', name: 'Xverse Wallet', icon: '' }];
  }, ME);
  else await page.addInitScript(([addr, canSign]) => {
    window.krayWallet = { requestAccounts: async () => ({ success: true, address: addr }) };
    if (canSign) window.krayWallet.signMessage = async (msg, type) => ({ signature: await window.nodeSign(msg), type });
  }, [ME, canSign]);
  const seen = { auth: null, saves: [], chestBodies: [], rpcs: [] };
  await page.route('**/rest/v1/rpc/**', async r => {
    const fn = r.request().url().split('/rpc/')[1];
    const body = JSON.parse(r.request().postData() || '{}');
    seen.rpcs.push(fn);
    if (fn === 'load_progress') return r.fulfill({ json: body.p_token === TOKEN ? cloud : null });
    if (fn === 'save_progress') { seen.saves.push({ token: body.p_token === TOKEN, rev: body.p_revision, stardust: body.p_profile.stardust }); return r.fulfill({ json: body.p_revision }); }
    return r.fulfill({ json: [] });
  });
  await page.route('**/functions/v1/dog-balance**', r => r.fulfill({ json: { balance: 50000, rank: 900, dogcity: null, identity: null } }));
  await page.route('**/functions/v1/auth', async r => {
    const body = JSON.parse(r.request().postData() || '{}');
    const problem = checkSignInMessage(body.message, body.address);
    let ok = false; try { ok = Verifier.verifySignature(body.address, body.message, body.signature); } catch {}
    seen.auth = { problem, ok, kind: body.kind };
    if (problem || !ok) return r.fulfill({ status: 401, json: { error: 'assinatura inválida' } });
    return r.fulfill({ json: { token: TOKEN, kind: 'wallet', address: body.address, expiresAt: new Date(Date.now() + 86400e3).toISOString() } });
  });
  await page.route('**/functions/v1/chests**', async r => {
    const req = r.request();
    if (req.method() === 'GET') return r.fulfill({ json: { limits: { perDay: 1, perWeek: 5, usedToday: 0, usedThisWeek: 0 }, orders: [], paid: [] } });
    const body = JSON.parse(req.postData() || '{}');
    seen.chestBodies.push({ action: body.action, token: body.token === TOKEN });
    return r.fulfill({ json: { order: { id: '11111111-2222-3333-4444-555555555555', chest_id: 'supply', price_dog: 1500, status: 'pending', txid: null, reward: null, created_at: new Date().toISOString() } } });
  });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Connect Bitcoin wallet' }).click();
  await page.locator('div.flex.items-center.gap-3', { hasText: xverse ? 'Xverse' : 'Kray Wallet' }).getByRole('button', { name: 'Connect' }).click();
  await page.waitForTimeout(3000);
  const banner = await page.getByText('Verify your wallet').count();
  const toast = await page.getByText(/Progress restored from the cloud|Wallet verified/).allInnerTexts();
  const sd = await page.evaluate(a => JSON.parse(localStorage.getItem('dogcity_game_state'))[a]?.stardust, ME);
  await page.screenshot({ path: `${name}-hangar.png` });
  await page.getByRole('button', { name: 'Shop', exact: true }).click();
  await page.waitForTimeout(800);
  const buyDisabled = await page.getByRole('button', { name: 'Buy' }).first().isDisabled();
  await page.screenshot({ path: `${name}-shop.png`, clip: { x: 460, y: 150, width: 740, height: 520 } });
  if (!buyDisabled) { await page.getByRole('button', { name: 'Buy' }).first().click(); await page.waitForTimeout(800); }
  await page.waitForTimeout(5000); // envio para a nuvem (4 s depois da última gravação)
  log(`[${name}] auth=${JSON.stringify(seen.auth)} banner=${banner} toasts=${JSON.stringify(toast)} stardust=${sd} buyDisabled=${buyDisabled}`);
  log(`[${name}] chests=${JSON.stringify(seen.chestBodies)} saves=${JSON.stringify(seen.saves.slice(-2))} rpcs=${[...new Set(seen.rpcs)].join(',')}`);
  if (xverse) log(`[${name}] params:`, JSON.stringify(await page.evaluate(() => ({ ...window.__signParams, message: window.__signParams?.message.split('\n')[0] }))));
  log(`[${name}] erros: ${errors.join(' | ') || 'nenhum'}`);
  await page.close();
}

const cloudProfile = { revision: 999, profile: { address: ME, provider: 'Kray Wallet', stardust: 7777, lunarDust: 42, dog: { name: 'CloudRex', level: 7 }, launches: [], chestClaims: [] }, updated_at: new Date().toISOString() };
await run('assina', { canSign: true, cloud: cloudProfile });
await run('sem-assinatura', { canSign: false, cloud: null });
await run('xverse', { canSign: true, cloud: null, xverse: true });

// Termos na tela inicial
const page = await b.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Terms of Use' }).first().click();
await page.waitForTimeout(500);
log('[termos] janela:', await page.getByRole('dialog').count(), '· tem chances:', await page.getByText('Supply Crate · 1500 DOG').count());
await page.screenshot({ path: 'terms.png' });
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Privacy' }).first().click();
log('[privacidade] janela:', await page.getByRole('dialog').count());
await b.close();
