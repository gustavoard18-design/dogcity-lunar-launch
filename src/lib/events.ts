import { PlayerProfile, Route } from '../types';
import { getQuality, getRoute, getWeekStart } from './economy';
import { L } from './i18n';

/**
 * Evento semanal: uma rota especial que troca toda segunda-feira (00:00 local),
 * em rodízio fixo. Concluir a rota do evento com qualidade mínima rende um
 * bônus extra, uma vez por semana. Ao incluir um evento, escolha a posição
 * que mantém o evento da semana em curso (índice da semana % tamanho da lista).
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
    name: L({ en: 'Meteor Shower', pt: 'Chuva de Meteoros', es: 'Lluvia de Meteoros' }),
    tagline: L({ en: 'Rocks everywhere, but twice the stardust along the way.', pt: 'Rochas por todo lado, mas o dobro de poeira estelar no caminho.', es: 'Rocas por todas partes, pero el doble de polvo estelar en el camino.' }),
    minQuality: 0.6,
    bonus: { stardust: 120, lunarDust: 6 },
    route: {
      id: 'event-meteor-shower',
      name: L({ en: 'Meteor Shower', pt: 'Chuva de Meteoros', es: 'Lluvia de Meteoros' }),
      description: L({ en: 'Fly through the meteor shower over Earth.', pt: 'Atravesse a chuva de meteoros sobre a Terra.', es: 'Atraviesa la lluvia de meteoros sobre la Tierra.' }),
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
    id: 'saturn-rings',
    name: L({ en: 'Rings of Saturn', pt: 'Anéis de Saturno', es: 'Anillos de Saturno' }),
    tagline: L({ en: 'Fly through the Cassini Division: boost rings everywhere.', pt: 'Voe pela divisão de Cassini: anéis de impulso por todo lado.', es: 'Vuela por la división de Cassini: anillos de impulso por todas partes.' }),
    minQuality: 0.6,
    bonus: { stardust: 170, lunarDust: 8 },
    route: {
      id: 'event-saturn-rings',
      name: L({ en: 'Rings of Saturn', pt: 'Anéis de Saturno', es: 'Anillos de Saturno' }),
      description: L({ en: 'A trip to Saturn, cutting through the rings.', pt: 'Viagem até Saturno cortando os anéis.', es: 'Viaje a Saturno atravesando los anillos.' }),
      cost: 45,
      difficulty: 3,
      maxScore: 600,
      rewardMultiplier: 3.5,
      unlockLevel: 4,
      destination: 'gas',
      flightSeconds: 44,
      hazardRate: 2.0,
      color: '#fcd34d',
      orbRateMult: 1.6,
      ringRateMult: 2.5,
      event: true,
    },
  },
  {
    id: 'solar-storm',
    name: L({ en: 'Solar Storm', pt: 'Tempestade Solar', es: 'Tormenta Solar' }),
    tagline: L({ en: 'The solar wind carries energy orbs to the Moon.', pt: 'O vento solar carrega orbes de energia até a Lua.', es: 'El viento solar lleva orbes de energía hasta la Luna.' }),
    minQuality: 0.6,
    bonus: { stardust: 100, lunarDust: 5 },
    route: {
      id: 'event-solar-storm',
      name: L({ en: 'Solar Storm', pt: 'Tempestade Solar', es: 'Tormenta Solar' }),
      description: L({ en: 'A short, intense flight to the Moon through the storm.', pt: 'Voo curto e intenso até a Lua, no meio da tempestade.', es: 'Un vuelo corto e intenso hasta la Luna, en plena tormenta.' }),
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
    name: L({ en: 'Comet Hunt', pt: 'Caçada ao Cometa', es: 'Caza del Cometa' }),
    tagline: L({ en: 'Follow the comet tail to Ceres without losing the pace.', pt: 'Siga a cauda do cometa até Ceres sem perder o ritmo.', es: 'Sigue la cola del cometa hasta Ceres sin perder el ritmo.' }),
    minQuality: 0.6,
    bonus: { stardust: 150, lunarDust: 7 },
    route: {
      id: 'event-comet-hunt',
      name: L({ en: 'Comet Hunt', pt: 'Caçada ao Cometa', es: 'Caza del Cometa' }),
      description: L({ en: 'A long chase behind the comet, bound for Ceres.', pt: 'Voo longo atrás do cometa, rumo a Ceres.', es: 'Un vuelo largo tras el cometa, rumbo a Ceres.' }),
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
    name: L({ en: 'Martian Marathon', pt: 'Maratona Marciana', es: 'Maratón Marciano' }),
    tagline: L({ en: 'The longest trip on the calendar. Endurance is everything.', pt: 'A viagem mais longa do calendário. Resistência é tudo.', es: 'El viaje más largo del calendario. La resistencia lo es todo.' }),
    minQuality: 0.55,
    bonus: { stardust: 200, lunarDust: 9 },
    route: {
      id: 'event-mars-marathon',
      name: L({ en: 'Martian Marathon', pt: 'Maratona Marciana', es: 'Maratón Marciano' }),
      description: L({ en: 'A marathon to Mars with thinner asteroid fields.', pt: 'Maratona até Marte com asteroides menos densos.', es: 'Maratón hasta Marte con asteroides menos densos.' }),
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

/** Nome da rota no idioma atual (o histórico guarda o nome no idioma da época). */
export function routeName(route: Pick<Route, 'id' | 'name'>): string {
  return getRoute(route.id)?.name ?? getEventByRoute(route.id)?.route.name ?? route.name;
}
