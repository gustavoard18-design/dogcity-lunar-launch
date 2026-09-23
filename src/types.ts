export type Tier = 'Stray' | 'Explorer' | 'Pioneer' | 'Commander' | 'Legend';

export type Stat = 'power' | 'accuracy' | 'luck' | 'speed';

export type PlanetKind = 'earth' | 'moon' | 'ceres' | 'mars' | 'gas';

export interface DogAstronaut {
  id: string;
  name: string;
  breed: string;
  level: number;
  xp: number;
  xpToNext: number;
  reputation: number;
  missions: number;
  createdAt: string;
  power: number;
  accuracy: number;
  luck: number;
  speed: number;
  skin: string;
  helmet: string;
  trail: string;
}

/** Aparência do astronauta e do foguete (cosméticos + peças da Oficina). */
export interface AstronautLook {
  skinColor: string;
  helmet: string;
  trailColor: string;
  upgrades?: Record<Stat, number>;
}

/** Dados on-chain de DOG de uma carteira real (via DogData). */
export interface DogOnchainInfo {
  balance: number;
  rank: number | null;
  dogcity: {
    status: 'in_snapshot' | 'not_in_snapshot' | 'exchange' | string;
    identity: string | null;
    genesis: boolean;
    areaM2: number | null;
    lotId: string | null;
    district: string | null;
    typology: string | null;
    mapUrl: string | null;
  } | null;
  updatedAt: string;
}

export interface PlayerProfile {
  version: number;
  address: string;
  provider: string;
  dogBalance: number;
  /** 'real' = lido da blockchain via UniSat; senão é simulado a partir do endereço. */
  dogBalanceSource?: 'real' | 'simulated';
  /** Ranking de holder e lote no DogCity (só carteiras reais). */
  dogOnchain?: DogOnchainInfo;
  tier: Tier;
  stardust: number;
  lunarDust: number;
  dog: DogAstronaut;
  launches: LaunchRecord[];
  totalScore: number;
  bestScore: number;
  createdAt: string;
  dailyMissions: DailyMissionState[];
  /** Dia local (YYYY-MM-DD) em que o conjunto atual de missões foi sorteado. */
  missionDay: string;
  /** Dia local em que o jogador usou a troca paga de missões. */
  missionRerollDay: string;
  purchasedUpgrades: string[];
  ownedCosmetics: string[];
  weeklyScores: WeeklyScore[];
}

export interface LaunchRecord {
  id: string;
  route: Pick<Route, 'id' | 'name'>;
  score: number;
  stardustEarned: number;
  stardustCost: number;
  success: boolean;
  timestamp: string;
}

export interface Route {
  id: string;
  name: string;
  description: string;
  cost: number;
  difficulty: number;
  maxScore: number;
  rewardMultiplier: number;
  unlockLevel: number;
  destination: PlanetKind;
  /** Duração do voo em segundos (sem boost). */
  flightSeconds: number;
  /** Asteroides gerados por segundo. */
  hazardRate: number;
  color: string;
}

/** O que aconteceu em um lançamento, produzido pelo jogo. */
export interface LaunchOutcome {
  score: number;
  success: boolean;
  aborted: boolean;
  launchQuality: number;
  perfectLaunch: boolean;
  orbs: number;
  rings: number;
  hits: number;
  hullLeft: number;
  hullMax: number;
}

/** O que o jogador ganhou com o lançamento, calculado pelo App. */
export interface LaunchSummary {
  outcome: LaunchOutcome;
  quality: number;
  stardustEarned: number;
  xpGained: number;
  lunarDustGained: number;
  reputationGained: number;
  levelsGained: number;
  newLevel: number;
  newBest: boolean;
}

export interface LeaderboardEntry {
  address: string;
  dogName: string;
  tier: Tier;
  bestScore: number;
  totalLaunches: number;
  weekScore: number;
  simulated?: boolean;
}

export type MissionType =
  | 'launches'
  | 'success'
  | 'quality'
  | 'orbs'
  | 'rings'
  | 'perfect'
  | 'flawless'
  | 'route'
  | 'stardust';

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  target: number;
  routeId?: string;
  minLevel?: number;
  reward: {
    stardust: number;
    xp: number;
    lunarDust?: number;
  };
}

export interface DailyMissionState {
  missionId: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  stat: Stat;
  level: number;
  cost: number;
}

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Cosmetic {
  id: string;
  name: string;
  type: 'skin' | 'helmet' | 'trail';
  cost: number;
  currency: 'stardust' | 'lunarDust';
  description: string;
  rarity: Rarity;
  /** Cor usada na renderização 3D ('solar' = chama laranja/dourada animada). */
  color: string;
}

export interface WeeklyScore {
  weekStart: string;
  bestScore: number;
  totalLaunches: number;
  totalScore: number;
}

export interface WalletConnection {
  address: string;
  connected: boolean;
  provider: string;
}
