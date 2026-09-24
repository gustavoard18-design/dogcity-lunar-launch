import type { PlayerProfile } from '../types';
import { L, type Tr } from './i18n';

/**
 * Temporadas mensais: cada mês tem um tema, um passe de 10 níveis e um ranking
 * próprio. Voo concluído vale 10 + score/10 pontos (a mesma conta do ranking da
 * temporada no servidor), então rotas difíceis rendem mais. O nível 10 libera a
 * moldura de nome exclusiva do mês, que depois não volta.
 */

export interface SeasonTheme {
  name: Tr;
  /** Cores do degradê da moldura (perfil e cartão). */
  colors: [string, string, string];
}

/** Um tema por mês (janeiro = 0). */
export const SEASON_THEMES: SeasonTheme[] = [
  { name: { en: 'Frozen Moon', pt: 'Lua Congelada', es: 'Luna Helada' }, colors: ['#e0f2fe', '#7dd3fc', '#e0f2fe'] },
  { name: { en: 'Red Planet', pt: 'Planeta Vermelho', es: 'Planeta Rojo' }, colors: ['#fecaca', '#f87171', '#fb923c'] },
  { name: { en: 'Comet Spring', pt: 'Primavera dos Cometas', es: 'Primavera de Cometas' }, colors: ['#bbf7d0', '#4ade80', '#a7f3d0'] },
  { name: { en: 'Nebula Bloom', pt: 'Nebulosa em Flor', es: 'Nebulosa en Flor' }, colors: ['#fbcfe8', '#e879f9', '#c4b5fd'] },
  { name: { en: 'Solar Wind', pt: 'Vento Solar', es: 'Viento Solar' }, colors: ['#fef08a', '#fb923c', '#fde68a'] },
  { name: { en: 'Ring Racers', pt: 'Corrida dos Anéis', es: 'Carrera de Anillos' }, colors: ['#fde68a', '#fbbf24', '#f472b6'] },
  { name: { en: 'Deep Orbit', pt: 'Órbita Profunda', es: 'Órbita Profunda' }, colors: ['#c7d2fe', '#818cf8', '#67e8f9'] },
  { name: { en: 'Meteor Summer', pt: 'Verão de Meteoros', es: 'Verano de Meteoros' }, colors: ['#fed7aa', '#f97316', '#fde047'] },
  { name: { en: 'Satoshi Harvest', pt: 'Colheita Satoshi', es: 'Cosecha Satoshi' }, colors: ['#fde68a', '#f7931a', '#fef3c7'] },
  { name: { en: 'Lunar Launch', pt: 'Lançamento Lunar', es: 'Lanzamiento Lunar' }, colors: ['#e2e8f0', '#38bdf8', '#fcd34d'] },
  { name: { en: 'Dark Side', pt: 'Lado Oculto', es: 'Cara Oculta' }, colors: ['#e9d5ff', '#a855f7', '#94a3b8'] },
  { name: { en: 'Starlight', pt: 'Luz das Estrelas', es: 'Luz Estelar' }, colors: ['#fef9c3', '#fcd34d', '#bae6fd'] },
];

export interface SeasonTierDef {
  points: number;
  stardust: number;
  lunarDust: number;
  /** Nível final: libera a moldura da temporada. */
  frame?: boolean;
}

export const SEASON_TIERS: SeasonTierDef[] = [
  { points: 60, stardust: 40, lunarDust: 0 },
  { points: 150, stardust: 60, lunarDust: 1 },
  { points: 280, stardust: 80, lunarDust: 1 },
  { points: 450, stardust: 100, lunarDust: 2 },
  { points: 700, stardust: 120, lunarDust: 2 },
  { points: 1000, stardust: 150, lunarDust: 3 },
  { points: 1400, stardust: 180, lunarDust: 3 },
  { points: 1900, stardust: 220, lunarDust: 4 },
  { points: 2400, stardust: 260, lunarDust: 5 },
  { points: 3000, stardust: 300, lunarDust: 8, frame: true },
];

/** Id da temporada do mês (season_YYYY_MM), no horário local. */
export function seasonId(now: Date = new Date()): string {
  return `season_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const SEASON_RE = /^season_(\d{4})_(0[1-9]|1[0-2])$/;
export const isSeasonId = (id: string) => SEASON_RE.test(id);

export function seasonTheme(id: string): SeasonTheme | undefined {
  const m = SEASON_RE.exec(id);
  return m ? SEASON_THEMES[Number(m[2]) - 1] : undefined;
}

/** Nome da temporada no idioma atual, ex.: "Red Planet 2026". */
export function seasonName(id: string): string {
  const m = SEASON_RE.exec(id);
  const theme = seasonTheme(id);
  return theme && m ? `${L(theme.name)} ${m[1]}` : id;
}

/** Milissegundos até a próxima temporada (dia 1 do mês seguinte, 00:00 local). */
export function msUntilNextSeason(now: Date = new Date()): number {
  return Math.max(0, new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() - now.getTime());
}

/** Pontos de temporada de um voo (só voo concluído pontua). */
export function seasonPoints(score: number, success: boolean): number {
  return success ? 10 + Math.floor(Math.max(0, score) / 10) : 0;
}

/** Temporada do perfil já no mês atual (zera pontos e níveis quando o mês vira). */
export function currentSeason(profile: PlayerProfile, now: Date = new Date()): PlayerProfile['season'] {
  const id = seasonId(now);
  return profile.season.id === id ? profile.season : { id, points: 0, tier: 0 };
}

export interface SeasonGain {
  profile: PlayerProfile;
  points: number;
  /** Níveis alcançados neste voo (índices 1..10), já pagos. */
  tiers: number[];
  frame?: string;
}

/** Soma os pontos do voo, paga os níveis alcançados e libera a moldura no nível 10. */
export function applySeasonPoints(profile: PlayerProfile, score: number, success: boolean, now: Date = new Date()): SeasonGain {
  const season = currentSeason(profile, now);
  const points = seasonPoints(score, success);
  const total = season.points + points;
  let tier = season.tier;
  let stardust = 0;
  let lunarDust = 0;
  const tiers: number[] = [];
  let frame: string | undefined;
  while (tier < SEASON_TIERS.length && total >= SEASON_TIERS[tier].points) {
    const def = SEASON_TIERS[tier];
    tier += 1;
    tiers.push(tier);
    stardust += def.stardust;
    lunarDust += def.lunarDust;
    if (def.frame) frame = season.id;
  }
  const seasonFrames = frame && !profile.seasonFrames.includes(frame) ? [...profile.seasonFrames, frame] : profile.seasonFrames;
  return {
    points,
    tiers,
    frame,
    profile: {
      ...profile,
      stardust: profile.stardust + stardust,
      lunarDust: profile.lunarDust + lunarDust,
      season: { id: season.id, points: total, tier },
      seasonFrames,
    },
  };
}
