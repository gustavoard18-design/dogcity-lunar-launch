import type { PlayerProfile } from '../types';

/**
 * Tutorial do primeiro voo: dicas passo a passo na mira, na força e no voo.
 * Aparece só para quem nunca voou e some depois do primeiro voo (ou ao pular).
 */

const key = (address: string) => `dogcity_tutorial_done_${address}`;

export function isTutorialPending(profile: Pick<PlayerProfile, 'address' | 'stats'>): boolean {
  if (profile.stats.launches > 0) return false;
  try {
    return localStorage.getItem(key(profile.address)) !== '1';
  } catch {
    return true;
  }
}

export function markTutorialDone(address: string): void {
  try {
    localStorage.setItem(key(address), '1');
  } catch {
    // Armazenamento bloqueado: o tutorial some sozinho depois do primeiro voo.
  }
}

/** No primeiro voo os medidores oscilam mais devagar. */
export const TUTORIAL_GAUGE_SLOWDOWN = 0.7;

export type FlightTip = 'steer' | 'orbs' | 'rings' | 'asteroids' | 'hit' | 'combo';

/** Dicas do voo em sequência (segundos desde a decolagem). */
export const FLIGHT_TIP_TIMELINE: [number, FlightTip][] = [
  [0, 'steer'],
  [6, 'orbs'],
  [12, 'rings'],
  [18, 'asteroids'],
];

export const FLIGHT_TIP_TEXT: Record<FlightTip, string> = {
  steer: 'Mova o mouse ou arraste o dedo para pilotar. No teclado: WASD ou setas.',
  orbs: 'Pegue os orbes dourados: cada um vale pontos e Stardust.',
  rings: 'Atravesse os anéis rosa: dão impulso e valem 3× mais pontos.',
  asteroids: 'Desvie dos asteroides! Cada batida tira 1 ponto do casco.',
  hit: 'Ai! Sem casco a nave é perdida. Os escudos azuis protegem de uma batida.',
  combo: 'Combo! Orbes seguidos multiplicam os pontos (até 5×). Perder um orbe zera o combo.',
};
