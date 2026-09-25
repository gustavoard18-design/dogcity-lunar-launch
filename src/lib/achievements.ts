import { LaunchOutcome, LifetimeStats, PlayerProfile, Route } from '../types';
import { MAX_STAT_LEVEL } from './stats';
import { L } from './i18n';

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
  { id: 'first_success', title: L({ en: 'First Leap', pt: 'Primeiro Salto', es: 'Primer Salto' }), description: L({ en: 'Complete your first flight', pt: 'Conclua seu primeiro voo', es: 'Completa tu primer vuelo' }), icon: 'rocket', target: 1, progress: p => p.stats.successes, reward: { stardust: 30, lunarDust: 0 } },
  { id: 'launches_10', title: L({ en: 'Flight Routine', pt: 'Rotina de Voo', es: 'Rutina de Vuelo' }), description: L({ en: 'Make 10 launches', pt: 'Faça 10 lançamentos', es: 'Haz 10 lanzamientos' }), icon: 'rocket', target: 10, progress: p => p.stats.launches, reward: { stardust: 60, lunarDust: 1 } },
  { id: 'launches_50', title: L({ en: 'Hangar Veteran', pt: 'Veterano de Hangar', es: 'Veterano del Hangar' }), description: L({ en: 'Make 50 launches', pt: 'Faça 50 lançamentos', es: 'Haz 50 lanzamientos' }), icon: 'booster', target: 50, progress: p => p.stats.launches, reward: { stardust: 200, lunarDust: 4 } },
  { id: 'launches_200', title: L({ en: 'Launchpad Legend', pt: 'Lenda da Plataforma', es: 'Leyenda de la Plataforma' }), description: L({ en: 'Make 200 launches', pt: 'Faça 200 lançamentos', es: 'Haz 200 lanzamientos' }), icon: 'booster', target: 200, progress: p => p.stats.launches, reward: { stardust: 600, lunarDust: 12 } },
  { id: 'successes_25', title: L({ en: 'Trusted Pilot', pt: 'Piloto de Confiança', es: 'Piloto de Confianza' }), description: L({ en: 'Complete 25 flights', pt: 'Conclua 25 voos', es: 'Completa 25 vuelos' }), icon: 'trophy', target: 25, progress: p => p.stats.successes, reward: { stardust: 150, lunarDust: 3 } },
  { id: 'orbs_500', title: L({ en: 'Star Prospector', pt: 'Garimpeiro Estelar', es: 'Buscador Estelar' }), description: L({ en: 'Collect 500 orbs', pt: 'Colete 500 orbes', es: 'Recoge 500 orbes' }), icon: 'orb', target: 500, progress: p => p.stats.orbs, reward: { stardust: 120, lunarDust: 2 } },
  { id: 'orbs_3000', title: L({ en: 'Galactic Treasure', pt: 'Tesouro Galáctico', es: 'Tesoro Galáctico' }), description: L({ en: 'Collect 3,000 orbs', pt: 'Colete 3.000 orbes', es: 'Recoge 3.000 orbes' }), icon: 'orb', target: 3000, progress: p => p.stats.orbs, reward: { stardust: 400, lunarDust: 8 } },
  { id: 'rings_50', title: L({ en: 'Orbital Acrobat', pt: 'Acrobata Orbital', es: 'Acróbata Orbital' }), description: L({ en: 'Fly through 50 boost rings', pt: 'Atravesse 50 anéis de impulso', es: 'Atraviesa 50 anillos de impulso' }), icon: 'ring', target: 50, progress: p => p.stats.rings, reward: { stardust: 120, lunarDust: 2 } },
  { id: 'rings_250', title: L({ en: 'Lord of the Rings', pt: 'Mestre dos Anéis', es: 'Señor de los Anillos' }), description: L({ en: 'Fly through 250 boost rings', pt: 'Atravesse 250 anéis de impulso', es: 'Atraviesa 250 anillos de impulso' }), icon: 'ring', target: 250, progress: p => p.stats.rings, reward: { stardust: 350, lunarDust: 6 } },
  { id: 'perfect_10', title: L({ en: 'Golden Aim', pt: 'Mira de Ouro', es: 'Puntería de Oro' }), description: L({ en: 'Make 10 PERFECT launches', pt: 'Faça 10 lançamentos PERFEITOS', es: 'Haz 10 lanzamientos PERFECTOS' }), icon: 'medal', target: 10, progress: p => p.stats.perfects, reward: { stardust: 150, lunarDust: 4 } },
  { id: 'flawless_5', title: L({ en: 'Flawless Hull', pt: 'Casco Intacto', es: 'Casco Intacto' }), description: L({ en: 'Complete 5 flights without taking damage', pt: 'Conclua 5 voos sem sofrer dano', es: 'Completa 5 vuelos sin recibir daño' }), icon: 'escudo', target: 5, progress: p => p.stats.flawless, reward: { stardust: 180, lunarDust: 4 } },
  { id: 'earn_3000', title: L({ en: 'Lunar Tycoon', pt: 'Magnata Lunar', es: 'Magnate Lunar' }), description: L({ en: 'Earn 3,000 Stardust from flights', pt: 'Ganhe 3.000 Stardust em voos', es: 'Gana 3.000 Stardust en vuelos' }), icon: 'orb', target: 3000, progress: p => p.stats.stardustEarned, reward: { stardust: 250, lunarDust: 5 } },
  { id: 'route_moon', title: L({ en: 'Feet on the Moon', pt: 'Pés na Lua', es: 'Pies en la Luna' }), description: L({ en: 'Complete the Sea of Tranquility', pt: 'Conclua o Mar da Tranquilidade', es: 'Completa el Mar de la Tranquilidad' }), icon: 'planet-moon', target: 1, progress: routeWins('sea-of-tranquility'), reward: { stardust: 80, lunarDust: 2 } },
  { id: 'route_belt', title: L({ en: 'Belt Survivor', pt: 'Sobrevivente do Cinturão', es: 'Superviviente del Cinturón' }), description: L({ en: 'Complete the Asteroid Belt', pt: 'Conclua o Cinturão de Asteroides', es: 'Completa el Cinturón de Asteroides' }), icon: 'planet-ceres', target: 1, progress: routeWins('asteroid-belt'), reward: { stardust: 150, lunarDust: 4 } },
  { id: 'route_mars', title: L({ en: 'Mars Settler', pt: 'Colono de Marte', es: 'Colono de Marte' }), description: L({ en: 'Complete the Mars Colony', pt: 'Conclua a Colônia de Marte', es: 'Completa la Colonia de Marte' }), icon: 'planet-mars', target: 1, progress: routeWins('mars-colony'), reward: { stardust: 300, lunarDust: 8 } },
  { id: 'mars_10', title: L({ en: 'Mars Shuttle', pt: 'Linha Regular Marte', es: 'Línea Regular a Marte' }), description: L({ en: 'Complete the Mars Colony 10 times', pt: 'Conclua a Colônia de Marte 10 vezes', es: 'Completa la Colonia de Marte 10 veces' }), icon: 'planet-mars', target: 10, progress: routeWins('mars-colony'), reward: { stardust: 800, lunarDust: 15 } },
  { id: 'events_1', title: L({ en: 'Event Hunter', pt: 'Caçador de Eventos', es: 'Cazador de Eventos' }), description: L({ en: 'Win the bonus of a weekly event', pt: 'Ganhe o bônus de um evento semanal', es: 'Gana el bono de un evento semanal' }), icon: 'trophy', target: 1, progress: p => p.eventWins.length, reward: { stardust: 100, lunarDust: 3 } },
  { id: 'events_4', title: L({ en: 'Full Season', pt: 'Temporada Completa', es: 'Temporada Completa' }), description: L({ en: 'Win the bonus of 4 weekly events', pt: 'Ganhe o bônus de 4 eventos semanais', es: 'Gana el bono de 4 eventos semanales' }), icon: 'trophy', target: 4, progress: p => p.eventWins.length, reward: { stardust: 400, lunarDust: 10 } },
  { id: 'level_5', title: L({ en: 'Space Cadet', pt: 'Cadete Espacial', es: 'Cadete Espacial' }), description: L({ en: 'Reach level 5', pt: 'Alcance o nível 5', es: 'Alcanza el nivel 5' }), icon: 'medal', target: 5, progress: p => p.dog.level, reward: { stardust: 100, lunarDust: 2 } },
  { id: 'level_10', title: L({ en: 'Base Commander', pt: 'Comandante da Base', es: 'Comandante de la Base' }), description: L({ en: 'Reach level 10', pt: 'Alcance o nível 10', es: 'Alcanza el nivel 10' }), icon: 'medal', target: 10, progress: p => p.dog.level, reward: { stardust: 300, lunarDust: 6 } },
  { id: 'max_stat', title: L({ en: 'Max Engineering', pt: 'Engenharia Máxima', es: 'Ingeniería Máxima' }), description: L({ en: `Take a stat to level ${MAX_STAT_LEVEL}`, pt: `Leve um atributo ao nível ${MAX_STAT_LEVEL}`, es: `Lleva un atributo al nivel ${MAX_STAT_LEVEL}` }), icon: 'propulsores', target: MAX_STAT_LEVEL, progress: p => Math.max(p.dog.power, p.dog.accuracy, p.dog.luck, p.dog.speed), reward: { stardust: 250, lunarDust: 5 } },
  { id: 'collector_6', title: L({ en: 'Collector', pt: 'Colecionador', es: 'Coleccionista' }), description: L({ en: 'Own 6 astronaut items', pt: 'Tenha 6 itens do astronauta', es: 'Ten 6 objetos del astronauta' }), icon: 'capacete', target: 6, progress: p => p.ownedCosmetics.length, reward: { stardust: 150, lunarDust: 3 } },
  { id: 'podium_1', title: L({ en: 'On the Podium', pt: 'No Pódio', es: 'En el Podio' }), description: L({ en: 'Finish top 3 in a weekly event', pt: 'Fique no top 3 de um evento semanal', es: 'Queda en el top 3 de un evento semanal' }), icon: 'medal', target: 1, progress: p => p.podiums.length, reward: { stardust: 150, lunarDust: 5 } },
  { id: 'champion_1', title: L({ en: 'Weekly Champion', pt: 'Campeão Semanal', es: 'Campeón Semanal' }), description: L({ en: 'Win a weekly event', pt: 'Vença um evento semanal', es: 'Gana un evento semanal' }), icon: 'trophy', target: 1, progress: p => p.podiums.filter(x => x.place === 1).length, reward: { stardust: 300, lunarDust: 10 } },
  // Secretas
  { id: 'secret_crashes', secret: true, title: L({ en: 'Learning to Fall', pt: 'Aprendendo a Cair', es: 'Aprendiendo a Caer' }), description: L({ en: 'Lose your ship 10 times', pt: 'Perca a nave 10 vezes', es: 'Pierde la nave 10 veces' }), icon: 'escudo', target: 10, progress: p => p.stats.crashes, reward: { stardust: 100, lunarDust: 3 } },
  { id: 'secret_close', secret: true, title: L({ en: 'By a Thread', pt: 'Por um Fio', es: 'Por un Pelo' }), description: L({ en: 'Complete a flight with only 1 hull point', pt: 'Conclua um voo com só 1 ponto de casco', es: 'Completa un vuelo con solo 1 punto de casco' }), icon: 'escudo', target: 1, progress: p => p.stats.closeCalls, reward: { stardust: 120, lunarDust: 3 } },
  { id: 'secret_night', secret: true, title: L({ en: 'Space Owl', pt: 'Coruja Espacial', es: 'Búho Espacial' }), description: L({ en: 'Fly between midnight and 5 AM', pt: 'Voe entre meia-noite e 5h da manhã', es: 'Vuela entre la medianoche y las 5 de la mañana' }), icon: 'planet-moon', target: 1, progress: p => p.stats.nightFlights, reward: { stardust: 80, lunarDust: 2 } },
  { id: 'secret_rich', secret: true, title: L({ en: 'Full Vault', pt: 'Cofre Cheio', es: 'Bóveda Llena' }), description: L({ en: 'Hold 5,000 Stardust at once', pt: 'Junte 5.000 Stardust de uma vez', es: 'Reúne 5.000 Stardust a la vez' }), icon: 'orb', target: 5000, progress: p => p.stardust, reward: { stardust: 0, lunarDust: 10 } },
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
