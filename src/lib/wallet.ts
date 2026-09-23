import type { WalletConnection } from '../types';

export type { WalletConnection };

interface UniSatProvider {
  requestAccounts(): Promise<string[]>;
  getAccounts(): Promise<string[]>;
}

declare global {
  interface Window {
    unisat?: UniSatProvider;
  }
}

const GUEST_KEY = 'dogcity_guest_address';
const BECH32 = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

export function hasUniSat(): boolean {
  return typeof window !== 'undefined' && !!window.unisat;
}

/** Conecta de verdade na extensão UniSat, se instalada. */
export async function connectUniSat(): Promise<WalletConnection> {
  if (!window.unisat) throw new Error('UniSat não encontrada. Instale a extensão ou jogue como convidado.');
  const accounts = await window.unisat.requestAccounts();
  if (!accounts[0]) throw new Error('Nenhuma conta autorizada na UniSat.');
  return { address: accounts[0], connected: true, provider: 'UniSat' };
}

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

/** Saldo DOG simulado, estável por endereço (ainda não há leitura on-chain de Runes). */
export function getMockDogBalance(address: string): number {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = (hash << 5) - hash + address.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 15000;
}
