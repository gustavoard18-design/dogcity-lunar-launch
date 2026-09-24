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
    /** Registro da cidade (perfil DogData); ausentes em dados antigos. */
    street?: string | null;
    number?: number | string | null;
    zone?: string | null;
    /** 1 a 5 estrelas. */
    prestige?: number | null;
  } | null;
  /** Handle e avatar Ordinal do perfil DogData. */
  identity?: DogDataIdentity | null;
  updatedAt: string;
}

/** Identidade escolhida no perfil do DogData (dogdata.xyz). */
export interface DogDataIdentity {
  handle: string | null;
  /** Id da inscrição Ordinal usada como foto. */
  avatarId: string | null;
}

export interface PlayerProfile {
  version: number;
  address: string;
  provider: string;
  dogBalance: number;
  /** 'real' = lido da blockchain (carteira conectada, dados do DogData); senão é simulado a partir do endereço. */
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
  /** Contadores de toda a vida do piloto (base das conquistas). */
  stats: LifetimeStats;
  /** Conquistas desbloqueadas (id → quando e se a recompensa já foi resgatada). */
  achievements: Record<string, AchievementState>;
  /** Semanas (weekStart ISO) em que o bônus do evento semanal já foi ganho. */
  eventWins: string[];
  /** Conquista escolhida como título do piloto (aparece no perfil e no ranking). */
  title?: string;
  /** Moldura de nome escolhida (id de NAME_FRAMES). */
  nameStyle?: string;
  /** Pódios do evento semanal já premiados (mais recente primeiro). */
  podiums: PodiumRecord[];
  /** Sequência de dias jogando (dia local YYYY-MM-DD da última entrada). */
  streak: { count: number; best: number; lastDay: string };
  /** Temporada mensal em curso: pontos e último nível do passe já recebido. */
  season: { id: string; points: number; tier: number };
  /** Molduras de temporadas completas (ids season_YYYY_MM). */
  seasonFrames: string[];
  /** Semanas (weekStart ISO) em que o distrito do piloto venceu a guerra de distritos. */
  districtWins: string[];
}

export interface PodiumRecord {
  weekStart: string;
  routeId: string;
  eventName: string;
  place: 1 | 2 | 3;
  stardust: number;
  lunarDust: number;
  awardedAt: string;
}

export interface LifetimeStats {
  launches: number;
  successes: number;
  orbs: number;
  rings: number;
  perfects: number;
  flawless: number;
  stardustEarned: number;
  /** Naves perdidas ou voos abortados. */
  crashes: number;
  /** Voos concluídos com só 1 ponto de casco sobrando. */
  closeCalls: number;
  /** Voos feitos entre 0h e 5h (horário local). */
  nightFlights: number;
  /** Voos concluídos com sucesso por rota. */
  routes: Record<string, number>;
}

export interface AchievementState {
  unlockedAt: string;
  claimed: boolean;
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
  /** Multiplica a taxa de orbes (rotas de evento). */
  orbRateMult?: number;
  /** Multiplica a frequência dos anéis de impulso (rotas de evento). */
  ringRateMult?: number;
  /** Rota especial do evento semanal. */
  event?: boolean;
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
  /** Bônus do evento semanal ganho neste voo (uma vez por semana). */
  eventBonus?: { stardust: number; lunarDust: number };
  /** Conquistas desbloqueadas por este voo. */
  newAchievements: string[];
  /** Pontos de temporada ganhos e níveis do passe alcançados neste voo. */
  seasonPoints?: number;
  seasonTiers?: number[];
}

export interface LeaderboardEntry {
  address: string;
  dogName: string;
  tier: Tier;
  bestScore: number;
  totalLaunches: number;
  weekScore: number;
  simulated?: boolean;
  /** Id da conquista usada como título. */
  title?: string;
  /** Id da moldura de nome. */
  style?: string;
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
