import type { LeaderboardEntry, Tier } from '../types';

/**
 * Backend online (Supabase): ranking semanal e saldo real de DOG.
 * A chave publicável é pública por design; as regras ficam no banco
 * (funções submit_score / weekly_leaderboard) e o segredo da UniSat
 * fica só na Edge Function dog-balance.
 * Sem rede ou com o backend fora do ar, o jogo segue no modo local.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://uknupldacjxbuoiaucfc.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_Mf-IQjrI81gzUgBZsodOyg_TmnTaWDR';

export const onlineEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY);

const headers = () => ({ apikey: SUPABASE_KEY, 'Content-Type': 'application/json' });

async function rpc<T>(fn: string, args: Record<string, unknown>, timeoutMs = 8000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(args),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`${fn}: HTTP ${res.status} ${await res.text().catch(() => '')}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export interface ScoreSubmission {
  address: string;
  dogName: string;
  tier: Tier;
  routeId: string;
  score: number;
}

/** Envia um voo concluído. Falhas são silenciosas: o ranking local continua valendo. */
export async function submitScore(s: ScoreSubmission): Promise<boolean> {
  if (!onlineEnabled) return false;
  try {
    await rpc('submit_score', { p_address: s.address, p_dog_name: s.dogName, p_tier: s.tier, p_route: s.routeId, p_score: s.score });
    return true;
  } catch (e) {
    console.warn('[online] envio de score falhou', e);
    return false;
  }
}

interface LeaderboardRow {
  address: string;
  dog_name: string;
  tier: Tier;
  week_score: number;
  best_score: number;
  total_launches: number;
}

/** Top da semana no servidor. Lança erro se o servidor não responder. */
export async function fetchWeeklyLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const rows = await rpc<LeaderboardRow[]>('weekly_leaderboard', { p_limit: limit });
  return rows.map(r => ({
    address: r.address,
    dogName: r.dog_name,
    tier: r.tier,
    weekScore: r.week_score,
    bestScore: r.best_score,
    totalLaunches: Number(r.total_launches),
  }));
}

/** Saldo real da Rune DOG (via Edge Function). `null` se indisponível. */
export async function fetchDogBalance(address: string): Promise<number | null> {
  if (!onlineEnabled) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/dog-balance?address=${encodeURIComponent(address)}`, {
      headers: { apikey: SUPABASE_KEY },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { balance?: number };
    return typeof body.balance === 'number' ? body.balance : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
