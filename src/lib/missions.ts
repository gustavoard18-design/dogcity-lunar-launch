import { DailyMission, DailyMissionState, LaunchOutcome, PlayerProfile, Route } from '../types';
import { applyXp, getDayKey, getQuality } from './economy';
import { L } from './i18n';

export const MISSIONS_PER_DAY = 3;
export const REROLL_COST = 25;

export const MISSION_POOL: DailyMission[] = [
  { id: 'launch_3', title: L({ en: 'Space Explorer', pt: 'Explorador Espacial', es: 'Explorador Espacial' }), description: L({ en: 'Make 3 launches', pt: 'Realize 3 lançamentos', es: 'Haz 3 lanzamientos' }), type: 'launches', target: 3, reward: { stardust: 30, xp: 20 } },
  { id: 'launch_6', title: L({ en: 'Hangar Routine', pt: 'Rotina de Hangar', es: 'Rutina de Hangar' }), description: L({ en: 'Make 6 launches', pt: 'Realize 6 lançamentos', es: 'Haz 6 lanzamientos' }), type: 'launches', target: 6, minLevel: 3, reward: { stardust: 60, xp: 45 } },
  { id: 'success_2', title: L({ en: 'Reliable Pilot', pt: 'Piloto Confiável', es: 'Piloto Confiable' }), description: L({ en: 'Complete 2 flights successfully', pt: 'Complete 2 voos com sucesso', es: 'Completa 2 vuelos con éxito' }), type: 'success', target: 2, reward: { stardust: 40, xp: 25 } },
  { id: 'quality_70', title: L({ en: 'Lunar Precision', pt: 'Precisão Lunar', es: 'Precisión Lunar' }), description: L({ en: 'Finish a flight with 70% of the max score', pt: 'Conclua um voo com 70% do score máximo', es: 'Completa un vuelo con el 70% de la puntuación máxima' }), type: 'quality', target: 70, reward: { stardust: 50, xp: 35, lunarDust: 2 } },
  { id: 'orbs_40', title: L({ en: 'Dust Collector', pt: 'Coletor de Poeira', es: 'Recolector de Polvo' }), description: L({ en: 'Collect 40 Stardust orbs', pt: 'Colete 40 orbes de Stardust', es: 'Recoge 40 orbes de Stardust' }), type: 'orbs', target: 40, reward: { stardust: 35, xp: 25 } },
  { id: 'orbs_120', title: L({ en: 'Cosmic Vacuum', pt: 'Aspirador Cósmico', es: 'Aspiradora Cósmica' }), description: L({ en: 'Collect 120 Stardust orbs', pt: 'Colete 120 orbes de Stardust', es: 'Recoge 120 orbes de Stardust' }), type: 'orbs', target: 120, minLevel: 3, reward: { stardust: 80, xp: 50, lunarDust: 3 } },
  { id: 'rings_8', title: L({ en: 'Acrobat', pt: 'Acrobata', es: 'Acróbata' }), description: L({ en: 'Fly through 8 boost rings', pt: 'Atravesse 8 anéis de impulso', es: 'Atraviesa 8 anillos de impulso' }), type: 'rings', target: 8, reward: { stardust: 40, xp: 30 } },
  { id: 'perfect_1', title: L({ en: 'Perfect Liftoff', pt: 'Decolagem Perfeita', es: 'Despegue Perfecto' }), description: L({ en: 'Make a PERFECT launch', pt: 'Faça um lançamento PERFEITO', es: 'Haz un lanzamiento PERFECTO' }), type: 'perfect', target: 1, reward: { stardust: 45, xp: 30, lunarDust: 2 } },
  { id: 'flawless_1', title: L({ en: 'Not a Scratch', pt: 'Sem Arranhões', es: 'Sin un Rasguño' }), description: L({ en: 'Complete a flight without taking damage', pt: 'Complete um voo sem sofrer dano', es: 'Completa un vuelo sin recibir daño' }), type: 'flawless', target: 1, reward: { stardust: 60, xp: 40, lunarDust: 2 } },
  { id: 'moon_1', title: L({ en: 'Moon Footprint', pt: 'Pegada na Lua', es: 'Huella en la Luna' }), description: L({ en: 'Reach the Sea of Tranquility', pt: 'Chegue ao Mar da Tranquilidade', es: 'Llega al Mar de la Tranquilidad' }), type: 'route', routeId: 'sea-of-tranquility', target: 1, minLevel: 2, reward: { stardust: 70, xp: 50, lunarDust: 3 } },
  { id: 'belt_1', title: L({ en: 'Between Rocks', pt: 'Entre Rochas', es: 'Entre Rocas' }), description: L({ en: 'Cross the Asteroid Belt', pt: 'Atravesse o Cinturão de Asteroides', es: 'Atraviesa el Cinturón de Asteroides' }), type: 'route', routeId: 'asteroid-belt', target: 1, minLevel: 4, reward: { stardust: 120, xp: 80, lunarDust: 5 } },
  { id: 'mars_1', title: L({ en: 'Red Flag', pt: 'Bandeira Vermelha', es: 'Bandera Roja' }), description: L({ en: 'Reach the Mars Colony', pt: 'Chegue à Colônia de Marte', es: 'Llega a la Colonia de Marte' }), type: 'route', routeId: 'mars-colony', target: 1, minLevel: 7, reward: { stardust: 250, xp: 150, lunarDust: 8 } },
  { id: 'earn_250', title: L({ en: 'Stellar Economy', pt: 'Economia Estelar', es: 'Economía Estelar' }), description: L({ en: 'Earn 250 Stardust from flights', pt: 'Ganhe 250 Stardust em voos', es: 'Gana 250 Stardust en vuelos' }), type: 'stardust', target: 250, minLevel: 2, reward: { stardust: 50, xp: 30 } },
];

export function getMissionDef(id: string): DailyMission | undefined {
  return MISSION_POOL.find(m => m.id === id);
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sorteio determinístico por dia e jogador, respeitando o nível. */
export function pickDailyMissions(dayKey: string, address: string, level: number, salt = ''): DailyMission[] {
  const rand = seededRandom(hashString(`${dayKey}|${address}|${salt}`));
  const pool = MISSION_POOL.filter(m => (m.minLevel ?? 1) <= level);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, MISSIONS_PER_DAY);
}

function toStates(missions: DailyMission[]): DailyMissionState[] {
  return missions.map(m => ({ missionId: m.id, progress: 0, completed: false, claimed: false }));
}

/** Renova as missões quando o dia muda. Seguro para chamar a qualquer momento. */
export function ensureDailyMissions(profile: PlayerProfile, now: Date = new Date()): PlayerProfile {
  const today = getDayKey(now);
  const valid = profile.dailyMissions.length > 0 && profile.dailyMissions.every(s => getMissionDef(s.missionId));
  if (profile.missionDay === today && valid) return profile;
  return {
    ...profile,
    missionDay: today,
    dailyMissions: toStates(pickDailyMissions(today, profile.address, profile.dog.level)),
  };
}

export function canReroll(profile: PlayerProfile, now: Date = new Date()): boolean {
  return profile.missionRerollDay !== getDayKey(now) && profile.stardust >= REROLL_COST;
}

/** Troca paga (1x por dia) das missões ainda não resgatadas. */
export function rerollMissions(profile: PlayerProfile, now: Date = new Date()): PlayerProfile | null {
  if (!canReroll(profile, now)) return null;
  const today = getDayKey(now);
  const kept = profile.dailyMissions.filter(s => s.claimed);
  const keptIds = new Set(kept.map(s => s.missionId));
  const fresh = pickDailyMissions(today, profile.address, profile.dog.level, `reroll-${Date.now()}`)
    .concat(pickDailyMissions(today, profile.address, profile.dog.level, 'fallback'))
    .filter(m => !keptIds.has(m.id) && !profile.dailyMissions.some(s => s.missionId === m.id && !s.claimed));
  const unique = [...new Map(fresh.map(m => [m.id, m])).values()].slice(0, MISSIONS_PER_DAY - kept.length);
  if (unique.length === 0) return null;
  return {
    ...profile,
    stardust: profile.stardust - REROLL_COST,
    missionRerollDay: today,
    dailyMissions: [...kept, ...toStates(unique)],
  };
}

export function applyLaunchToMissions(
  missions: DailyMissionState[],
  outcome: LaunchOutcome,
  route: Route,
  stardustEarned: number
): DailyMissionState[] {
  const quality = Math.round(getQuality(outcome.score, route) * 100);
  return missions.map(state => {
    if (state.completed) return state;
    const def = getMissionDef(state.missionId);
    if (!def) return state;

    let progress = state.progress;
    switch (def.type) {
      case 'launches': progress += 1; break;
      case 'success': if (outcome.success) progress += 1; break;
      case 'quality': progress = Math.max(progress, outcome.success ? quality : 0); break;
      case 'orbs': progress += outcome.orbs; break;
      case 'rings': progress += outcome.rings; break;
      case 'perfect': if (outcome.perfectLaunch) progress += 1; break;
      case 'flawless': if (outcome.success && outcome.hits === 0) progress += 1; break;
      case 'route': if (outcome.success && def.routeId === route.id) progress += 1; break;
      case 'stardust': progress += stardustEarned; break;
    }
    return { ...state, progress, completed: progress >= def.target };
  });
}

export function claimMission(
  profile: PlayerProfile,
  missionId: string
): { profile: PlayerProfile; reward: { stardust: number; xp: number; lunarDust: number }; levelsGained: number } | null {
  const state = profile.dailyMissions.find(m => m.missionId === missionId);
  const def = getMissionDef(missionId);
  if (!state || !def || !state.completed || state.claimed) return null;

  const reward = { stardust: def.reward.stardust, xp: def.reward.xp, lunarDust: def.reward.lunarDust ?? 0 };
  const { dog, levelsGained } = applyXp(profile.dog, reward.xp);
  return {
    profile: {
      ...profile,
      dog,
      stardust: profile.stardust + reward.stardust,
      lunarDust: profile.lunarDust + reward.lunarDust,
      dailyMissions: profile.dailyMissions.map(m => (m.missionId === missionId ? { ...m, claimed: true } : m)),
    },
    reward,
    levelsGained,
  };
}
