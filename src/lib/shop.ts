import { AstronautLook, Cosmetic, DogAstronaut, Rarity, Stat, Upgrade } from '../types';
import { DogStats, MAX_STAT_LEVEL, STAT_INFO } from './stats';

const UPGRADE_LINES: Record<Stat, { name: string; baseCost: number }> = {
  power: { name: 'Propulsor', baseCost: 40 },
  accuracy: { name: 'Mira Lunar', baseCost: 45 },
  luck: { name: 'Amuleto Estelar', baseCost: 55 },
  speed: { name: 'Aerodinâmica', baseCost: 40 },
};

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export const UPGRADES: Upgrade[] = (Object.keys(UPGRADE_LINES) as Stat[]).flatMap(stat =>
  Array.from({ length: MAX_STAT_LEVEL - 1 }, (_, i) => {
    const level = i + 2;
    return {
      id: `${stat}_${level}`,
      name: `${UPGRADE_LINES[stat].name} Mk.${ROMAN[level]}`,
      description: `${STAT_INFO[stat].label} → ${level}`,
      stat,
      level,
      cost: Math.round(UPGRADE_LINES[stat].baseCost * Math.pow(1.45, level - 2)),
    };
  })
);

export function getNextUpgrade(stats: DogStats, stat: Stat): Upgrade | undefined {
  return UPGRADES.find(u => u.stat === stat && u.level === stats[stat] + 1);
}

export const DEFAULT_SKIN = { id: 'default', color: '#d9924f' };
export const DEFAULT_TRAIL = { id: 'orange', color: '#ff7a1a' };

export const COSMETICS: Cosmetic[] = [
  { id: 'skin_husky', name: 'Pelo Husky', type: 'skin', cost: 90, currency: 'stardust', description: 'Prata ártico', rarity: 'common', color: '#cfd6e2' },
  { id: 'skin_golden', name: 'Pelo Dourado', type: 'skin', cost: 200, currency: 'stardust', description: 'Brilha como uma estrela', rarity: 'rare', color: '#ffc93a' },
  { id: 'skin_nebula', name: 'Pelo Nebular', type: 'skin', cost: 500, currency: 'stardust', description: 'Cores de uma nebulosa', rarity: 'epic', color: '#a86bff' },
  { id: 'skin_cosmic', name: 'Pelo Cósmico', type: 'skin', cost: 20, currency: 'lunarDust', description: 'Energia pura, emite luz', rarity: 'legendary', color: '#3ff0ff' },
  { id: 'helmet_classic', name: 'Capacete Clássico', type: 'helmet', cost: 100, currency: 'stardust', description: 'Bolha de vidro retrô', rarity: 'common', color: '#e8f4ff' },
  { id: 'helmet_neon', name: 'Capacete Neon', type: 'helmet', cost: 250, currency: 'stardust', description: 'Anel de plasma ciano', rarity: 'rare', color: '#22e3ff' },
  { id: 'helmet_gold', name: 'Capacete Dourado', type: 'helmet', cost: 400, currency: 'stardust', description: 'Para o rei do espaço', rarity: 'epic', color: '#ffc93a' },
  { id: 'trail_green', name: 'Rastro Verde', type: 'trail', cost: 80, currency: 'stardust', description: 'Aurora boreal', rarity: 'common', color: '#3dff8a' },
  { id: 'trail_blue', name: 'Rastro Azul', type: 'trail', cost: 220, currency: 'stardust', description: 'Plasma azul', rarity: 'rare', color: '#3cb8ff' },
  { id: 'trail_plasma', name: 'Rastro Plasma', type: 'trail', cost: 350, currency: 'stardust', description: 'Magenta supercarregado', rarity: 'epic', color: '#ff3ce8' },
  // O id continua 'trail_rainbow' para manter os saves de quem já comprou.
  { id: 'trail_rainbow', name: 'Rastro Solar', type: 'trail', cost: 15, currency: 'lunarDust', description: 'Chama de uma estrela, laranja e dourada', rarity: 'legendary', color: 'solar' },
];

export function getCosmetic(id: string): Cosmetic | undefined {
  return COSMETICS.find(c => c.id === id);
}

export function getSkinColor(id: string): string {
  return getCosmetic(id)?.color ?? DEFAULT_SKIN.color;
}

export function getTrailColor(id: string): string {
  return getCosmetic(id)?.color ?? DEFAULT_TRAIL.color;
}

export function getRarityColor(rarity: Rarity): string {
  switch (rarity) {
    case 'legendary': return 'border-amber-400/70 bg-gradient-to-br from-amber-900/40 to-amber-950/20 shadow-[0_0_18px_rgba(251,191,36,0.18)]';
    case 'epic': return 'border-fuchsia-500/60 bg-gradient-to-br from-purple-900/40 to-purple-950/20 shadow-[0_0_18px_rgba(192,38,211,0.15)]';
    case 'rare': return 'border-sky-500/60 bg-gradient-to-br from-blue-900/40 to-blue-950/20';
    default: return 'border-emerald-500/50 bg-gradient-to-br from-emerald-900/30 to-slate-950/20';
  }
}

export function getRarityText(rarity: Rarity): string {
  switch (rarity) {
    case 'legendary': return 'text-amber-300';
    case 'epic': return 'text-fuchsia-400';
    case 'rare': return 'text-sky-400';
    default: return 'text-emerald-300';
  }
}

export function getRarityLabel(rarity: Rarity): string {
  switch (rarity) {
    case 'legendary': return 'Lendário';
    case 'epic': return 'Épico';
    case 'rare': return 'Raro';
    default: return 'Comum';
  }
}

/** Aparência completa a partir do cão: cosméticos equipados + níveis da Oficina. */
export function getLook(dog: Pick<DogAstronaut, 'skin' | 'helmet' | 'trail' | Stat>): AstronautLook {
  return {
    skinColor: getSkinColor(dog.skin),
    helmet: dog.helmet,
    trailColor: getTrailColor(dog.trail),
    upgrades: { power: dog.power, accuracy: dog.accuracy, luck: dog.luck, speed: dog.speed },
  };
}

