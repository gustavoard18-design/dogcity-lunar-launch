import type { DogDataIdentity, DogOnchainInfo, LeaderboardEntry, Tier } from '../types';
import { sanitizeIdentity } from './dogdata';
import { dropSession, isSessionError } from './auth';

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

/**
 * Só o jogo publicado grava no ranking. Em `npm run dev` (e nos testes) os voos
 * não são enviados, para testes locais não poluírem o ranking real; defina
 * VITE_SUBMIT_IN_DEV=1 para enviar mesmo assim.
 */
export const submitEnabled = onlineEnabled && (!import.meta.env.DEV || import.meta.env.VITE_SUBMIT_IN_DEV === '1');

const headers = () => ({ apikey: SUPABASE_KEY, 'Content-Type': 'application/json' });

export async function rpc<T>(fn: string, args: Record<string, unknown>, timeoutMs = 8000): Promise<T> {
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
  /** Sessão do servidor (carteira assinada ou convidado). Sem ela o voo não entra no ranking. */
  token: string | null;
  dogName: string;
  tier: Tier;
  routeId: string;
  score: number;
  /** Id da conquista usada como título (opcional). */
  title?: string;
  /** Id da moldura de nome (opcional). */
  style?: string;
}

/** Função inexistente no servidor (migração ainda não aplicada). */
const missingFn = (e: unknown) => String(e).includes('PGRST202');

/** Tenta cada chamada em ordem, passando para a próxima só se a função não existir no servidor. */
async function firstAvailable<T>(calls: (() => Promise<T>)[]): Promise<T> {
  for (let i = 0; i < calls.length; i++) {
    try {
      return await calls[i]();
    } catch (e) {
      if (i === calls.length - 1 || !missingFn(e)) throw e;
    }
  }
  throw new Error('nenhuma função disponível');
}

/** Envia um voo concluído. Falhas são silenciosas: o ranking local continua valendo. */
export async function submitScore(s: ScoreSubmission): Promise<boolean> {
  if (!submitEnabled) return false;
  const common = { p_dog_name: s.dogName, p_tier: s.tier, p_route: s.routeId, p_score: s.score };
  const args = { p_address: s.address, ...common };
  const calls: (() => Promise<unknown>)[] = [];
  // Com sessão: o servidor tira o endereço do token. Os formatos antigos só
  // valem enquanto o servidor não tiver a migração das sessões.
  if (s.token) calls.push(() => rpc('submit_score_v3', { p_token: s.token, ...common, p_title: s.title ?? null, p_style: s.style ?? null }));
  calls.push(
    () => rpc('submit_score_v2', { ...args, p_title: s.title ?? null, p_style: s.style ?? null }),
    () => rpc('submit_score', { ...args, p_title: s.title ?? null }),
    () => rpc('submit_score', args)
  );
  try {
    await firstAvailable(calls);
    return true;
  } catch (e) {
    if (isSessionError(e)) dropSession(s.address);
    console.warn('[online] envio de score falhou', e);
    return false;
  }
}

interface LeaderboardRow {
  address: string;
  dog_name: string;
  tier: Tier;
  title?: string | null;
  style?: string | null;
  week_score: number;
  best_score?: number;
  total_launches: number;
}

const toEntry = (r: LeaderboardRow): LeaderboardEntry => ({
  address: r.address,
  dogName: r.dog_name,
  tier: r.tier,
  title: r.title ?? undefined,
  style: r.style ?? undefined,
  weekScore: r.week_score,
  bestScore: r.best_score ?? r.week_score,
  totalLaunches: Number(r.total_launches),
});

/** Top da semana no servidor. Lança erro se o servidor não responder. */
export async function fetchWeeklyLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const rows = await firstAvailable([
    () => rpc<LeaderboardRow[]>('weekly_leaderboard_v2', { p_limit: limit }),
    () => rpc<LeaderboardRow[]>('weekly_leaderboard', { p_limit: limit }),
  ]);
  return rows.map(toEntry);
}

/**
 * Ranking da rota do evento numa semana (0 = atual, 1 = passada...).
 * `totalLaunches` = voos nessa rota na semana.
 */
export async function fetchEventLeaderboard(routeId: string, limit = 20, weeksAgo = 0): Promise<LeaderboardEntry[]> {
  const calls = [() => rpc<LeaderboardRow[]>('event_leaderboard_v2', { p_route: routeId, p_weeks_ago: weeksAgo, p_limit: limit })];
  // A função antiga só sabe a semana atual.
  if (weeksAgo === 0) calls.push(() => rpc<LeaderboardRow[]>('event_leaderboard', { p_route: routeId, p_limit: limit }));
  const rows = await firstAvailable(calls);
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
    return {
      balance: body.balance,
      rank: body.rank ?? null,
      dogcity: body.dogcity ?? null,
      identity: sanitizeIdentity(body.identity),
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Identidade DogData (handle e avatar Ordinal) de vários endereços, para o
 * ranking. Endereço sem identidade não volta no mapa. Falhas viram mapa vazio.
 */
export async function fetchIdentities(addresses: string[]): Promise<Record<string, DogDataIdentity>> {
  const list = [...new Set(addresses)].slice(0, 25);
  if (!onlineEnabled || list.length === 0) return {};
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/dog-balance?addresses=${list.map(encodeURIComponent).join(',')}`, {
      headers: { apikey: SUPABASE_KEY },
      signal: ctrl.signal,
    });
    if (!res.ok) return {};
    const body = (await res.json()) as { identities?: Record<string, unknown> };
    const out: Record<string, DogDataIdentity> = {};
    for (const [address, raw] of Object.entries(body.identities ?? {})) {
      const identity = sanitizeIdentity(raw);
      if (identity && list.includes(address)) out[address] = identity;
    }
    return out;
  } catch {
    return {};
  } finally {
    clearTimeout(timer);
  }
}

export interface DistrictStanding {
  district: string;
  totalScore: number;
  pilots: number;
  bestPilotScore: number;
}

/** Guerra de distritos (0 = semana atual, 1 = passada). Lança erro se o servidor não responder. */
export async function fetchDistrictLeaderboard(weeksAgo = 0, limit = 20): Promise<DistrictStanding[]> {
  const rows = await rpc<{ district: string; total_score: number; pilots: number; best_pilot_score: number }[]>('district_leaderboard', {
    p_weeks_ago: weeksAgo,
    p_limit: limit,
  });
  return rows.map(r => ({ district: r.district, totalScore: Number(r.total_score), pilots: Number(r.pilots), bestPilotScore: Number(r.best_pilot_score) }));
}

/** Ranking da temporada do mês (pontos de temporada no lugar do score da semana). */
export async function fetchSeasonLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const rows = await rpc<(Omit<LeaderboardRow, 'week_score' | 'total_launches'> & { season_points: number; flights: number })[]>('season_leaderboard', { p_limit: limit });
  return rows.map(r => ({
    address: r.address,
    dogName: r.dog_name,
    tier: r.tier,
    title: r.title ?? undefined,
    style: r.style ?? undefined,
    weekScore: Number(r.season_points),
    bestScore: Number(r.season_points),
    totalLaunches: Number(r.flights),
  }));
}

