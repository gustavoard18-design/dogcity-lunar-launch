import type { DogAstronaut, Rarity, Stat } from '../types';
import { getCosmetic } from './shop';
import { L } from './i18n';

/**
 * Fases visuais do astronauta e do foguete (artes em public/art).
 * - Astronauta: evolui com a raridade dos itens equipados na Oficina (seção Astronauta).
 * - Foguete: evolui com a soma dos níveis da Oficina.
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
  { index: 1, name: L({ en: 'Rookie', pt: 'Início', es: 'Inicio' }), min: 0, accent: 'text-slate-200' },
  { index: 2, name: L({ en: 'Explorer', pt: 'Exploração', es: 'Exploración' }), min: 2, accent: 'text-sky-300' },
  { index: 3, name: L({ en: 'Advanced', pt: 'Avançado', es: 'Avanzado' }), min: 5, accent: 'text-cyan-300' },
  { index: 4, name: L({ en: 'Special', pt: 'Especial', es: 'Especial' }), min: 8, accent: 'text-amber-300' },
  { index: 5, name: L({ en: 'Legendary', pt: 'Lendário', es: 'Legendario' }), min: 11, accent: 'text-fuchsia-300' },
];

export const ROCKET_TIERS: Tier[] = [
  { index: 1, name: L({ en: 'Basic', pt: 'Básico', es: 'Básico' }), min: 4, accent: 'text-slate-200' },
  { index: 2, name: L({ en: 'Upgraded', pt: 'Aprimorado', es: 'Mejorado' }), min: 10, accent: 'text-sky-300' },
  { index: 3, name: L({ en: 'Advanced', pt: 'Avançado', es: 'Avanzado' }), min: 17, accent: 'text-violet-300' },
  { index: 4, name: L({ en: 'Special', pt: 'Especial', es: 'Especial' }), min: 25, accent: 'text-amber-300' },
  { index: 5, name: L({ en: 'Legendary', pt: 'Lendário', es: 'Legendario' }), min: 33, accent: 'text-fuchsia-300' },
];

export const RARITY_POINTS: Record<Rarity, number> = { common: 1, rare: 2, epic: 3, legendary: 4 };

const ASTRONAUT_MAX = 3 * RARITY_POINTS.legendary;
const ROCKET_MAX = 4 * 10;

function progress(tiers: Tier[], points: number, max: number): TierProgress {
  let i = 0;
  while (i + 1 < tiers.length && points >= tiers[i + 1].min) i++;
  return { tier: tiers[i], points, max, next: tiers[i + 1] };
}

type Equipped = Pick<DogAstronaut, 'skin' | 'helmet' | 'trail'>;

export function astronautPoints(dog: Equipped): number {
  return [dog.skin, dog.helmet, dog.trail].reduce((sum, id) => {
    const item = getCosmetic(id);
    return sum + (item ? RARITY_POINTS[item.rarity] : 0);
  }, 0);
}

export function astronautTier(dog: Equipped): TierProgress {
  return progress(ASTRONAUT_TIERS, astronautPoints(dog), ASTRONAUT_MAX);
}

export function rocketTier(dog: Pick<DogAstronaut, Stat>): TierProgress {
  return progress(ROCKET_TIERS, dog.power + dog.accuracy + dog.luck + dog.speed, ROCKET_MAX);
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
