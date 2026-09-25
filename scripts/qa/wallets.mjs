// Fluxos de conexão das carteiras com provedores simulados (mesmo formato das
// extensões reais): aprovar, recusar, endereço certo (Ordinals/Taproot) e a
// volta da OKX para a API própria. Não substitui o teste com as carteiras de
// verdade, mas pega erro do nosso lado.
import puppeteer from 'puppeteer-core';

const URL = process.env.QA_URL ?? 'http://localhost:5173';
const TAPROOT = 'bc1pqa7wallettest0000000000000000000000000000000000000000000';
const SEGWIT = 'bc1qqa7paymenttest000000000000000000000';

// Cada cenário roda antes do jogo carregar (evaluateOnNewDocument).
const SCENARIOS = {
  'kray: aprova': {
    wallet: 'Kray Wallet',
    expect: { provider: 'Kray Wallet', address: TAPROOT },
    inject: addr => {
      window.krayWallet = { requestAccounts: async () => ({ success: true, address: ` ${addr} ` }) };
    },
  },
  'kray: recusa': {
    wallet: 'Kray Wallet',
    expect: { error: /Kray rejected the connection/ },
    inject: () => {
      window.krayWallet = { requestAccounts: async () => ({ success: false }) };
    },
  },
  'xverse: aprova (usa o endereço Ordinals)': {
    wallet: 'Xverse',
    expect: { provider: 'Xverse', address: TAPROOT },
    inject: (addr, pay) => {
      const provider = {
        async request(method, params) {
          window.__calls = [...(window.__calls ?? []), method];
          if (method === 'getInfo') return { jsonrpc: '2.0', id: '1', result: { version: '1.0.0', methods: ['getAccounts'], supports: [] } };
          if (method === 'getAccounts') {
            if (!params?.purposes?.includes('ordinals')) return { jsonrpc: '2.0', id: '2', error: { code: -32602, message: 'sem ordinals' } };
            return {
              jsonrpc: '2.0',
              id: '2',
              result: [
                { address: pay, publicKey: '02aa', purpose: 'payment', addressType: 'p2wpkh', walletType: 'software' },
                { address: addr, publicKey: '02bb', purpose: 'ordinals', addressType: 'p2tr', walletType: 'software' },
              ],
            };
          }
          return { jsonrpc: '2.0', id: '3', error: { code: -32601, message: 'method not found' } };
        },
      };
      window.XverseProviders = { BitcoinProvider: provider };
      window.btc_providers = [{ id: 'XverseProviders.BitcoinProvider', name: 'Xverse Wallet', icon: '' }];
    },
  },
  'xverse: recusa': {
    wallet: 'Xverse',
    expect: { error: /Xverse rejected the connection/ },
    inject: () => {
      window.XverseProviders = {
        BitcoinProvider: {
          async request(method) {
            if (method === 'getInfo') return { jsonrpc: '2.0', id: '1', result: { version: '1.0.0', methods: ['getAccounts'], supports: [] } };
            return { jsonrpc: '2.0', id: '2', error: { code: -32000, message: 'User rejected the request.' } };
          },
        },
      };
      window.btc_providers = [{ id: 'XverseProviders.BitcoinProvider', name: 'Xverse Wallet', icon: '' }];
    },
  },
  'okx: só a API própria': {
    wallet: 'OKX Wallet',
    expect: { provider: 'OKX Wallet', address: TAPROOT },
    inject: addr => {
      window.okxwallet = { bitcoin: { connect: async () => ({ address: addr, publicKey: '02cc' }) } };
    },
  },
  'okx: sats-connect falha, cai na API própria': {
    wallet: 'OKX Wallet',
    expect: { provider: 'OKX Wallet', address: TAPROOT },
    inject: addr => {
      // Provedor registrado que não fala JSON-RPC (resposta desconhecida para o sats-connect).
      window.okxwallet = { bitcoin: { connect: async () => ({ address: addr, publicKey: '02cc' }), request: async () => ({ weird: true }) } };
      window.btc_providers = [{ id: 'okxwallet.bitcoin', name: 'OKX Wallet', icon: '' }];
    },
  },
  'okx: recusa no sats-connect não insiste': {
    wallet: 'OKX Wallet',
    expect: { error: /OKX Wallet rejected the connection/, ownApiNotCalled: true },
    inject: () => {
      window.okxwallet = {
        bitcoin: {
          connect: async () => {
            window.__ownApiCalled = true;
            return { address: 'nao-deveria' };
          },
          request: async method =>
            method === 'getInfo'
              ? { jsonrpc: '2.0', id: '1', result: { version: '1.0.0', methods: ['getAccounts'], supports: [] } }
              : { jsonrpc: '2.0', id: '2', error: { code: -32000, message: 'User rejected' } },
        },
      };
      window.btc_providers = [{ id: 'okxwallet.bitcoin', name: 'OKX Wallet', icon: '' }];
    },
  },
  'nenhuma instalada (computador)': {
    wallet: null,
    expect: { notInstalled: 3 },
    inject: () => {},
  },
};

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  protocolTimeout: 900000,
  args: ['--no-sandbox'],
  defaultViewport: { width: 1280, height: 900 },
});

let failed = 0;
for (const [name, sc] of Object.entries(SCENARIOS)) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.evaluateOnNewDocument(`localStorage.setItem('dogcity_lang', 'en'); (${sc.inject})(${JSON.stringify(TAPROOT)}, ${JSON.stringify(SEGWIT)});`);
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Connect Bitcoin wallet')).click());
  await new Promise(r => setTimeout(r, 400));

  const problems = [];
  if (sc.expect.notInstalled) {
    const n = await page.evaluate(() => [...document.querySelectorAll('div')].filter(d => d.textContent === 'Not installed').length);
    if (n !== sc.expect.notInstalled) problems.push(`esperava ${sc.expect.notInstalled} "Not installed", veio ${n}`);
  } else {
    // Clica em "Connect" na linha da carteira
    const clicked = await page.evaluate(wallet => {
      const row = [...document.querySelectorAll('div.flex.items-center.gap-3')].find(d => d.textContent.includes(wallet));
      const btn = row && [...row.querySelectorAll('button')].find(b => b.textContent.trim() === 'Connect');
      btn?.click();
      return Boolean(btn);
    }, sc.wallet);
    if (!clicked) problems.push(`sem botão Connect para ${sc.wallet} (detectada?)`);
    await new Promise(r => setTimeout(r, 1500));
    const state = await page.evaluate(() => ({
      footer: document.querySelector('footer')?.textContent ?? '',
      address: document.querySelector('p.font-mono')?.getAttribute('title') ?? '',
      error: document.querySelector('p.text-red-400')?.textContent ?? '',
      ownApiCalled: Boolean(window.__ownApiCalled),
    }));
    if (sc.expect.provider && !state.footer.includes(sc.expect.provider)) problems.push(`hangar sem "${sc.expect.provider}" (rodapé: "${state.footer}", erro: "${state.error}")`);
    if (sc.expect.address && state.address !== sc.expect.address) problems.push(`endereço "${state.address}" em vez de "${sc.expect.address}"`);
    if (sc.expect.error && !sc.expect.error.test(state.error)) problems.push(`erro esperado ${sc.expect.error}, veio "${state.error}"`);
    if (sc.expect.ownApiNotCalled && state.ownApiCalled) problems.push('chamou a API própria depois da recusa');
  }
  if (errors.length) problems.push(`erros de página: ${errors.join(' | ')}`);
  console.log(`${problems.length ? '✗' : '✓'} ${name}${problems.length ? '\n    ' + problems.join('\n    ') : ''}`);
  if (problems.length) failed++;
  await ctx.close();
}
await browser.close();
console.log(failed ? `\n${failed} cenário(s) falharam` : '\nTodos os cenários passaram');
process.exit(failed ? 1 : 0);
