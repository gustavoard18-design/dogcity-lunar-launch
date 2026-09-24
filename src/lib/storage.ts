import { LeaderboardEntry, PlayerProfile } from '../types';
import { getTier, getXpForLevel, getWeekStart, getDayKey, STARTING_STARDUST } from './economy';
import { ensureDailyMissions } from './missions';
import { emptyStats, getAchievementDef, statsFromHistory, unlockAchievements } from './achievements';
import { DEFAULT_SKIN, DEFAULT_TRAIL } from './shop';
import { MAX_STAT_LEVEL } from './stats';
import { L, Tr } from './i18n';

const STORAGE_KEY = 'dogcity_game_state';
const LEADERBOARD_KEY = 'dogcity_leaderboard_v2';
export const PROFILE_VERSION = 2;

function readJson<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? (JSON.parse(data) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Armazenamento cheio ou bloqueado: o jogo continua em memória.
  }
}

export function getAllProfiles(): Record<string, PlayerProfile> {
  return readJson<Record<string, PlayerProfile>>(STORAGE_KEY, {});
}

export function saveProfile(profile: PlayerProfile): void {
  const all = getAllProfiles();
  all[profile.address] = profile;
  writeJson(STORAGE_KEY, all);
  updateLeaderboard(profile);
}

export function loadProfile(address: string): PlayerProfile | null {
  const raw = getAllProfiles()[address];
  // Perfis antigos recebem na hora as conquistas que já tinham cumprido.
  return raw ? unlockAchievements(ensureDailyMissions(migrateProfile(raw))).profile : null;
}

const clampStat = (v: unknown) => Math.max(1, Math.min(MAX_STAT_LEVEL, Math.floor(Number(v) || 1)));

/** Aceita perfis da v1 (ou corrompidos) e completa campos faltando. */
export function migrateProfile(raw: Partial<PlayerProfile>): PlayerProfile {
  const dog = { ...(raw.dog ?? {}) } as PlayerProfile['dog'];
  const level = Math.max(1, dog.level || 1);
  return {
    version: PROFILE_VERSION,
    address: String(raw.address),
    provider: raw.provider ?? GUEST_PROVIDER,
    dogBalance: raw.dogBalance ?? 0,
    dogBalanceSource: raw.dogBalanceSource ?? 'simulated',
    dogOnchain: raw.dogOnchain,
    tier: raw.tier ?? getTier(raw.dogBalance ?? 0),
    stardust: Math.max(0, Math.floor(raw.stardust ?? STARTING_STARDUST)),
    lunarDust: Math.max(0, Math.floor(raw.lunarDust ?? 0)),
    dog: {
      id: dog.id ?? `dog_${Date.now()}`,
      name: dog.name ?? generateDogName(),
      breed: dog.breed ?? generateBreed(),
      level,
      xp: Math.max(0, dog.xp || 0),
      xpToNext: getXpForLevel(level),
      reputation: Math.max(0, dog.reputation || 0),
      missions: dog.missions || 0,
      createdAt: dog.createdAt ?? new Date().toISOString(),
      power: clampStat(dog.power),
      accuracy: clampStat(dog.accuracy),
      luck: clampStat(dog.luck),
      speed: clampStat(dog.speed),
      skin: dog.skin ?? DEFAULT_SKIN.id,
      helmet: dog.helmet ?? 'none',
      trail: dog.trail ?? DEFAULT_TRAIL.id,
    },
    launches: (raw.launches ?? []).map(l => ({
      ...l,
      route: { id: l.route.id, name: l.route.name },
    })),
    totalScore: raw.totalScore ?? 0,
    bestScore: raw.bestScore ?? 0,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    dailyMissions: raw.dailyMissions ?? [],
    missionDay: raw.missionDay ?? '',
    missionRerollDay: raw.missionRerollDay ?? '',
    purchasedUpgrades: raw.purchasedUpgrades ?? [],
    ownedCosmetics: raw.ownedCosmetics ?? [],
    weeklyScores: raw.weeklyScores ?? [],
    stats: raw.stats ? { ...emptyStats(), ...raw.stats, routes: { ...(raw.stats.routes ?? {}) } } : statsFromHistory({ launches: raw.launches ?? [], dog: { missions: dog.missions || 0 } as PlayerProfile['dog'] }),
    achievements: raw.achievements ?? {},
    eventWins: raw.eventWins ?? [],
    title: raw.title && raw.achievements?.[raw.title] && getAchievementDef(raw.title) ? raw.title : undefined,
    nameStyle: raw.nameStyle,
    podiums: raw.podiums ?? [],
  };
}

export function createProfile(address: string, provider: string, dogBalance: number): PlayerProfile {
  const profile = migrateProfile({ address, provider, dogBalance, stardust: STARTING_STARDUST });
  const withMissions = ensureDailyMissions(profile);
  saveProfile(withMissions);
  return withMissions;
}

function generateDogName(): string {
  const prefixes = ['Astro', 'Cosmo', 'Luna', 'Nova', 'Orbit', 'Star', 'Comet', 'Nebula', 'Solar', 'Rocket'];
  const suffixes = ['paw', 'tail', 'bark', 'howl', 'woof', 'zoom', 'dash', 'flash', 'bolt', 'spark'];
  return prefixes[Math.floor(Math.random() * prefixes.length)] + suffixes[Math.floor(Math.random() * suffixes.length)];
}

/** Raças: o perfil guarda o nome em português (id estável); a tela mostra no idioma do jogo. */
const BREEDS: Record<string, Tr> = {
  'Shiba Inu': { en: 'Shiba Inu', pt: 'Shiba Inu', es: 'Shiba Inu' },
  'Husky Espacial': { en: 'Space Husky', pt: 'Husky Espacial', es: 'Husky Espacial' },
  'Corgi Lunar': { en: 'Lunar Corgi', pt: 'Corgi Lunar', es: 'Corgi Lunar' },
  'Akita Estelar': { en: 'Stellar Akita', pt: 'Akita Estelar', es: 'Akita Estelar' },
  'Malamute Cósmico': { en: 'Cosmic Malamute', pt: 'Malamute Cósmico', es: 'Malamute Cósmico' },
  'Spitz Nebular': { en: 'Nebula Spitz', pt: 'Spitz Nebular', es: 'Spitz Nebular' },
};

function generateBreed(): string {
  const breeds = Object.keys(BREEDS);
  return breeds[Math.floor(Math.random() * breeds.length)];
}

export const breedLabel = (breed: string) => (BREEDS[breed] ? L(BREEDS[breed]) : breed);

/** Provedor gravado no perfil ('Convidado' é o id do piloto convidado). */
export const GUEST_PROVIDER = 'Convidado';
export const providerLabel = (provider: string) => (provider === GUEST_PROVIDER ? L({ en: 'Guest', pt: 'Convidado', es: 'Invitado' }) : provider);

export function getWeeklyBest(profile: PlayerProfile, now: Date = new Date()): number {
  const week = profile.weeklyScores[0];
  return week && week.weekStart === getWeekStart(now) ? week.bestScore : 0;
}

/** Pilotos simulados para o ranking não ficar vazio no modo offline. Variam por semana. */
function simulatedEntries(): LeaderboardEntry[] {
  const seed = getDayKey(new Date(getWeekStart())).split('-').reduce((a, n) => a * 31 + Number(n), 7);
  const vary = (base: number, i: number) => Math.round(base * (0.8 + ((seed * (i + 3)) % 40) / 100));
  const base: [string, string, LeaderboardEntry['tier'], number, number][] = [
    ['bc1qsim0legend', 'Astropaw', 'Legend', 920, 140],
    ['bc1qsim1commander', 'Cosmobark', 'Commander', 780, 96],
    ['bc1qsim2pioneer', 'Lunahowl', 'Pioneer', 410, 61],
    ['bc1qsim3explorer', 'Novazoom', 'Explorer', 210, 38],
    ['bc1qsim4explorer', 'Orbitflash', 'Explorer', 84, 17],
  ];
  return base.map(([address, dogName, tier, best, launches], i) => ({
    address,
    dogName,
    tier,
    bestScore: best,
    totalLaunches: launches,
    weekScore: vary(best * 0.85, i),
    simulated: true,
  }));
}

export function getLeaderboard(): LeaderboardEntry[] {
  const real = readJson<LeaderboardEntry[]>(LEADERBOARD_KEY, []).map(e => ({
    ...e,
    weekScore: e.weekScore ?? 0,
  }));
  // A pontuação semanal dos jogadores locais só vale na semana em que foi feita.
  const profiles = getAllProfiles();
  const current = real.map(e => {
    const p = profiles[e.address];
    return p ? { ...e, weekScore: getWeeklyBest(migrateProfile(p)) } : e;
  });
  return [...current, ...simulatedEntries()].sort((a, b) => b.weekScore - a.weekScore);
}

/** Ranking local da rota do evento nesta semana (pilotos deste navegador). */
export function getEventLeaderboard(routeId: string, now: Date = new Date()): LeaderboardEntry[] {
  const weekStart = new Date(getWeekStart(now)).getTime();
  return Object.values(getAllProfiles())
    .map(raw => {
      const p = migrateProfile(raw);
      const runs = p.launches.filter(l => l.route.id === routeId && l.success && new Date(l.timestamp).getTime() >= weekStart);
      return {
        address: p.address,
        dogName: p.dog.name,
        tier: p.tier,
        title: p.title,
        style: p.nameStyle,
        weekScore: runs.reduce((m, l) => Math.max(m, l.score), 0),
        bestScore: runs.reduce((m, l) => Math.max(m, l.score), 0),
        totalLaunches: runs.length,
      };
    })
    .filter(e => e.totalLaunches > 0)
    .sort((a, b) => b.weekScore - a.weekScore);
}

function updateLeaderboard(profile: PlayerProfile): void {
  const entries = readJson<LeaderboardEntry[]>(LEADERBOARD_KEY, []).filter(e => e.address !== profile.address);
  entries.push({
    address: profile.address,
    dogName: profile.dog.name,
    tier: profile.tier,
    bestScore: profile.bestScore,
    totalLaunches: profile.launches.length,
    weekScore: getWeeklyBest(profile),
    title: profile.title,
    style: profile.nameStyle,
  });
  writeJson(LEADERBOARD_KEY, entries.slice(-50));
}
