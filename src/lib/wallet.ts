import { AddressPurpose, RpcErrorCode, getProviders, request } from '@sats-connect/core';
import type { WalletConnection } from '../types';
import { GUEST_PROVIDER } from './storage';
import { L } from './i18n';

export type { WalletConnection };

/**
 * Carteiras Bitcoin suportadas — as mesmas do DogData (Kray, Xverse, OKX).
 * Só lemos o endereço: nada é assinado nem enviado.
 */
export type WalletId = 'kray' | 'xverse' | 'okx';

export interface WalletInfo {
  id: WalletId;
  name: string;
  installUrl: string;
  note?: string;
  /** Link que abre o jogo no navegador interno do app da carteira (celular). */
  appLink?: (gameUrl: string) => string;
}

export const WALLETS: WalletInfo[] = [
  { id: 'kray', name: 'Kray Wallet', installUrl: 'https://www.kray.space', note: 'L1 + L2' },
  {
    id: 'xverse',
    name: 'Xverse',
    installUrl: 'https://www.xverse.app/download',
    appLink: url => `https://connect.xverse.app/browser?url=${encodeURIComponent(url)}`,
  },
  {
    id: 'okx',
    name: 'OKX Wallet',
    installUrl: 'https://www.okx.com/web3',
    appLink: url => `https://web3.okx.com/download?deeplink=${encodeURIComponent(`okx://wallet/dapp/url?dappUrl=${encodeURIComponent(url)}`)}`,
  },
];

interface KrayProvider {
  requestAccounts(): Promise<{ success?: boolean; address?: string }>;
}
interface OkxBitcoin {
  connect(): Promise<{ address: string }>;
}

declare global {
  interface Window {
    krayWallet?: KrayProvider;
    okxwallet?: { bitcoin?: OkxBitcoin };
  }
}

/** Provedor sats-connect (Xverse, OKX…) cujo nome/id contém a palavra-chave. */
function satsProvider(keyword: string) {
  try {
    return getProviders().find(p => `${p.id} ${p.name}`.toLowerCase().includes(keyword));
  } catch {
    return undefined;
  }
}

/** Celular ou tablet: extensões não existem, a carteira abre o jogo no próprio app. */
export function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
}

export function isWalletInstalled(id: WalletId): boolean {
  if (typeof window === 'undefined') return false;
  switch (id) {
    case 'kray': return !!window.krayWallet;
    case 'xverse': return !!satsProvider('xverse') || !!window.XverseProviders?.BitcoinProvider;
    case 'okx': return !!satsProvider('okx') || !!window.okxwallet?.bitcoin;
  }
}

/** Endereço Ordinals/Taproot (onde ficam as Runes), via sats-connect. */
async function satsConnectAddress(keyword: string, name: string): Promise<string> {
  const provider = satsProvider(keyword);
  const res = await request(
    'getAccounts',
    { purposes: [AddressPurpose.Ordinals, AddressPurpose.Payment], message: L({ en: 'Connect to DogCity Lunar Launch (read-only access to your address)', pt: 'Conectar ao DogCity Lunar Launch (somente leitura do endereço)', es: 'Conectar a DogCity Lunar Launch (solo lectura de la dirección)' }) },
    provider?.id
  );
  if (res.status !== 'success') {
    // Só a recusa do jogador é recusa; outros erros (ex.: provedor que não fala o
    // protocolo do sats-connect) deixam a OKX tentar a API própria.
    if (res.error.code === RpcErrorCode.USER_REJECTION) {
      throw Object.assign(new Error(L({ en: `${name} rejected the connection.`, pt: `${name} recusou a conexão.`, es: `${name} rechazó la conexión.` })), { rejected: true });
    }
    throw new Error(L({ en: `${name} could not connect (${res.error.message}).`, pt: `${name} não conseguiu conectar (${res.error.message}).`, es: `${name} no pudo conectar (${res.error.message}).` }));
  }
  const accounts = res.result;
  const ordinals = accounts.find(a => a.purpose === AddressPurpose.Ordinals) ?? accounts[0];
  if (!ordinals?.address) throw new Error(L({ en: `${name} did not return an address.`, pt: `${name} não retornou um endereço.`, es: `${name} no devolvió una dirección.` }));
  return ordinals.address;
}

/** OKX: sats-connect quando registrada; senão (ou se falhar sem o usuário recusar), a API própria. */
async function okxAddress(name: string): Promise<string> {
  const own = window.okxwallet?.bitcoin;
  if (satsProvider('okx')) {
    try {
      return await satsConnectAddress('okx', name);
    } catch (e) {
      if (!own || (e as { rejected?: boolean }).rejected) throw e;
    }
  }
  if (!own) throw new Error(L({ en: `${name} not found.`, pt: `${name} não encontrada.`, es: `${name} no encontrada.` }));
  const res = await own.connect();
  return res?.address ?? '';
}

export async function connectWallet(id: WalletId): Promise<WalletConnection> {
  const info = WALLETS.find(w => w.id === id)!;
  if (!isWalletInstalled(id)) throw new Error(L({ en: `${info.name} not found. Install the extension or play as a guest.`, pt: `${info.name} não encontrada. Instale a extensão ou jogue como convidado.`, es: `${info.name} no encontrada. Instala la extensión o juega como invitado.` }));
  let address = '';
  switch (id) {
    case 'kray': {
      const res = await window.krayWallet!.requestAccounts();
      if (!res?.success || !res.address) throw new Error(L({ en: 'Kray rejected the connection. Open the extension and approve this site.', pt: 'A Kray recusou a conexão. Abra a extensão e aprove este site.', es: 'Kray rechazó la conexión. Abre la extensión y aprueba este sitio.' }));
      address = res.address.trim();
      break;
    }
    case 'xverse':
      address = await satsConnectAddress('xverse', info.name);
      break;
    case 'okx':
      address = await okxAddress(info.name);
      break;
  }
  if (!address) throw new Error(L({ en: `${info.name} did not return an address.`, pt: `${info.name} não retornou um endereço.`, es: `${info.name} no devolvió una dirección.` }));
  return { address, connected: true, provider: info.name };
}

const GUEST_KEY = 'dogcity_guest_address';
const BECH32 = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

function generateGuestAddress(): string {
  const bytes = new Uint8Array(38);
  crypto.getRandomValues(bytes);
  return 'bc1q' + Array.from(bytes, b => BECH32[b % 32]).join('');
}

/** Endereço de convidado único por navegador, persistido para o progresso não se perder. */
export async function connectGuest(): Promise<WalletConnection> {
  let address: string | null = null;
  try {
    address = localStorage.getItem(GUEST_KEY);
    if (!address) {
      address = generateGuestAddress();
      localStorage.setItem(GUEST_KEY, address);
    }
  } catch {
    address = generateGuestAddress();
  }
  await new Promise(resolve => setTimeout(resolve, 600));
  return { address, connected: true, provider: GUEST_PROVIDER };
}

/** Saldo DOG simulado para convidados (estável por endereço). */
export function getMockDogBalance(address: string): number {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = (hash << 5) - hash + address.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 15000;
}
