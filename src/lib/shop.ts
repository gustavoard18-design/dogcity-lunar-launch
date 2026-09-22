import { Upgrade, Cosmetic } from '../types';

export const UPGRADES: Upgrade[] = [
  { id: 'power_2', name: 'Propulsor Mk.II', description: '+1 Power', stat: 'power', level: 2, cost: 50, emoji: '🔥' },
  { id: 'power_3', name: 'Propulsor Mk.III', description: '+1 Power', stat: 'power', level: 3, cost: 100, emoji: '🔥' },
  { id: 'accuracy_2', name: 'Mira Lunar I', description: '+1 Precisão', stat: 'accuracy', level: 2, cost: 50, emoji: '🎯' },
  { id: 'accuracy_3', name: 'Mira Lunar II', description: '+1 Precisão', stat: 'accuracy', level: 3, cost: 100, emoji: '🎯' },
  { id: 'luck_2', name: 'Amuleto Estelar I', description: '+1 Sorte', stat: 'luck', level: 2, cost: 75, emoji: '🍀' },
  { id: 'luck_3', name: 'Amuleto Estelar II', description: '+1 Sorte', stat: 'luck', level: 3, cost: 150, emoji: '🍀' },
  { id: 'speed_2', name: 'Aerodinâmica I', description: '+1 Velocidade', stat: 'speed', level: 2, cost: 60, emoji: '💨' },
  { id: 'speed_3', name: 'Aerodinâmica II', description: '+1 Velocidade', stat: 'speed', level: 3, cost: 120, emoji: '💨' },
];

export const COSMETICS: Cosmetic[] = [
  { id: 'skin_golden', name: 'Pelo Dourado', type: 'skin', cost: 200, currency: 'stardust', emoji: '🟡', description: 'Brilha como uma estrela', rarity: 'rare' },
  { id: 'skin_nebula', name: 'Pelo Nebular', type: 'skin', cost: 500, currency: 'stardust', emoji: '🟣', description: 'Cores de uma nebulosa', rarity: 'epic' },
  { id: 'helmet_classic', name: 'Capacete Clássico', type: 'helmet', cost: 100, currency: 'stardust', emoji: '⛑️', description: 'Estilo retrô espacial', rarity: 'common' },
  { id: 'helmet_gold', name: 'Capacete Dourado', type: 'helmet', cost: 400, currency: 'stardust', emoji: '👑', description: 'Para o rei do espaço', rarity: 'rare' },
  { id: 'trail_blue', name: 'Rastro Azul', type: 'trail', cost: 80, currency: 'stardust', emoji: '🔵', description: 'Rastro de plasma azul', rarity: 'common' },
  { id: 'trail_rainbow', name: 'Rastro Arco-Íris', type: 'trail', cost: 15, currency: 'lunarDust', emoji: '🌈', description: 'Todas as cores do universo', rarity: 'legendary' },
];

export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'legendary': return 'border-yellow-500/60 bg-yellow-900/20';
    case 'epic': return 'border-purple-500/60 bg-purple-900/20';
    case 'rare': return 'border-blue-500/60 bg-blue-900/20';
    default: return 'border-gray-500/60 bg-gray-900/20';
  }
}

export function getRarityLabel(rarity: string): string {
  switch (rarity) {
    case 'legendary': return 'Lendário';
    case 'epic': return 'Épico';
    case 'rare': return 'Raro';
    default: return 'Comum';
  }
}

export function getAvailableUpgrades(currentStats: { power: number; accuracy: number; luck: number; speed: number }, purchased: string[]): Upgrade[] {
  return UPGRADES.filter(u => {
    if (purchased.includes(u.id)) return false;
    const currentLevel = currentStats[u.stat];
    return u.level === currentLevel + 1;
  });
}
