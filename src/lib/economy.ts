import { DogAstronaut, PlayerProfile, Route, Tier } from '../types';
import { L } from './i18n';

export const ROUTES: Route[] = [
  {
    id: 'low-orbit',
    name: L({ en: 'Low Orbit', pt: 'Órbita Baixa', es: 'Órbita Baja' }),
    description: L({ en: 'Training flight to Earth orbit.', pt: 'Voo de treino até a órbita da Terra.', es: 'Vuelo de entrenamiento hasta la órbita de la Tierra.' }),
    cost: 10,
    difficulty: 1,
    maxScore: 100,
    rewardMultiplier: 1,
    unlockLevel: 1,
    destination: 'earth',
    flightSeconds: 24,
    hazardRate: 0.9,
    color: '#38bdf8',
  },
  {
    id: 'sea-of-tranquility',
    name: L({ en: 'Sea of Tranquility', pt: 'Mar da Tranquilidade', es: 'Mar de la Tranquilidad' }),
    description: L({ en: 'A leap to the Sea of Tranquility on the Moon.', pt: 'Salto até o Mar da Tranquilidade, do outro lado da Lua.', es: 'Un salto hasta el Mar de la Tranquilidad, en la Luna.' }),
    cost: 25,
    difficulty: 2,
    maxScore: 250,
    rewardMultiplier: 1.8,
    unlockLevel: 2,
    destination: 'moon',
    flightSeconds: 30,
    hazardRate: 1.5,
    color: '#e2e8f0',
  },
  {
    id: 'asteroid-belt',
    name: L({ en: 'Asteroid Belt', pt: 'Cinturão de Asteroides', es: 'Cinturón de Asteroides' }),
    description: L({ en: 'A dangerous run through space rocks to Ceres.', pt: 'Navegação perigosa entre rochas espaciais até Ceres.', es: 'Navegación peligrosa entre rocas espaciales hasta Ceres.' }),
    cost: 50,
    difficulty: 3,
    maxScore: 500,
    rewardMultiplier: 3,
    unlockLevel: 4,
    destination: 'ceres',
    flightSeconds: 36,
    hazardRate: 2.4,
    color: '#f59e0b',
  },
  {
    id: 'mars-colony',
    name: L({ en: 'Mars Colony', pt: 'Colônia de Marte', es: 'Colonia de Marte' }),
    description: L({ en: 'The ultimate mission. Eternal glory.', pt: 'A missão definitiva. Glória eterna.', es: 'La misión definitiva. Gloria eterna.' }),
    cost: 100,
    difficulty: 4,
    maxScore: 1000,
    rewardMultiplier: 5,
    unlockLevel: 7,
    destination: 'mars',
    flightSeconds: 42,
    hazardRate: 3.1,
    color: '#ef4444',
  },
];

export const STARTING_STARDUST = 150;

export function getRoute(id: string): Route | undefined {
  return ROUTES.find(r => r.id === id);
}

export function isRouteUnlocked(route: Route, level: number): boolean {
  return level >= route.unlockLevel;
}

/** Quem não pode pagar nenhuma rota ganha um treino gratuito na Órbita Baixa, para nunca travar. */
export function isFreeTraining(route: Route, profile: PlayerProfile): boolean {
  return route.id === 'low-orbit' && profile.stardust < route.cost;
}

export function getRouteCost(route: Route, profile: PlayerProfile): number {
  return isFreeTraining(route, profile) ? 0 : route.cost;
}

export function getTier(dogBalance: number): Tier {
  if (dogBalance >= 10000) return 'Legend';
  if (dogBalance >= 5000) return 'Commander';
  if (dogBalance >= 1000) return 'Pioneer';
  if (dogBalance >= 100) return 'Explorer';
  return 'Stray';
}

/** Patente que vai para o ranking público: só saldo DOG real conta (convidado/simulado = Stray). */
export function rankingTier(profile: Pick<PlayerProfile, 'dogBalanceSource' | 'tier'>): Tier {
  return profile.dogBalanceSource === 'real' ? profile.tier : 'Stray';
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

/** Qualidade do voo em [0, 1]. */
export function getQuality(score: number, route: Route): number {
  return Math.max(0, Math.min(1, score / route.maxScore));
}

/**
 * Sucesso devolve entre 0.6x e 2.4x o custo da rota (+5 fixo), então um voo mediano
 * já dá lucro. Falha recupera até 25% do custo, proporcional ao desempenho.
 */
export function calculateReward(score: number, route: Route, success: boolean): number {
  const q = getQuality(score, route);
  if (!success) return Math.round(route.cost * 0.25 * q);
  return Math.round(route.cost * (0.6 + 1.8 * q)) + 5;
}

export function calculateXpGain(score: number, route: Route, success: boolean): number {
  const q = getQuality(score, route);
  const base = (10 + 40 * q) * route.rewardMultiplier;
  return Math.round(success ? base : base * 0.3);
}

export function getReputationGain(score: number, route: Route, success: boolean): number {
  if (!success) return -1;
  return 2 + Math.round(8 * getQuality(score, route) * route.difficulty);
}

export function getLunarDustGain(score: number, route: Route, success: boolean): number {
  if (!success) return 0;
  const q = getQuality(score, route);
  if (q >= 0.85) return route.difficulty * 2;
  if (q >= 0.7) return route.difficulty;
  return 0;
}

export function getXpForLevel(level: number): number {
  return Math.floor(50 * Math.pow(1.5, level - 1));
}

/** Soma XP e processa quantos níveis forem necessários. Imutável. */
export function applyXp(dog: DogAstronaut, xp: number): { dog: DogAstronaut; levelsGained: number } {
  const next = { ...dog, xp: dog.xp + xp };
  let levelsGained = 0;
  while (next.xp >= next.xpToNext) {
    next.xp -= next.xpToNext;
    next.level += 1;
    next.xpToNext = getXpForLevel(next.level);
    levelsGained += 1;
  }
  return { dog: next, levelsGained };
}

/** Brasília (UTC−3, sem horário de verão): o fuso do servidor para semanas, ranking e pódio. */
export const BRT_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * Segunda-feira 00:00 de Brasília da semana de `date`, em ISO. Não altera `date`.
 * Vale para qualquer fuso do jogador, igual ao corte de semana do servidor.
 */
export function getWeekStart(date: Date = new Date()): string {
  const brt = new Date(date.getTime() - BRT_OFFSET_MS); // campos UTC = relógio de Brasília
  const day = brt.getUTCDay();
  const monday = Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth(), brt.getUTCDate() - (day === 0 ? 6 : day - 1));
  return new Date(monday + BRT_OFFSET_MS).toISOString();
}

/** Chave do dia local no formato YYYY-MM-DD. */
export function getDayKey(date: Date = new Date()): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}
