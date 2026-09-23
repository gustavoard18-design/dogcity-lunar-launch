import type { DogAstronaut, Rarity, Stat } from '../types';
import { getCosmetic } from './shop';

/**
 * Fases visuais do astronauta e do foguete (artes em public/art).
 * - Astronauta: evolui com a raridade da pelagem e do capacete (Loja).
 * - Foguete: evolui com os níveis da Oficina + a raridade do rastro do motor.
 */

export interface Tier {
  index: number; // 1..5
  name: string;
  /** Pontos mínimos para chegar nesta fase. */
  min: number;
  accent: string;
}

export interface TierProgress {
  tier: Tier;
  points: number;
  max: number;
  next?: Tier;
}

export const ASTRONAUT_TIERS: Tier[] = [
  { index: 1, name: 'Início', min: 0, accent: 'text-slate-200' },
  { index: 2, name: 'Exploração', min: 1, accent: 'text-sky-300' },
  { index: 3, name: 'Avançado', min: 3, accent: 'text-cyan-300' },
  { index: 4, name: 'Especial', min: 5, accent: 'text-amber-300' },
  { index: 5, name: 'Lendário', min: 7, accent: 'text-fuchsia-300' },
];

export const ROCKET_TIERS: Tier[] = [
  { index: 1, name: 'Básico', min: 4, accent: 'text-slate-200' },
  { index: 2, name: 'Aprimorado', min: 10, accent: 'text-sky-300' },
  { index: 3, name: 'Avançado', min: 17, accent: 'text-violet-300' },
  { index: 4, name: 'Especial', min: 25, accent: 'text-amber-300' },
  { index: 5, name: 'Lendário', min: 34, accent: 'text-fuchsia-300' },
];

export const RARITY_POINTS: Record<Rarity, number> = { common: 1, rare: 2, epic: 3, legendary: 4 };

/** Pelo Cósmico (lendário) + Capacete Dourado (épico). */
const ASTRONAUT_MAX = RARITY_POINTS.legendary + RARITY_POINTS.epic;
/** 4 atributos no nível 10 + rastro lendário. */
const ROCKET_MAX = 4 * 10 + RARITY_POINTS.legendary;

function progress(tiers: Tier[], points: number, max: number): TierProgress {
  let i = 0;
  while (i + 1 < tiers.length && points >= tiers[i + 1].min) i++;
  return { tier: tiers[i], points, max, next: tiers[i + 1] };
}

const rarityPoints = (id: string) => {
  const item = getCosmetic(id);
  return item ? RARITY_POINTS[item.rarity] : 0;
};

export function astronautPoints(dog: Pick<DogAstronaut, 'skin' | 'helmet'>): number {
  return rarityPoints(dog.skin) + rarityPoints(dog.helmet);
}

export function rocketPoints(dog: Pick<DogAstronaut, Stat | 'trail'>): number {
  return dog.power + dog.accuracy + dog.luck + dog.speed + rarityPoints(dog.trail);
}

export function astronautTier(dog: Pick<DogAstronaut, 'skin' | 'helmet'>): TierProgress {
  return progress(ASTRONAUT_TIERS, astronautPoints(dog), ASTRONAUT_MAX);
}

export function rocketTier(dog: Pick<DogAstronaut, Stat | 'trail'>): TierProgress {
  return progress(ROCKET_TIERS, rocketPoints(dog), ROCKET_MAX);
}

const base = () => (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || './';

export const astronautArt = (tier: Tier) => `${base()}art/astro-${tier.index}.webp`;
export const rocketArt = (tier: Tier) => `${base()}art/rocket-${tier.index}.webp`;
export const iconArt = (name: string) => `${base()}art/icons/${name}.webp`;
/** Céu do jogo (fundo do hangar e das cenas 3D). */
export const spaceBackgroundArt = () => `${base()}art/space-bg.webp`;
/** Artes recortadas, sem fundo. */
export const cutoutArt = (kind: 'astronaut' | 'rocket') => `${base()}art/cutout-${kind}.webp`;
/** Retrato do item da Loja (public/art/items/<id>.webp). */
export const itemArt = (id: string) => `${base()}art/items/${id}.webp`;

/** Ícone de equipamento de cada atributo da Oficina. */
export const STAT_ICON: Record<Stat, string> = {
  power: 'propulsores',
  accuracy: 'radar',
  luck: 'escudo',
  speed: 'asas',
};
