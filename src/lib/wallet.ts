import type { WalletConnection } from '../types';

export type { WalletConnection };

const MOCK_ADDRESSES = [
  'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
  'bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3',
];

export function generateMockAddress(): string {
  const idx = Math.floor(Math.random() * MOCK_ADDRESSES.length);
  return MOCK_ADDRESSES[idx];
}

export function getMockDogBalance(address: string): number {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    const char = address.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % 15000;
}

export async function connectWallet(): Promise<WalletConnection> {
  await new Promise(resolve => setTimeout(resolve, 1500));
  const address = generateMockAddress();
  return {
    address,
    connected: true,
    provider: 'MockWallet (UniSat)',
  };
}
