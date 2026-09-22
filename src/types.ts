export type Tier = 'Stray' | 'Explorer' | 'Pioneer' | 'Commander' | 'Legend';

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

export interface PlayerProfile {
  address: string;
  dogBalance: number;
  tier: Tier;
  stardust: number;
  lunarDust: number;
  dog: DogAstronaut;
  launches: LaunchRecord[];
  totalScore: number;
  bestScore: number;
  createdAt: string;
  dailyMissions: DailyMissionState[];
  lastMissionReset: string;
  purchasedUpgrades: string[];
  ownedCosmetics: string[];
  unlockedAchievements: string[];
  weeklyScores: WeeklyScore[];
  currentWeekStart: string;
}

export interface LaunchRecord {
  id: string;
  route: Route;
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
  emoji: string;
}

export interface LeaderboardEntry {
  address: string;
  dogName: string;
  tier: Tier;
  bestScore: number;
  totalLaunches: number;
  weekScore: number;
}

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  type: 'launches' | 'score' | 'success' | 'route' | 'stardust';
  target: number;
  reward: {
    stardust: number;
    xp: number;
    lunarDust?: number;
  };
  emoji: string;
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
  stat: 'power' | 'accuracy' | 'luck' | 'speed';
  level: number;
  cost: number;
  emoji: string;
}

export interface Cosmetic {
  id: string;
  name: string;
  type: 'skin' | 'helmet' | 'trail';
  cost: number;
  currency: 'stardust' | 'lunarDust';
  emoji: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
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
