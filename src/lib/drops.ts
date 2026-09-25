import config from '../../supabase/functions/_shared/drops.json';

/**
 * DOG no voo: metade do valor dos baús pagos forma um prêmio acumulado, e voos
 * de carteiras verificadas têm uma chance baixa de ter uma moeda de DOG. O
 * servidor (Edge Function `dog-drops`) sorteia na decolagem; o jogo só mostra
 * a moeda e avisa quando o piloto pega. O DOG é enviado pela tesouraria depois.
 */

export const DROP_RULES = config;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://uknupldacjxbuoiaucfc.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_Mf-IQjrI81gzUgBZsodOyg_TmnTaWDR';
const FN = `${SUPABASE_URL}/functions/v1/dog-drops`;

export interface FlightDrop {
  ticketId: string;
  /** DOG da moeda deste voo (null = voo sem moeda). */
  amount: number | null;
  /** Fração do percurso em que a moeda aparece. */
  at: number;
}

export interface DogDropRecord {
  id: string;
  amount_dog: number;
  status: 'pending' | 'paid' | 'cancelled';
  txid?: string | null;
  created_at: string;
}

export interface JackpotInfo {
  poolDog: number;
  awardedDog: number;
  paidDog: number;
  drops: number;
  recent: { address: string; amount_dog: number; status: string; created_at: string }[];
  mine: DogDropRecord[];
}

async function call<T>(init: RequestInit & { query?: string; timeoutMs?: number } = {}): Promise<{ ok: boolean; status: number; body: T }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), init.timeoutMs ?? 10000);
  try {
    const res = await fetch(`${FN}${init.query ?? ''}`, { ...init, headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' }, signal: ctrl.signal });
    return { ok: res.ok, status: res.status, body: (await res.json().catch(() => ({}))) as T };
  } finally {
    clearTimeout(timer);
  }
}

/** Bilhete do voo (carteira verificada). `null` se o servidor não responder: o voo segue sem moeda. */
export async function startFlightTicket(token: string, routeId: string): Promise<FlightDrop | null> {
  try {
    const r = await call<{ ticketId?: string; drop?: { amount: number; at: number } | null }>({
      method: 'POST',
      body: JSON.stringify({ action: 'start', token, routeId }),
      timeoutMs: 8000,
    });
    if (!r.ok || !r.body.ticketId) return null;
    const drop = r.body.drop;
    const amount = drop && Number(drop.amount) > 0 ? Math.floor(Number(drop.amount)) : null;
    return { ticketId: r.body.ticketId, amount, at: Math.min(0.9, Math.max(0.1, Number(drop?.at) || 0.5)) };
  } catch {
    return null;
  }
}

export type ClaimDropResult = { kind: 'ok'; drop: DogDropRecord } | { kind: 'retry' } | { kind: 'error'; reason?: string };

/** Registra a moeda pega. `retry` = voo curto demais ainda; tente de novo no fim do voo. */
export async function claimFlightDrop(token: string, ticketId: string): Promise<ClaimDropResult> {
  try {
    const r = await call<{ drop?: DogDropRecord; error?: string }>({ method: 'POST', body: JSON.stringify({ action: 'claim', token, ticketId }) });
    if (r.ok && r.body.drop) return { kind: 'ok', drop: r.body.drop };
    if (r.status === 425 || r.status >= 500 || r.status === 0) return { kind: 'retry' };
    return { kind: 'error', reason: r.body.error };
  } catch {
    return { kind: 'retry' };
  }
}

export async function fetchJackpot(address?: string): Promise<JackpotInfo | null> {
  try {
    const r = await call<JackpotInfo>({ query: address ? `?address=${encodeURIComponent(address)}` : '' });
    return r.ok && typeof r.body.poolDog === 'number' ? r.body : null;
  } catch {
    return null;
  }
}
