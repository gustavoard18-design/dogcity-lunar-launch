import { request } from '@sats-connect/core';
import type { PlayerProfile } from '../types';
import config from '../../supabase/functions/_shared/chests.json';
import { L, type Tr } from './i18n';

/**
 * Baús pagos com DOG: o conteúdo é sorteado no servidor com as chances de
 * supabase/functions/_shared/chests.json (as mesmas mostradas na Loja) e sempre
 * sai em Stardust e Pó Lunar. Limite de 1 por dia e 5 por semana por carteira.
 * O pagamento vai para a tesouraria e é conferido on-chain antes do prêmio.
 */

export type ChestConfig = (typeof config.chests)[number];
export interface ChestReward {
  stardust: number;
  lunarDust: number;
}

export const CHESTS: ChestConfig[] = config.chests;
export const CHEST_TREASURY = config.treasury;
export const CHEST_RUNE = config.rune;
export const CHEST_LIMITS = config.limits;

const NAMES: Record<string, Tr> = {
  supply: { en: 'Supply Crate', pt: 'Baú de Suprimentos', es: 'Cofre de Suministros' },
  orbital: { en: 'Orbital Chest', pt: 'Baú Orbital', es: 'Cofre Orbital' },
  legendary: { en: 'Legendary Chest', pt: 'Baú Lendário', es: 'Cofre Legendario' },
};
export const chestName = (id: string) => (NAMES[id] ? L(NAMES[id]) : id);
export const getChest = (id: string) => CHESTS.find(c => c.id === id);

/** Chance de cada resultado, em % (soma 100). */
export function chestOdds(chest: ChestConfig): { stardust: number; lunarDust: number; percent: number }[] {
  const total = chest.outcomes.reduce((s, o) => s + o.weight, 0);
  return chest.outcomes.map(o => ({ stardust: o.stardust, lunarDust: o.lunarDust, percent: (o.weight / total) * 100 }));
}

/** Credita o prêmio de um pedido pago uma única vez. `null` se já creditado. */
export function applyChestReward(profile: PlayerProfile, orderId: string, reward: ChestReward): PlayerProfile | null {
  if (profile.chestClaims.includes(orderId)) return null;
  const stardust = Math.max(0, Math.floor(Number(reward.stardust) || 0));
  const lunarDust = Math.max(0, Math.floor(Number(reward.lunarDust) || 0));
  return {
    ...profile,
    stardust: profile.stardust + stardust,
    lunarDust: profile.lunarDust + lunarDust,
    chestClaims: [orderId, ...profile.chestClaims].slice(0, 200),
    chestPending: profile.chestPending?.orderId === orderId ? undefined : profile.chestPending,
  };
}

export const isTxid = (v: string) => /^[0-9a-f]{64}$/.test(v.trim().toLowerCase());

// ── Servidor (Edge Function `chests`) ─────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://uknupldacjxbuoiaucfc.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_Mf-IQjrI81gzUgBZsodOyg_TmnTaWDR';
const FN = `${SUPABASE_URL}/functions/v1/chests`;

export interface ChestOrder {
  id: string;
  chest_id: string;
  price_dog: number;
  status: 'pending' | 'paid' | 'cancelled';
  txid: string | null;
  reward: ChestReward | null;
  created_at: string;
}

export interface ChestStatus {
  limits: { perDay: number; perWeek: number; usedToday: number; usedThisWeek: number };
  orders: ChestOrder[];
  /** Todos os pedidos pagos da carteira (para creditar em qualquer aparelho). */
  paid?: ChestOrder[];
}

async function call<T>(init: RequestInit & { query?: string } = {}): Promise<{ ok: boolean; status: number; body: T }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${FN}${init.query ?? ''}`, {
      ...init,
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      signal: ctrl.signal,
    });
    return { ok: res.ok, status: res.status, body: (await res.json().catch(() => ({}))) as T };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchChestStatus(address: string): Promise<ChestStatus | null> {
  try {
    const r = await call<ChestStatus>({ query: `?address=${encodeURIComponent(address)}` });
    return r.ok ? r.body : null;
  } catch {
    return null;
  }
}

export type OrderResult =
  | { kind: 'ok'; order: ChestOrder }
  | { kind: 'open'; order: ChestOrder }
  | { kind: 'limit' }
  | { kind: 'session' }
  | { kind: 'error' };

/** `token`: sessão da carteira assinada (lib/auth). O endereço segue para servidores antigos. */
export async function createChestOrder(token: string, address: string, chestId: string): Promise<OrderResult> {
  try {
    const r = await call<{ order?: ChestOrder; error?: string }>({ method: 'POST', body: JSON.stringify({ action: 'order', token, address, chestId }) });
    if (r.status === 401) return { kind: 'session' };
    if (r.ok && r.body.order) return { kind: 'ok', order: r.body.order };
    if (r.status === 409 && r.body.order) return { kind: 'open', order: r.body.order };
    if (r.status === 429) return { kind: 'limit' };
    return { kind: 'error' };
  } catch {
    return { kind: 'error' };
  }
}

export async function cancelChestOrder(token: string, orderId: string): Promise<boolean> {
  try {
    return (await call({ method: 'POST', body: JSON.stringify({ action: 'cancel', token, orderId }) })).ok;
  } catch {
    return false;
  }
}

export type ClaimResult =
  | { kind: 'paid'; order: ChestOrder }
  | { kind: 'waiting' }
  | { kind: 'rejected'; reason: string }
  | { kind: 'session' }
  | { kind: 'error'; reason?: string };

export async function claimChest(token: string, orderId: string, txid: string): Promise<ClaimResult> {
  try {
    const r = await call<{ status?: string; order?: ChestOrder; reason?: string; error?: string }>({
      method: 'POST',
      body: JSON.stringify({ action: 'claim', token, orderId, txid: txid.trim().toLowerCase() }),
    });
    if (r.status === 401) return { kind: 'session' };
    if (r.body.status === 'paid' && r.body.order?.reward) return { kind: 'paid', order: r.body.order };
    if (r.body.status === 'waiting') return { kind: 'waiting' };
    if (r.body.status === 'rejected') return { kind: 'rejected', reason: r.body.reason ?? '' };
    return { kind: 'error', reason: r.body.error };
  } catch {
    return { kind: 'error' };
  }
}

/**
 * Paga pela Xverse (sats-connect `runes_transfer`). O valor vai em DOG inteiro;
 * a carteira mostra o valor e o destino antes de assinar. Devolve o txid, ou
 * null se o jogador recusar ou a carteira não suportar.
 */
export async function payWithXverse(priceDog: number): Promise<string | null> {
  const res = await request('runes_transfer', {
    recipients: [{ runeName: CHEST_RUNE, amount: String(priceDog), address: CHEST_TREASURY }],
  });
  if (res.status !== 'success') return null;
  const txid = String(res.result.txid ?? '').toLowerCase();
  return isTxid(txid) ? txid : null;
}
