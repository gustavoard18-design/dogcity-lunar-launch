import type { PlayerProfile } from '../types';
import { L } from './i18n';

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
  steer: L({ en: 'Move the mouse or drag your finger to steer. Keyboard: WASD or arrow keys.', pt: 'Mova o mouse ou arraste o dedo para pilotar. No teclado: WASD ou setas.', es: 'Mueve el ratón o arrastra el dedo para pilotar. Teclado: WASD o flechas.' }),
  orbs: L({ en: 'Grab the golden orbs: each one is worth points and Stardust.', pt: 'Pegue os orbes dourados: cada um vale pontos e Stardust.', es: 'Atrapa los orbes dorados: cada uno vale puntos y Stardust.' }),
  rings: L({ en: 'Fly through the pink rings: they give a boost and are worth 3× points.', pt: 'Atravesse os anéis rosa: dão impulso e valem 3× mais pontos.', es: 'Atraviesa los anillos rosas: dan impulso y valen 3× más puntos.' }),
  asteroids: L({ en: 'Dodge the asteroids! Each hit costs 1 hull point.', pt: 'Desvie dos asteroides! Cada batida tira 1 ponto do casco.', es: '¡Esquiva los asteroides! Cada choque quita 1 punto de casco.' }),
  hit: L({ en: 'Ouch! With no hull left the ship is lost. Blue shields absorb one hit.', pt: 'Ai! Sem casco a nave é perdida. Os escudos azuis protegem de uma batida.', es: '¡Ay! Sin casco la nave se pierde. Los escudos azules protegen de un choque.' }),
  combo: L({ en: 'Combo! Orbs in a row multiply your points (up to 5×). Missing an orb resets the combo.', pt: 'Combo! Orbes seguidos multiplicam os pontos (até 5×). Perder um orbe zera o combo.', es: '¡Combo! Orbes seguidos multiplican los puntos (hasta 5×). Perder un orbe reinicia el combo.' }),
};
