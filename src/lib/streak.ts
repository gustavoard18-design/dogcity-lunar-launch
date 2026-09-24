import type { PlayerProfile } from '../types';
import { getDayKey } from './economy';

/**
 * Sequência de dias: entrar no jogo em dias seguidos rende uma recompensa que
 * cresce num ciclo de 7 dias. Perder um dia recomeça do 1. Aos 30 dias
 * seguidos (melhor sequência), a moldura de nome "Chama Eterna" é liberada.
 */

export interface StreakReward {
  stardust: number;
  lunarDust: number;
}

/** Recompensa de cada dia do ciclo (dia 7 é o grande). */
export const STREAK_REWARDS: StreakReward[] = [
  { stardust: 20, lunarDust: 0 },
  { stardust: 30, lunarDust: 0 },
  { stardust: 40, lunarDust: 1 },
  { stardust: 50, lunarDust: 0 },
  { stardust: 60, lunarDust: 1 },
  { stardust: 80, lunarDust: 1 },
  { stardust: 120, lunarDust: 4 },
];

/** Melhor sequência que libera a moldura exclusiva. */
export const STREAK_FRAME_DAYS = 30;

export const streakReward = (count: number): StreakReward => STREAK_REWARDS[(Math.max(1, count) - 1) % STREAK_REWARDS.length];

function dayBefore(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  return getDayKey(new Date(y, m - 1, d - 1, 12));
}

/**
 * Registra a entrada de hoje. Devolve `null` se hoje já contou; senão o perfil
 * com a sequência atualizada, a recompensa já creditada e o dia da sequência.
 */
export function applyDailyStreak(profile: PlayerProfile, now: Date = new Date()): { profile: PlayerProfile; day: number; reward: StreakReward } | null {
  const today = getDayKey(now);
  const prev = profile.streak;
  if (prev.lastDay === today) return null;
  const count = prev.lastDay === dayBefore(today) ? prev.count + 1 : 1;
  const reward = streakReward(count);
  return {
    day: count,
    reward,
    profile: {
      ...profile,
      stardust: profile.stardust + reward.stardust,
      lunarDust: profile.lunarDust + reward.lunarDust,
      streak: { count, best: Math.max(prev.best, count), lastDay: today },
    },
  };
}
