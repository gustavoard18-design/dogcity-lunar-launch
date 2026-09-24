import type { PlayerProfile } from '../types';
import { ACHIEVEMENTS } from './achievements';

/**
 * Molduras de nome: estilos do nome do piloto desbloqueados por conquistas
 * raras ou pelo pódio do evento semanal. Aparecem no perfil e no ranking; no
 * servidor fica só o id (validado por padrão), o visual mora no jogo.
 */

export interface NameFrame {
  id: string;
  name: string;
  /** Como desbloquear (texto para o jogador). */
  requirement: string;
  unlocked: (p: PlayerProfile) => boolean;
  /** Classes do texto do nome. */
  text: string;
  /** Moldura em volta do nome (opcional). */
  frame?: string;
  /** Ícone antes do nome. */
  badge?: string;
  /** Mesmo visual no cartão de compartilhamento (canvas). */
  card: CardStyle;
}

/** Estilo do nome desenhado em canvas: cores do degradê, brilho e moldura. */
export interface CardStyle {
  colors: string[];
  glow?: string;
  border?: string;
}

const has = (id: string) => (p: PlayerProfile) => Boolean(p.achievements[id]);
const gradient = 'bg-clip-text text-transparent bg-gradient-to-r';

export const NAME_FRAMES: NameFrame[] = [
  {
    id: 'mars',
    name: 'Poeira Vermelha',
    requirement: 'Conquista "Colono de Marte"',
    unlocked: has('route_mars'),
    text: `${gradient} from-orange-300 via-red-400 to-orange-500`,
    card: { colors: ['#fdba74', '#f87171', '#f97316'] },
  },
  {
    id: 'rings',
    name: 'Anéis Cósmicos',
    requirement: 'Conquista "Mestre dos Anéis"',
    unlocked: has('rings_250'),
    text: `${gradient} from-pink-300 via-fuchsia-400 to-violet-400`,
    card: { colors: ['#f9a8d4', '#e879f9', '#a78bfa'] },
  },
  {
    id: 'veteran',
    name: 'Veterano',
    requirement: 'Conquista "Lenda da Plataforma"',
    unlocked: has('launches_200'),
    text: 'text-cyan-200 drop-shadow-[0_0_8px_rgba(103,232,249,0.9)]',
    card: { colors: ['#a5f3fc'], glow: 'rgba(103,232,249,0.9)' },
  },
  {
    id: 'nebula',
    name: 'Nebulosa',
    requirement: 'Descubra 2 conquistas secretas',
    unlocked: p => ACHIEVEMENTS.filter(a => a.secret && p.achievements[a.id]).length >= 2,
    text: `${gradient} from-fuchsia-300 via-sky-300 to-violet-300 name-shimmer`,
    card: { colors: ['#f0abfc', '#7dd3fc', '#c4b5fd'], glow: 'rgba(196,181,253,0.6)' },
  },
  {
    id: 'gold',
    name: 'Ouro Estelar',
    requirement: 'Conquista "Temporada Completa"',
    unlocked: has('events_4'),
    text: `${gradient} from-yellow-200 via-amber-400 to-yellow-200 name-shimmer`,
    card: { colors: ['#fef08a', '#fbbf24', '#fef08a'], glow: 'rgba(251,191,36,0.5)' },
  },
  {
    id: 'podium',
    name: 'Pódio',
    requirement: 'Fique no top 3 de um evento semanal',
    unlocked: p => p.podiums.length > 0,
    text: 'text-white',
    frame: 'px-2 rounded-lg border border-sky-200/70 shadow-[0_0_10px_rgba(186,230,253,0.45)] bg-sky-300/10',
    badge: '🏅',
    card: { colors: ['#ffffff'], border: 'rgba(186,230,253,0.8)', glow: 'rgba(186,230,253,0.45)' },
  },
  {
    id: 'champion',
    name: 'Campeão do Evento',
    requirement: 'Vença um evento semanal (1º lugar)',
    unlocked: p => p.podiums.some(x => x.place === 1),
    text: `${gradient} from-yellow-100 via-amber-300 to-yellow-100 name-shimmer`,
    frame: 'px-2 rounded-lg border border-amber-300/80 shadow-[0_0_14px_rgba(252,211,77,0.55)] bg-amber-400/10',
    badge: '👑',
    card: { colors: ['#fef9c3', '#fcd34d', '#fef9c3'], border: 'rgba(252,211,77,0.9)', glow: 'rgba(252,211,77,0.55)' },
  },
];

export function getNameFrame(id?: string | null): NameFrame | undefined {
  return id ? NAME_FRAMES.find(f => f.id === id) : undefined;
}

/** Escolhe (ou tira, com `null`) a moldura. Só vale moldura desbloqueada. */
export function setNameStyle(profile: PlayerProfile, id: string | null): PlayerProfile | null {
  if (id === null) return { ...profile, nameStyle: undefined };
  const f = getNameFrame(id);
  if (!f || !f.unlocked(profile)) return null;
  return { ...profile, nameStyle: id };
}
