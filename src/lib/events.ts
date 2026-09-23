import { PlayerProfile, Route } from '../types';
import { getQuality, getWeekStart } from './economy';

/**
 * Evento semanal: uma rota especial que troca toda segunda-feira (00:00 local),
 * em rodízio fixo. Concluir a rota do evento com qualidade mínima rende um
 * bônus extra, uma vez por semana.
 */

export interface WeeklyEvent {
  id: string;
  name: string;
  tagline: string;
  route: Route;
  /** Qualidade mínima (0..1) para ganhar o bônus. */
  minQuality: number;
  bonus: { stardust: number; lunarDust: number };
}

export const EVENTS: WeeklyEvent[] = [
  {
    id: 'meteor-shower',
    name: 'Chuva de Meteoros',
    tagline: 'Rochas por todo lado, mas o dobro de poeira estelar no caminho.',
    minQuality: 0.6,
    bonus: { stardust: 120, lunarDust: 6 },
    route: {
      id: 'event-meteor-shower',
      name: 'Chuva de Meteoros',
      description: 'Atravesse a chuva de meteoros sobre a Terra.',
      cost: 30,
      difficulty: 3,
      maxScore: 400,
      rewardMultiplier: 2.4,
      unlockLevel: 2,
      destination: 'earth',
      flightSeconds: 30,
      hazardRate: 2.9,
      color: '#fb923c',
      orbRateMult: 2,
      event: true,
    },
  },
  {
    id: 'solar-storm',
    name: 'Tempestade Solar',
    tagline: 'O vento solar carrega orbes de energia até a Lua.',
    minQuality: 0.6,
    bonus: { stardust: 100, lunarDust: 5 },
    route: {
      id: 'event-solar-storm',
      name: 'Tempestade Solar',
      description: 'Voo curto e intenso até a Lua, no meio da tempestade.',
      cost: 25,
      difficulty: 2,
      maxScore: 350,
      rewardMultiplier: 2.2,
      unlockLevel: 2,
      destination: 'moon',
      flightSeconds: 26,
      hazardRate: 1.9,
      color: '#facc15',
      orbRateMult: 2.4,
      event: true,
    },
  },
  {
    id: 'comet-hunt',
    name: 'Caçada ao Cometa',
    tagline: 'Siga a cauda do cometa até Ceres sem perder o ritmo.',
    minQuality: 0.6,
    bonus: { stardust: 150, lunarDust: 7 },
    route: {
      id: 'event-comet-hunt',
      name: 'Caçada ao Cometa',
      description: 'Voo longo atrás do cometa, rumo a Ceres.',
      cost: 40,
      difficulty: 3,
      maxScore: 550,
      rewardMultiplier: 3.2,
      unlockLevel: 3,
      destination: 'ceres',
      flightSeconds: 40,
      hazardRate: 2.2,
      color: '#67e8f9',
      orbRateMult: 1.5,
      event: true,
    },
  },
  {
    id: 'mars-marathon',
    name: 'Maratona Marciana',
    tagline: 'A viagem mais longa do calendário. Resistência é tudo.',
    minQuality: 0.55,
    bonus: { stardust: 200, lunarDust: 9 },
    route: {
      id: 'event-mars-marathon',
      name: 'Maratona Marciana',
      description: 'Maratona até Marte com asteroides menos densos.',
      cost: 60,
      difficulty: 4,
      maxScore: 800,
      rewardMultiplier: 4.2,
      unlockLevel: 5,
      destination: 'mars',
      flightSeconds: 50,
      hazardRate: 2.4,
      color: '#f97316',
      orbRateMult: 1.4,
      event: true,
    },
  },
];

/** Segunda-feira de referência para o rodízio (semana 0). */
const EPOCH = new Date(2026, 0, 5);
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Índice da semana atual desde a referência (horário local). */
export function getWeekIndex(now: Date = new Date()): number {
  const start = new Date(getWeekStart(now));
  return Math.round((start.getTime() - new Date(getWeekStart(EPOCH)).getTime()) / WEEK_MS);
}

export function getCurrentEvent(now: Date = new Date()): WeeklyEvent {
  const i = getWeekIndex(now);
  return EVENTS[((i % EVENTS.length) + EVENTS.length) % EVENTS.length];
}

export function getEventByRoute(routeId: string): WeeklyEvent | undefined {
  return EVENTS.find(e => e.route.id === routeId);
}

/** Milissegundos até a próxima segunda-feira 00:00 local. */
export function msUntilNextEvent(now: Date = new Date()): number {
  const start = new Date(getWeekStart(now));
  const next = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
  return Math.max(0, next.getTime() - now.getTime());
}

export function hasWonEventThisWeek(profile: PlayerProfile, now: Date = new Date()): boolean {
  return profile.eventWins.includes(getWeekStart(now));
}

/**
 * Bônus do evento: só na rota do evento *desta* semana, com sucesso e
 * qualidade mínima, e uma vez por semana.
 */
export function getEventBonus(
  profile: PlayerProfile,
  route: Route,
  score: number,
  success: boolean,
  now: Date = new Date()
): WeeklyEvent['bonus'] | null {
  const event = getCurrentEvent(now);
  if (route.id !== event.route.id || !success) return null;
  if (hasWonEventThisWeek(profile, now)) return null;
  return getQuality(score, route) >= event.minQuality ? event.bonus : null;
}
