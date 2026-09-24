import { LaunchOutcome, LifetimeStats, PlayerProfile, Route } from '../types';
import { MAX_STAT_LEVEL } from './stats';

/**
 * Conquistas permanentes: metas de longo prazo medidas sobre os contadores de
 * vida do piloto (`profile.stats`) e sobre o próprio perfil. Uma conquista
 * desbloqueia sozinha e a recompensa é resgatada no painel de Missões.
 */

export type AchievementIcon = 'rocket' | 'trophy' | 'medal' | 'orb' | 'ring' | 'gem' | 'escudo' | 'planet-moon' | 'planet-ceres' | 'planet-mars' | 'propulsores' | 'capacete' | 'booster';

export interface AchievementDef {
  id: string;
  /** Secreta: nome e objetivo ficam ocultos até desbloquear. */
  secret?: boolean;
  title: string;
  description: string;
  icon: AchievementIcon;
  target: number;
  /** Valor atual do objetivo (comparado com `target`). */
  progress: (p: PlayerProfile) => number;
  reward: { stardust: number; lunarDust: number };
}

const routeWins = (id: string) => (p: PlayerProfile) => p.stats.routes[id] ?? 0;

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_success', title: 'Primeiro Salto', description: 'Conclua seu primeiro voo', icon: 'rocket', target: 1, progress: p => p.stats.successes, reward: { stardust: 30, lunarDust: 0 } },
  { id: 'launches_10', title: 'Rotina de Voo', description: 'Faça 10 lançamentos', icon: 'rocket', target: 10, progress: p => p.stats.launches, reward: { stardust: 60, lunarDust: 1 } },
  { id: 'launches_50', title: 'Veterano de Hangar', description: 'Faça 50 lançamentos', icon: 'booster', target: 50, progress: p => p.stats.launches, reward: { stardust: 200, lunarDust: 4 } },
  { id: 'launches_200', title: 'Lenda da Plataforma', description: 'Faça 200 lançamentos', icon: 'booster', target: 200, progress: p => p.stats.launches, reward: { stardust: 600, lunarDust: 12 } },
  { id: 'successes_25', title: 'Piloto de Confiança', description: 'Conclua 25 voos', icon: 'trophy', target: 25, progress: p => p.stats.successes, reward: { stardust: 150, lunarDust: 3 } },
  { id: 'orbs_500', title: 'Garimpeiro Estelar', description: 'Colete 500 orbes', icon: 'orb', target: 500, progress: p => p.stats.orbs, reward: { stardust: 120, lunarDust: 2 } },
  { id: 'orbs_3000', title: 'Tesouro Galáctico', description: 'Colete 3.000 orbes', icon: 'orb', target: 3000, progress: p => p.stats.orbs, reward: { stardust: 400, lunarDust: 8 } },
  { id: 'rings_50', title: 'Acrobata Orbital', description: 'Atravesse 50 anéis de impulso', icon: 'ring', target: 50, progress: p => p.stats.rings, reward: { stardust: 120, lunarDust: 2 } },
  { id: 'rings_250', title: 'Mestre dos Anéis', description: 'Atravesse 250 anéis de impulso', icon: 'ring', target: 250, progress: p => p.stats.rings, reward: { stardust: 350, lunarDust: 6 } },
  { id: 'perfect_10', title: 'Mira de Ouro', description: 'Faça 10 lançamentos PERFEITOS', icon: 'medal', target: 10, progress: p => p.stats.perfects, reward: { stardust: 150, lunarDust: 4 } },
  { id: 'flawless_5', title: 'Casco Intacto', description: 'Conclua 5 voos sem sofrer dano', icon: 'escudo', target: 5, progress: p => p.stats.flawless, reward: { stardust: 180, lunarDust: 4 } },
  { id: 'earn_3000', title: 'Magnata Lunar', description: 'Ganhe 3.000 Stardust em voos', icon: 'orb', target: 3000, progress: p => p.stats.stardustEarned, reward: { stardust: 250, lunarDust: 5 } },
  { id: 'route_moon', title: 'Pés na Lua', description: 'Conclua o Mar da Tranquilidade', icon: 'planet-moon', target: 1, progress: routeWins('sea-of-tranquility'), reward: { stardust: 80, lunarDust: 2 } },
  { id: 'route_belt', title: 'Sobrevivente do Cinturão', description: 'Conclua o Cinturão de Asteroides', icon: 'planet-ceres', target: 1, progress: routeWins('asteroid-belt'), reward: { stardust: 150, lunarDust: 4 } },
  { id: 'route_mars', title: 'Colono de Marte', description: 'Conclua a Colônia de Marte', icon: 'planet-mars', target: 1, progress: routeWins('mars-colony'), reward: { stardust: 300, lunarDust: 8 } },
  { id: 'mars_10', title: 'Linha Regular Marte', description: 'Conclua a Colônia de Marte 10 vezes', icon: 'planet-mars', target: 10, progress: routeWins('mars-colony'), reward: { stardust: 800, lunarDust: 15 } },
  { id: 'events_1', title: 'Caçador de Eventos', description: 'Ganhe o bônus de um evento semanal', icon: 'trophy', target: 1, progress: p => p.eventWins.length, reward: { stardust: 100, lunarDust: 3 } },
  { id: 'events_4', title: 'Temporada Completa', description: 'Ganhe o bônus de 4 eventos semanais', icon: 'trophy', target: 4, progress: p => p.eventWins.length, reward: { stardust: 400, lunarDust: 10 } },
  { id: 'level_5', title: 'Cadete Espacial', description: 'Alcance o nível 5', icon: 'medal', target: 5, progress: p => p.dog.level, reward: { stardust: 100, lunarDust: 2 } },
  { id: 'level_10', title: 'Comandante da Base', description: 'Alcance o nível 10', icon: 'medal', target: 10, progress: p => p.dog.level, reward: { stardust: 300, lunarDust: 6 } },
  { id: 'max_stat', title: 'Engenharia Máxima', description: `Leve um atributo ao nível ${MAX_STAT_LEVEL}`, icon: 'propulsores', target: MAX_STAT_LEVEL, progress: p => Math.max(p.dog.power, p.dog.accuracy, p.dog.luck, p.dog.speed), reward: { stardust: 250, lunarDust: 5 } },
  { id: 'collector_6', title: 'Colecionador', description: 'Tenha 6 itens da Loja', icon: 'capacete', target: 6, progress: p => p.ownedCosmetics.length, reward: { stardust: 150, lunarDust: 3 } },
  { id: 'podium_1', title: 'No Pódio', description: 'Fique no top 3 de um evento semanal', icon: 'medal', target: 1, progress: p => p.podiums.length, reward: { stardust: 150, lunarDust: 5 } },
  { id: 'champion_1', title: 'Campeão Semanal', description: 'Vença um evento semanal', icon: 'trophy', target: 1, progress: p => p.podiums.filter(x => x.place === 1).length, reward: { stardust: 300, lunarDust: 10 } },
  // Secretas
  { id: 'secret_crashes', secret: true, title: 'Aprendendo a Cair', description: 'Perca a nave 10 vezes', icon: 'escudo', target: 10, progress: p => p.stats.crashes, reward: { stardust: 100, lunarDust: 3 } },
  { id: 'secret_close', secret: true, title: 'Por um Fio', description: 'Conclua um voo com só 1 ponto de casco', icon: 'escudo', target: 1, progress: p => p.stats.closeCalls, reward: { stardust: 120, lunarDust: 3 } },
  { id: 'secret_night', secret: true, title: 'Coruja Espacial', description: 'Voe entre meia-noite e 5h da manhã', icon: 'planet-moon', target: 1, progress: p => p.stats.nightFlights, reward: { stardust: 80, lunarDust: 2 } },
  { id: 'secret_rich', secret: true, title: 'Cofre Cheio', description: 'Junte 5.000 Stardust de uma vez', icon: 'orb', target: 5000, progress: p => p.stardust, reward: { stardust: 0, lunarDust: 10 } },
];

export function getAchievementDef(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}

export function emptyStats(): LifetimeStats {
  return { launches: 0, successes: 0, orbs: 0, rings: 0, perfects: 0, flawless: 0, stardustEarned: 0, crashes: 0, closeCalls: 0, nightFlights: 0, routes: {} };
}

/** Soma um voo aos contadores de vida. */
export function addLaunchToStats(stats: LifetimeStats, outcome: LaunchOutcome, route: Route, stardustEarned: number, now: Date = new Date()): LifetimeStats {
  const routes = { ...stats.routes };
  if (outcome.success) routes[route.id] = (routes[route.id] ?? 0) + 1;
  return {
    launches: stats.launches + 1,
    successes: stats.successes + (outcome.success ? 1 : 0),
    orbs: stats.orbs + outcome.orbs,
    rings: stats.rings + outcome.rings,
    perfects: stats.perfects + (outcome.perfectLaunch ? 1 : 0),
    flawless: stats.flawless + (outcome.success && outcome.hits === 0 ? 1 : 0),
    stardustEarned: stats.stardustEarned + stardustEarned,
    crashes: stats.crashes + (outcome.success ? 0 : 1),
    closeCalls: stats.closeCalls + (outcome.success && outcome.hullLeft === 1 && outcome.hullMax > 1 ? 1 : 0),
    nightFlights: stats.nightFlights + (now.getHours() < 5 ? 1 : 0),
    routes,
  };
}

/** Desbloqueia as conquistas cujo objetivo foi atingido. Devolve o mesmo perfil se nada mudou. */
export function unlockAchievements(profile: PlayerProfile, now: Date = new Date()): { profile: PlayerProfile; unlocked: AchievementDef[] } {
  const unlocked = ACHIEVEMENTS.filter(a => !profile.achievements[a.id] && a.progress(profile) >= a.target);
  if (unlocked.length === 0) return { profile, unlocked };
  const achievements = { ...profile.achievements };
  for (const a of unlocked) achievements[a.id] = { unlockedAt: now.toISOString(), claimed: false };
  return { profile: { ...profile, achievements }, unlocked };
}

export function claimAchievement(profile: PlayerProfile, id: string): { profile: PlayerProfile; reward: AchievementDef['reward'] } | null {
  const def = getAchievementDef(id);
  const state = profile.achievements[id];
  if (!def || !state || state.claimed) return null;
  return {
    profile: {
      ...profile,
      stardust: profile.stardust + def.reward.stardust,
      lunarDust: profile.lunarDust + def.reward.lunarDust,
      achievements: { ...profile.achievements, [id]: { ...state, claimed: true } },
    },
    reward: def.reward,
  };
}

/** Escolhe (ou tira, com `null`) o título do piloto. Só vale conquista desbloqueada. */
export function setTitle(profile: PlayerProfile, id: string | null): PlayerProfile | null {
  if (id === null) return { ...profile, title: undefined };
  if (!profile.achievements[id] || !getAchievementDef(id)) return null;
  return { ...profile, title: id };
}

/** Texto do título a partir do id (vazio se desconhecido). */
export function titleText(id?: string | null): string {
  return (id && getAchievementDef(id)?.title) || '';
}

export function hasClaimableAchievement(profile: PlayerProfile): boolean {
  return Object.values(profile.achievements).some(a => !a.claimed);
}

/**
 * Perfis antigos não têm contadores: estima a partir do histórico guardado
 * (últimos 50 voos) e do total de missões do piloto.
 */
export function statsFromHistory(profile: Pick<PlayerProfile, 'launches' | 'dog'>): LifetimeStats {
  const s = emptyStats();
  s.launches = Math.max(profile.dog.missions ?? 0, profile.launches.length);
  for (const l of profile.launches) {
    if (!l.success) continue;
    s.successes += 1;
    s.routes[l.route.id] = (s.routes[l.route.id] ?? 0) + 1;
    s.stardustEarned += l.stardustEarned;
  }
  return s;
}
