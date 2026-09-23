import { AddressPurpose, getProviders, request } from '@sats-connect/core';
import type { WalletConnection } from '../types';

export type { WalletConnection };

/**
 * Carteiras Bitcoin suportadas — as mesmas do DogData (Kray, Xverse, OKX)
 * e a UniSat. Só lemos o endereço: nada é assinado nem enviado.
 */
export type WalletId = 'kray' | 'xverse' | 'okx' | 'unisat';

export interface WalletInfo {
  id: WalletId;
  name: string;
  installUrl: string;
  note?: string;
}

export const WALLETS: WalletInfo[] = [
  { id: 'kray', name: 'Kray Wallet', installUrl: 'https://www.kray.space', note: 'L1 + L2' },
  { id: 'xverse', name: 'Xverse', installUrl: 'https://www.xverse.app/download' },
  { id: 'okx', name: 'OKX Wallet', installUrl: 'https://www.okx.com/web3' },
  { id: 'unisat', name: 'UniSat', installUrl: 'https://unisat.io/download' },
];

interface KrayProvider {
  requestAccounts(): Promise<{ success?: boolean; address?: string }>;
}
interface UniSatProvider {
  requestAccounts(): Promise<string[]>;
}
interface OkxBitcoin {
  connect(): Promise<{ address: string }>;
}

declare global {
  interface Window {
    krayWallet?: KrayProvider;
    unisat?: UniSatProvider;
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

export function isWalletInstalled(id: WalletId): boolean {
  if (typeof window === 'undefined') return false;
  switch (id) {
    case 'kray': return !!window.krayWallet;
    case 'unisat': return !!window.unisat;
    case 'xverse': return !!satsProvider('xverse') || !!window.XverseProviders?.BitcoinProvider;
    case 'okx': return !!satsProvider('okx') || !!window.okxwallet?.bitcoin;
  }
}

/** Endereço Ordinals/Taproot (onde ficam as Runes), via sats-connect. */
async function satsConnectAddress(keyword: string, name: string): Promise<string> {
  const provider = satsProvider(keyword);
  const res = await request(
    'getAccounts',
    { purposes: [AddressPurpose.Ordinals, AddressPurpose.Payment], message: 'Conectar ao DogCity Lunar Launch (somente leitura do endereço)' },
    provider?.id
  );
  if (res.status !== 'success') throw new Error(`${name} recusou a conexão.`);
  const accounts = res.result;
  const ordinals = accounts.find(a => a.purpose === AddressPurpose.Ordinals) ?? accounts[0];
  if (!ordinals?.address) throw new Error(`${name} não retornou um endereço.`);
  return ordinals.address;
}

export async function connectWallet(id: WalletId): Promise<WalletConnection> {
  const info = WALLETS.find(w => w.id === id)!;
  if (!isWalletInstalled(id)) throw new Error(`${info.name} não encontrada. Instale a extensão ou jogue como convidado.`);
  let address = '';
  switch (id) {
    case 'kray': {
      const res = await window.krayWallet!.requestAccounts();
      if (!res?.success || !res.address) throw new Error('A Kray recusou a conexão. Abra a extensão e aprove este site.');
      address = res.address.trim();
      break;
    }
    case 'xverse':
      address = await satsConnectAddress('xverse', info.name);
      break;
    case 'okx':
      address = satsProvider('okx') ? await satsConnectAddress('okx', info.name) : (await window.okxwallet!.bitcoin!.connect()).address;
      break;
    case 'unisat': {
      const accounts = await window.unisat!.requestAccounts();
      address = accounts[0] ?? '';
      break;
    }
  }
  if (!address) throw new Error(`${info.name} não retornou um endereço.`);
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
  return { address, connected: true, provider: 'Convidado' };
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
