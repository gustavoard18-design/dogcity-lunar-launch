import type { PlayerProfile } from '../types';
import { dropSession, getSession, isSessionError } from './auth';
import { rpc, submitEnabled } from './online';
import { migrateProfile, replaceProfile, storedProfile } from './storage';

/**
 * Progresso na nuvem (só carteiras verificadas). O aparelho grava sempre no
 * localStorage; alguns segundos depois de cada gravação a cópia sobe para o
 * servidor (função save_progress). Ao entrar, vale a cópia com a revisão maior:
 * num aparelho novo (ou depois de limpar o navegador) o progresso volta.
 */

const missingFn = (e: unknown) => String(e).includes('PGRST202');
const UPLOAD_DELAY_MS = 4000;

export type PullResult =
  | { kind: 'restored'; profile: PlayerProfile }
  | { kind: 'local' }
  | { kind: 'unavailable' };

/** Compara com a nuvem ao entrar. `restored` = a nuvem estava na frente e já foi gravada no aparelho. */
export async function pullCloud(address: string): Promise<PullResult> {
  const session = getSession(address);
  if (!submitEnabled || session?.kind !== 'wallet') return { kind: 'unavailable' };
  try {
    const cloud = await rpc<{ profile: PlayerProfile; revision: number } | null>('load_progress', { p_token: session.token });
    const local = storedProfile(address);
    if (cloud && cloud.profile?.address === address && cloud.revision > (local?.revision ?? 0)) {
      const profile = { ...migrateProfile(cloud.profile), revision: cloud.revision };
      replaceProfile(profile, cloud.revision);
      return { kind: 'restored', profile };
    }
    if (local) void uploadNow(address);
    return { kind: 'local' };
  } catch (e) {
    if (isSessionError(e)) dropSession(address);
    if (!missingFn(e)) console.warn('[cloud] leitura falhou', e);
    return { kind: 'unavailable' };
  }
}

async function uploadNow(address: string): Promise<boolean> {
  const session = getSession(address);
  const profile = storedProfile(address);
  if (!submitEnabled || session?.kind !== 'wallet' || !profile) return false;
  try {
    await rpc('save_progress', { p_token: session.token, p_profile: profile, p_revision: profile.revision ?? 0 }, 12000);
    return true;
  } catch (e) {
    if (isSessionError(e)) dropSession(address);
    if (!missingFn(e)) console.warn('[cloud] gravação falhou', e);
    return false;
  }
}

const timers = new Map<string, number>();

function schedule(address: string) {
  window.clearTimeout(timers.get(address));
  timers.set(
    address,
    window.setTimeout(() => {
      timers.delete(address);
      void uploadNow(address);
    }, UPLOAD_DELAY_MS)
  );
}

function flush() {
  for (const [address, timer] of timers) {
    window.clearTimeout(timer);
    timers.delete(address);
    void uploadNow(address);
  }
}

let started = false;

/** Liga o envio automático (uma vez por página). */
export function startCloudSync() {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('dogcity:saved', e => {
    const address = (e as CustomEvent<{ address: string }>).detail?.address;
    if (address && getSession(address)?.kind === 'wallet') schedule(address);
  });
  // Saindo da página: envia o que estiver esperando.
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
  window.addEventListener('pagehide', flush);
}
