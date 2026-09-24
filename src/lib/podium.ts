import type { PlayerProfile, PodiumRecord } from '../types';
import { getWeekStart } from './economy';
import { getCurrentEvent, WeeklyEvent } from './events';

/**
 * Prêmio do top 3 do evento semanal. O servidor apura o pódio das semanas
 * passadas (ranking da rota do evento naquela semana); ao entrar, o jogo
 * confere as últimas semanas e entrega o prêmio uma única vez por semana.
 */

export const PODIUM_PRIZES: Record<1 | 2 | 3, { stardust: number; lunarDust: number }> = {
  1: { stardust: 500, lunarDust: 30 },
  2: { stardust: 300, lunarDust: 20 },
  3: { stardust: 200, lunarDust: 12 },
};

/** Quantas semanas para trás o jogo confere ao entrar. */
export const PODIUM_LOOKBACK_WEEKS = 4;

export interface PastEventWeek {
  weeksAgo: number;
  weekStart: string;
  event: WeeklyEvent;
}

/** Semanas já encerradas a conferir (1 = semana passada). */
export function pastEventWeeks(now: Date = new Date(), max = PODIUM_LOOKBACK_WEEKS): PastEventWeek[] {
  return Array.from({ length: max }, (_, i) => {
    const weeksAgo = i + 1;
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7 * weeksAgo, 12);
    return { weeksAgo, weekStart: getWeekStart(date), event: getCurrentEvent(date) };
  });
}

/** Aplica o prêmio de uma colocação. `null` se já recebido nessa semana ou colocação inválida. */
export function applyPodiumPrize(
  profile: PlayerProfile,
  week: Pick<PastEventWeek, 'weekStart' | 'event'>,
  place: number,
  now: Date = new Date()
): { profile: PlayerProfile; record: PodiumRecord } | null {
  if (place !== 1 && place !== 2 && place !== 3) return null;
  if (profile.podiums.some(p => p.weekStart === week.weekStart)) return null;
  const prize = PODIUM_PRIZES[place];
  const record: PodiumRecord = {
    weekStart: week.weekStart,
    routeId: week.event.route.id,
    eventName: week.event.name,
    place,
    stardust: prize.stardust,
    lunarDust: prize.lunarDust,
    awardedAt: now.toISOString(),
  };
  return {
    profile: {
      ...profile,
      stardust: profile.stardust + prize.stardust,
      lunarDust: profile.lunarDust + prize.lunarDust,
      podiums: [record, ...profile.podiums].slice(0, 52),
    },
    record,
  };
}
