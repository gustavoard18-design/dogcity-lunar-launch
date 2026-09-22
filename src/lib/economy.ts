import { Route, Tier } from '../types';

export const ROUTES: Route[] = [
  {
    id: 'low-orbit',
    name: 'Órbita Baixa',
    description: 'Voo curto ao redor da Terra. Ideal para treinar.',
    cost: 10,
    difficulty: 1,
    maxScore: 100,
    rewardMultiplier: 1,
    emoji: '🌍',
  },
  {
    id: 'sea-of-tranquility',
    name: 'Mar da Tranquilidade',
    description: 'Pouso na Lua. Requer precisão e coragem.',
    cost: 25,
    difficulty: 2,
    maxScore: 250,
    rewardMultiplier: 1.8,
    emoji: '🌙',
  },
  {
    id: 'asteroid-belt',
    name: 'Cinturão de Asteroides',
    description: 'Navegação perigosa entre rochas espaciais.',
    cost: 50,
    difficulty: 3,
    maxScore: 500,
    rewardMultiplier: 3,
    emoji: '☄️',
  },
  {
    id: 'mars-colony',
    name: 'Colônia de Marte',
    description: 'A missão definitiva. Glória eterna.',
    cost: 100,
    difficulty: 4,
    maxScore: 1000,
    rewardMultiplier: 5,
    emoji: '🔴',
  },
];

export function getTier(dogBalance: number): Tier {
  if (dogBalance >= 10000) return 'Legend';
  if (dogBalance >= 5000) return 'Commander';
  if (dogBalance >= 1000) return 'Pioneer';
  if (dogBalance >= 100) return 'Explorer';
  return 'Stray';
}

export function getTierColor(tier: Tier): string {
  switch (tier) {
    case 'Legend': return 'text-yellow-400';
    case 'Commander': return 'text-purple-400';
    case 'Pioneer': return 'text-blue-400';
    case 'Explorer': return 'text-green-400';
    case 'Stray': return 'text-gray-400';
  }
}

export function getTierBadge(tier: Tier): string {
  switch (tier) {
    case 'Legend': return '🏆';
    case 'Commander': return '⭐';
    case 'Pioneer': return '🚀';
    case 'Explorer': return '🔭';
    case 'Stray': return '🐕';
  }
}

export function calculateReward(score: number, route: Route, success: boolean): number {
  if (!success) return Math.floor(score * 0.1);
  const baseReward = Math.floor(score * route.rewardMultiplier);
  return Math.max(baseReward, 5);
}

export function calculateSuccessChance(score: number, route: Route, luck: number = 1): number {
  const threshold = route.maxScore * 0.5;
  const luckBonus = (luck - 1) * 0.03;
  
  if (score >= threshold) return Math.min(0.85 + luckBonus, 0.98);
  if (score >= threshold * 0.7) return Math.min(0.6 + luckBonus, 0.85);
  if (score >= threshold * 0.4) return Math.min(0.35 + luckBonus, 0.6);
  return Math.min(0.1 + luckBonus, 0.3);
}

export function getXpForLevel(level: number): number {
  return Math.floor(50 * Math.pow(1.5, level - 1));
}

export function calculateXpGain(score: number, route: Route, success: boolean): number {
  const base = Math.floor(score * 0.5);
  return success ? base : Math.floor(base * 0.3);
}

export function getReputationGain(score: number, success: boolean): number {
  if (!success) return -2;
  if (score > 400) return 10;
  if (score > 200) return 5;
  return 2;
}

export function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}
