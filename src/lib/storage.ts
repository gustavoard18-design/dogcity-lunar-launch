import { PlayerProfile, LeaderboardEntry } from '../types';
import { getTier, getXpForLevel, getWeekStart } from './economy';
import { initializeDailyMissions } from './missions';

const STORAGE_KEY = 'dogcity_game_state';
const LEADERBOARD_KEY = 'dogcity_leaderboard';

export function saveProfile(profile: PlayerProfile): void {
  const allProfiles = getAllProfiles();
  allProfiles[profile.address] = profile;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allProfiles));
  updateLeaderboard(profile);
}

export function loadProfile(address: string): PlayerProfile | null {
  const allProfiles = getAllProfiles();
  return allProfiles[address] || null;
}

export function getAllProfiles(): Record<string, PlayerProfile> {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return {};
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export function createProfile(address: string, dogBalance: number): PlayerProfile {
  const tier = getTier(dogBalance);
  const profile: PlayerProfile = {
    address,
    dogBalance,
    tier,
    stardust: 100,
    lunarDust: 0,
    dog: {
      id: `dog_${Date.now()}`,
      name: generateDogName(),
      breed: generateBreed(),
      level: 1,
      xp: 0,
      xpToNext: getXpForLevel(1),
      reputation: 0,
      missions: 0,
      createdAt: new Date().toISOString(),
      power: 1,
      accuracy: 1,
      luck: 1,
      speed: 1,
      skin: 'default',
      helmet: 'none',
      trail: 'orange',
    },
    launches: [],
    totalScore: 0,
    bestScore: 0,
    createdAt: new Date().toISOString(),
    dailyMissions: [],
    lastMissionReset: new Date().toISOString(),
    purchasedUpgrades: [],
    ownedCosmetics: [],
    unlockedAchievements: [],
    weeklyScores: [],
    currentWeekStart: getWeekStart(),
  };
  
  profile.dailyMissions = initializeDailyMissions(profile);
  saveProfile(profile);
  return profile;
}

function generateDogName(): string {
  const prefixes = ['Astro', 'Cosmo', 'Luna', 'Nova', 'Orbit', 'Star', 'Comet', 'Nebula', 'Solar', 'Rocket'];
  const suffixes = ['paw', 'tail', 'bark', 'howl', 'woof', 'zoom', 'dash', 'flash', 'bolt', 'spark'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return prefix + suffix;
}

function generateBreed(): string {
  const breeds = ['Shiba Inu', 'Husky Espacial', 'Corgi Lunar', 'Akita Estelar', 'Malamute Cósmico', 'Spitz Nebular'];
  return breeds[Math.floor(Math.random() * breeds.length)];
}

export function getLeaderboard(): LeaderboardEntry[] {
  const data = localStorage.getItem(LEADERBOARD_KEY);
  if (!data) return generateMockLeaderboard();
  try {
    return JSON.parse(data);
  } catch {
    return generateMockLeaderboard();
  }
}

function updateLeaderboard(profile: PlayerProfile): void {
  const leaderboard = getLeaderboard();
  const existing = leaderboard.findIndex(e => e.address === profile.address);
  
  const weekStart = getWeekStart();
  const weekLaunches = profile.launches.filter(l => new Date(l.timestamp) >= new Date(weekStart));
  const weekScore = weekLaunches.reduce((max, l) => Math.max(max, l.score), 0);
  
  const entry: LeaderboardEntry = {
    address: profile.address,
    dogName: profile.dog.name,
    tier: profile.tier,
    bestScore: profile.bestScore,
    totalLaunches: profile.launches.length,
    weekScore,
  };

  if (existing >= 0) {
    leaderboard[existing] = entry;
  } else {
    leaderboard.push(entry);
  }

  leaderboard.sort((a, b) => b.bestScore - a.bestScore);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard.slice(0, 50)));
}

function generateMockLeaderboard(): LeaderboardEntry[] {
  const mockEntries: LeaderboardEntry[] = [
    { address: 'bc1q_mock_legend_1', dogName: 'Astropaw', tier: 'Legend', bestScore: 2450, totalLaunches: 89, weekScore: 890 },
    { address: 'bc1q_mock_commander_1', dogName: 'Cosmobark', tier: 'Commander', bestScore: 1820, totalLaunches: 56, weekScore: 620 },
    { address: 'bc1q_mock_pioneer_1', dogName: 'Lunahowl', tier: 'Pioneer', bestScore: 1340, totalLaunches: 42, weekScore: 450 },
    { address: 'bc1q_mock_explorer_1', dogName: 'Novazoom', tier: 'Explorer', bestScore: 890, totalLaunches: 31, weekScore: 320 },
    { address: 'bc1q_mock_explorer_2', dogName: 'Orbitflash', tier: 'Explorer', bestScore: 650, totalLaunches: 22, weekScore: 210 },
  ];
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(mockEntries));
  return mockEntries;
}
