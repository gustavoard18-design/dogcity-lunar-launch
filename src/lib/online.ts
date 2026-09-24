import type { DogOnchainInfo, LeaderboardEntry, Tier } from '../types';

/**
 * Backend online (Supabase): ranking semanal e saldo real de DOG.
 * A chave publicável é pública por design; as regras ficam no banco
 * (funções submit_score / weekly_leaderboard); os dados on-chain de DOG
 * vêm do DogData pela Edge Function dog-balance.
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
  /** Id da conquista usada como título (opcional). */
  title?: string;
}

/** Envia um voo concluído. Falhas são silenciosas: o ranking local continua valendo. */
export async function submitScore(s: ScoreSubmission): Promise<boolean> {
  if (!onlineEnabled) return false;
  try {
    const args = { p_address: s.address, p_dog_name: s.dogName, p_tier: s.tier, p_route: s.routeId, p_score: s.score };
    try {
      await rpc('submit_score', { ...args, p_title: s.title ?? null });
    } catch (e) {
      // Servidor sem a migração de títulos: envia no formato antigo.
      if (!String(e).includes('PGRST202')) throw e;
      await rpc('submit_score', args);
    }
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
  title: string | null;
  week_score: number;
  best_score?: number;
  total_launches: number;
}

const toEntry = (r: LeaderboardRow): LeaderboardEntry => ({
  address: r.address,
  dogName: r.dog_name,
  tier: r.tier,
  title: r.title ?? undefined,
  weekScore: r.week_score,
  bestScore: r.best_score ?? r.week_score,
  totalLaunches: Number(r.total_launches),
});

/** Top da semana no servidor. Lança erro se o servidor não responder. */
export async function fetchWeeklyLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const rows = await rpc<LeaderboardRow[]>('weekly_leaderboard', { p_limit: limit });
  return rows.map(toEntry);
}

/** Top da semana na rota do evento (`totalLaunches` = voos nessa rota na semana). */
export async function fetchEventLeaderboard(routeId: string, limit = 20): Promise<LeaderboardEntry[]> {
  const rows = await rpc<LeaderboardRow[]>('event_leaderboard', { p_route: routeId, p_limit: limit });
  return rows.map(toEntry);
}

/**
 * Saldo real da Rune DOG, ranking de holder e lote no DogCity (Edge Function
 * dog-balance, que consulta o DogData). `null` se indisponível.
 */
export async function fetchDogInfo(address: string): Promise<DogOnchainInfo | null> {
  if (!onlineEnabled) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/dog-balance?address=${encodeURIComponent(address)}`, {
      headers: { apikey: SUPABASE_KEY },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as Partial<DogOnchainInfo>;
    if (typeof body.balance !== 'number') return null;
    return { balance: body.balance, rank: body.rank ?? null, dogcity: body.dogcity ?? null, updatedAt: new Date().toISOString() };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
