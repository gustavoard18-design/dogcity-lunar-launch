import { AstronautLook, Cosmetic, DogAstronaut, Rarity, Stat, Upgrade } from '../types';
import { DogStats, MAX_STAT_LEVEL, STAT_INFO } from './stats';
import { L } from './i18n';

const UPGRADE_LINES: Record<Stat, { name: string; baseCost: number }> = {
  power: { name: L({ en: 'Thruster', pt: 'Propulsor', es: 'Propulsor' }), baseCost: 40 },
  accuracy: { name: L({ en: 'Lunar Sight', pt: 'Mira Lunar', es: 'Mira Lunar' }), baseCost: 45 },
  luck: { name: L({ en: 'Star Charm', pt: 'Amuleto Estelar', es: 'Amuleto Estelar' }), baseCost: 55 },
  speed: { name: L({ en: 'Aerodynamics', pt: 'Aerodinâmica', es: 'Aerodinámica' }), baseCost: 40 },
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
  { id: 'skin_husky', name: L({ en: 'Husky Fur', pt: 'Pelo Husky', es: 'Pelaje Husky' }), type: 'skin', cost: 90, currency: 'stardust', description: L({ en: 'Arctic silver', pt: 'Prata ártico', es: 'Plata ártica' }), rarity: 'common', color: '#cfd6e2' },
  { id: 'skin_golden', name: L({ en: 'Golden Fur', pt: 'Pelo Dourado', es: 'Pelaje Dorado' }), type: 'skin', cost: 200, currency: 'stardust', description: L({ en: 'Shines like a star', pt: 'Brilha como uma estrela', es: 'Brilla como una estrella' }), rarity: 'rare', color: '#ffc93a' },
  { id: 'skin_nebula', name: L({ en: 'Nebula Fur', pt: 'Pelo Nebular', es: 'Pelaje Nebular' }), type: 'skin', cost: 500, currency: 'stardust', description: L({ en: 'The colors of a nebula', pt: 'Cores de uma nebulosa', es: 'Los colores de una nebulosa' }), rarity: 'epic', color: '#a86bff' },
  { id: 'skin_cosmic', name: L({ en: 'Cosmic Fur', pt: 'Pelo Cósmico', es: 'Pelaje Cósmico' }), type: 'skin', cost: 20, currency: 'lunarDust', description: L({ en: 'Pure energy, it glows', pt: 'Energia pura, emite luz', es: 'Energía pura, emite luz' }), rarity: 'legendary', color: '#3ff0ff' },
  { id: 'helmet_classic', name: L({ en: 'Classic Helmet', pt: 'Capacete Clássico', es: 'Casco Clásico' }), type: 'helmet', cost: 100, currency: 'stardust', description: L({ en: 'Retro glass bubble', pt: 'Bolha de vidro retrô', es: 'Burbuja de vidrio retro' }), rarity: 'common', color: '#e8f4ff' },
  { id: 'helmet_neon', name: L({ en: 'Neon Helmet', pt: 'Capacete Neon', es: 'Casco Neón' }), type: 'helmet', cost: 250, currency: 'stardust', description: L({ en: 'Cyan plasma ring', pt: 'Anel de plasma ciano', es: 'Anillo de plasma cian' }), rarity: 'rare', color: '#22e3ff' },
  { id: 'helmet_gold', name: L({ en: 'Golden Helmet', pt: 'Capacete Dourado', es: 'Casco Dorado' }), type: 'helmet', cost: 400, currency: 'stardust', description: L({ en: 'For the king of space', pt: 'Para o rei do espaço', es: 'Para el rey del espacio' }), rarity: 'epic', color: '#ffc93a' },
  { id: 'trail_green', name: L({ en: 'Green Trail', pt: 'Rastro Verde', es: 'Estela Verde' }), type: 'trail', cost: 80, currency: 'stardust', description: L({ en: 'Northern lights', pt: 'Aurora boreal', es: 'Aurora boreal' }), rarity: 'common', color: '#3dff8a' },
  { id: 'trail_blue', name: L({ en: 'Blue Trail', pt: 'Rastro Azul', es: 'Estela Azul' }), type: 'trail', cost: 220, currency: 'stardust', description: L({ en: 'Blue plasma', pt: 'Plasma azul', es: 'Plasma azul' }), rarity: 'rare', color: '#3cb8ff' },
  { id: 'trail_plasma', name: L({ en: 'Plasma Trail', pt: 'Rastro Plasma', es: 'Estela de Plasma' }), type: 'trail', cost: 350, currency: 'stardust', description: L({ en: 'Supercharged magenta', pt: 'Magenta supercarregado', es: 'Magenta supercargado' }), rarity: 'epic', color: '#ff3ce8' },
  // O id continua 'trail_rainbow' para manter os saves de quem já comprou.
  { id: 'trail_rainbow', name: L({ en: 'Solar Trail', pt: 'Rastro Solar', es: 'Estela Solar' }), type: 'trail', cost: 15, currency: 'lunarDust', description: L({ en: 'The flame of a star, orange and gold', pt: 'Chama de uma estrela, laranja e dourada', es: 'La llama de una estrella, naranja y dorada' }), rarity: 'legendary', color: 'solar' },
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
    case 'legendary': return L({ en: 'Legendary', pt: 'Lendário', es: 'Legendario' });
    case 'epic': return L({ en: 'Epic', pt: 'Épico', es: 'Épico' });
    case 'rare': return L({ en: 'Rare', pt: 'Raro', es: 'Raro' });
    default: return L({ en: 'Common', pt: 'Comum', es: 'Común' });
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

