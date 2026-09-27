import type { Route } from '../types';
import { getRoute, isRouteUnlocked } from './economy';
import { getCurrentEvent, getEventByRoute } from './events';
import { sanitizePilotName } from './storage';

/**
 * Desafio entre amigos: um link com a rota, a semente do voo, o score e o nome
 * de quem desafiou. Quem abre voa a mesma rota com os mesmos asteroides, orbes e
 * anéis, e no fim vê quem ganhou. Tudo que vem pelo link é validado, e o desafio
 * só pode ser aceito numa rota que o piloto já pode voar (challengeBlock).
 */

export interface Challenge {
  routeId: string;
  seed: number;
  score: number;
  name: string;
}

const PARAM = 'c';

const toBase64Url = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromBase64Url = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

/** Rota do jogo (fixa ou de evento) pelo id. */
export function challengeRoute(routeId: string): Route | undefined {
  return getRoute(routeId) ?? getEventByRoute(routeId)?.route;
}

/** Por que o piloto ainda não pode aceitar o desafio: nível baixo ou evento fora da semana. */
export type ChallengeBlock = { reason: 'level'; level: number } | { reason: 'event'; eventName: string };

/**
 * O desafio só vale numa rota que o piloto já pode voar: liberada pelo nível e,
 * se for rota de evento, só na semana daquele evento. `null` = pode aceitar.
 */
export function challengeBlock(route: Route, level: number, now: Date = new Date()): ChallengeBlock | null {
  const event = getEventByRoute(route.id);
  if (event && getCurrentEvent(now).id !== event.id) return { reason: 'event', eventName: event.name };
  if (!isRouteUnlocked(route, level)) return { reason: 'level', level: route.unlockLevel };
  return null;
}

export function encodeChallenge(c: Challenge): string {
  return toBase64Url(JSON.stringify({ v: 1, r: c.routeId, s: c.seed >>> 0, p: Math.round(c.score), n: c.name }));
}

/** Desafio válido ou null (rota inexistente, score impossível, nome inválido…). */
export function decodeChallenge(code: string | null | undefined): Challenge | null {
  if (!code || code.length > 400) return null;
  try {
    const raw = JSON.parse(fromBase64Url(code)) as Record<string, unknown>;
    if (raw.v !== 1 || typeof raw.r !== 'string') return null;
    const route = challengeRoute(raw.r);
    const seed = raw.s;
    const score = raw.p;
    const name = typeof raw.n === 'string' ? sanitizePilotName(raw.n) : null;
    if (!route || !name) return null;
    if (typeof seed !== 'number' || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) return null;
    if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > route.maxScore) return null;
    return { routeId: route.id, seed, score, name };
  } catch {
    return null;
  }
}

export function challengeUrl(gameUrl: string, c: Challenge): string {
  const url = new URL(gameUrl);
  url.searchParams.set(PARAM, encodeChallenge(c));
  return url.toString();
}

/** Lê o desafio da barra de endereço e tira o parâmetro (para não reabrir ao recarregar). */
export function takeChallengeFromLocation(): Challenge | null {
  if (typeof location === 'undefined') return null;
  const url = new URL(location.href);
  const code = url.searchParams.get(PARAM);
  if (code === null) return null;
  url.searchParams.delete(PARAM);
  try {
    history.replaceState(null, '', url.toString());
  } catch {
    // sem history (iframe restrito): o parâmetro fica na barra, sem problema
  }
  return decodeChallenge(code);
}

export type ChallengeOutcome = 'won' | 'lost' | 'tied';

/** Resultado do desafio: só voo concluído pode vencer. */
export function challengeOutcome(c: Challenge, myScore: number, success: boolean): ChallengeOutcome {
  if (!success || myScore < c.score) return 'lost';
  return myScore > c.score ? 'won' : 'tied';
}
