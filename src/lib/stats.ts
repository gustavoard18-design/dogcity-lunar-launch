import { Route, Stat } from '../types';
import { L } from './i18n';

export const MAX_STAT_LEVEL = 10;

export interface DogStats {
  power: number;
  accuracy: number;
  luck: number;
  speed: number;
}

export const STAT_INFO: Record<Stat, { label: string; color: string; effect: string }> = {
  power: { label: L({ en: 'Power', pt: 'Potência', es: 'Potencia' }), color: 'text-orange-400', effect: L({ en: 'Slower gauges and extra hull (lv 4 and 8)', pt: 'Medidores mais lentos e casco extra (nv 4 e 8)', es: 'Medidores más lentos y casco extra (nv 4 y 8)' }) },
  accuracy: { label: L({ en: 'Accuracy', pt: 'Precisão', es: 'Precisión' }), color: 'text-sky-400', effect: L({ en: 'Wider sweet spots for angle and power', pt: 'Zonas ideais de ângulo e força mais largas', es: 'Zonas ideales de ángulo y fuerza más anchas' }) },
  luck: { label: L({ en: 'Luck', pt: 'Sorte', es: 'Suerte' }), color: 'text-emerald-400', effect: L({ en: 'More Stardust, shields and a pickup magnet', pt: 'Mais Stardust, escudos e ímã de coleta', es: 'Más Stardust, escudos e imán de recogida' }) },
  speed: { label: L({ en: 'Handling', pt: 'Manobra', es: 'Maniobra' }), color: 'text-cyan-400', effect: L({ en: 'Ship responds faster to your controls', pt: 'Nave responde mais rápido aos comandos', es: 'La nave responde más rápido a los controles' }) },
};

/** Peças que cada atributo instala no foguete, por nível. */
export const UPGRADE_VISUALS: Record<Stat, [{ level: number; part: string }, { level: number; part: string }]> = {
  power: [
    { level: 4, part: L({ en: 'Side boosters', pt: 'Propulsores laterais', es: 'Propulsores laterales' }) },
    { level: 8, part: L({ en: 'Overheated boosters', pt: 'Propulsores superaquecidos', es: 'Propulsores sobrecalentados' }) },
  ],
  accuracy: [
    { level: 3, part: L({ en: 'Targeting antenna', pt: 'Antena de mira', es: 'Antena de puntería' }) },
    { level: 6, part: L({ en: 'Side radar', pt: 'Radar lateral', es: 'Radar lateral' }) },
  ],
  luck: [
    { level: 3, part: L({ en: 'Gold bands', pt: 'Faixas douradas', es: 'Franjas doradas' }) },
    { level: 6, part: L({ en: 'Gold nose', pt: 'Nariz de ouro', es: 'Morro de oro' }) },
  ],
  speed: [
    { level: 3, part: L({ en: 'Long fins', pt: 'Aletas longas', es: 'Aletas largas' }) },
    { level: 6, part: L({ en: 'Front canards', pt: 'Aletas dianteiras', es: 'Aletas delanteras' }) },
  ],
};

/** Parâmetros de jogo derivados dos stats do cão e da rota. */
export interface GameTuning {
  angleHalfZone: number;
  powerHalfZone: number;
  /** Ciclos (ida e volta) por segundo dos medidores. */
  gaugeSpeed: number;
  hull: number;
  steer: number;
  orbRate: number;
  shieldRate: number;
  magnet: number;
  hazardRate: number;
  flightSeconds: number;
  worldSpeed: number;
  aimedHazards: number;
}

export function getGameTuning(stats: DogStats, route: Route): GameTuning {
  const lv = (s: number) => Math.max(0, Math.min(MAX_STAT_LEVEL, s) - 1);
  return {
    angleHalfZone: 5 + 1.0 * lv(stats.accuracy),
    powerHalfZone: 6 + 1.1 * lv(stats.accuracy),
    gaugeSpeed: (0.45 + 0.12 * (route.difficulty - 1)) / (1 + 0.09 * lv(stats.power)),
    hull: 3 + (stats.power >= 4 ? 1 : 0) + (stats.power >= 8 ? 1 : 0),
    steer: 4.5 + 1.0 * lv(stats.speed),
    orbRate: 2.4 * (1 + 0.06 * lv(stats.luck)) * (route.orbRateMult ?? 1),
    shieldRate: 0.035 + 0.012 * lv(stats.luck),
    magnet: 1.0 + 0.07 * lv(stats.luck),
    hazardRate: route.hazardRate,
    flightSeconds: route.flightSeconds,
    worldSpeed: 42 + 7 * (route.difficulty - 1),
    aimedHazards: 0.15 + 0.08 * (route.difficulty - 1),
  };
}

/** Qualidade de um medidor: 1 no centro, ~0.85 na borda da zona, 0 a 3 meias-zonas de distância. */
export function gaugeQuality(value: number, center: number, half: number): number {
  const d = Math.abs(value - center);
  if (d <= half) return 1 - 0.15 * (d / half);
  return Math.max(0, 0.85 - 0.85 * ((d - half) / (2 * half)));
}

export function isPerfect(value: number, center: number, half: number): boolean {
  return Math.abs(value - center) <= half * 0.4;
}
