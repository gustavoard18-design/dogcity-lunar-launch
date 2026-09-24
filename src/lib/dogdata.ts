import type { DogDataIdentity } from '../types';

/**
 * Identidade DogData (dogdata.xyz): handle e avatar Ordinal que o jogador
 * escolheu no perfil de lá, lidos pela Edge Function dog-balance. Aqui só
 * validamos o formato e montamos os links; nada é assinado nem gravado.
 */

export const DOGDATA_URL = 'https://www.dogdata.xyz';

const HANDLE_RE = /^[a-z0-9_]{3,15}$/;
const INSCRIPTION_RE = /^[0-9a-f]{64}i\d{1,6}$/;

export const isDogDataHandle = (v: unknown): v is string => typeof v === 'string' && HANDLE_RE.test(v);
export const isInscriptionId = (v: unknown): v is string => typeof v === 'string' && INSCRIPTION_RE.test(v);

/** Aceita só handle e id de inscrição no formato certo; null se não sobrar nada. */
export function sanitizeIdentity(raw: unknown): DogDataIdentity | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const handle = isDogDataHandle(r.handle) ? r.handle : null;
  const avatarId = isInscriptionId(r.avatarId) ? r.avatarId : null;
  return handle || avatarId ? { handle, avatarId } : null;
}

/** Imagem da inscrição: ordinals.com e, se falhar, a cópia da UniSat (as mesmas do DogData). */
export const inscriptionImageUrls = (id: string) => [`https://ordinals.com/content/${id}`, `https://static.unisat.io/content/${id}`];

/** Página da carteira no DogData. */
export const dogDataProfileUrl = (address: string) => `${DOGDATA_URL}/address/bitcoin/${encodeURIComponent(address)}`;

/** Estrelas de prestígio do lote (1 a 5; fora disso, nenhuma). */
export function prestigeStars(prestige: unknown): number {
  return typeof prestige === 'number' && prestige >= 1 ? Math.min(5, Math.round(prestige)) : 0;
}
