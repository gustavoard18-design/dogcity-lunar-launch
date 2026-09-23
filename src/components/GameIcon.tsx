import type { DailyMission, PlanetKind, Stat } from '../types';
import { getRoute } from '../lib/economy';
import { STAT_ICON } from '../lib/evolution';

/**
 * Ícones do jogo no mesmo padrão das artes: renders 3D (public/art/ui),
 * ícones de equipamento (public/art/icons) e os recortes dos personagens.
 */

const base = () => import.meta.env.BASE_URL || './';

export type IconName =
  | 'rocket'
  | 'astronaut'
  | 'orb'
  | 'gem'
  | 'ring'
  | 'asteroid'
  | 'trophy'
  | 'medal'
  | 'planet-earth'
  | 'planet-moon'
  | 'planet-ceres'
  | 'planet-mars'
  | 'propulsores'
  | 'radar'
  | 'escudo'
  | 'asas'
  | 'booster'
  | 'capacete'
  | 'acessorios'
  | 'modulo';

const UI = new Set(['orb', 'gem', 'ring', 'asteroid', 'trophy', 'medal', 'planet-earth', 'planet-moon', 'planet-ceres', 'planet-mars']);

export function iconUrl(name: IconName): string {
  if (name === 'rocket') return `${base()}art/sprite-rocket.webp`;
  if (name === 'astronaut') return `${base()}art/cutout-astronaut.webp`;
  return UI.has(name) ? `${base()}art/ui/${name}.webp` : `${base()}art/icons/${name}.webp`;
}

/** Brilho colorido por trás de cada ícone. */
const GLOW: Partial<Record<IconName, string>> = {
  orb: 'rgba(255,176,32,0.65)',
  gem: 'rgba(168,85,247,0.7)',
  ring: 'rgba(255,79,216,0.6)',
  trophy: 'rgba(255,201,58,0.5)',
  medal: 'rgba(255,201,58,0.45)',
  'planet-earth': 'rgba(56,189,248,0.55)',
  'planet-moon': 'rgba(203,213,225,0.35)',
  'planet-ceres': 'rgba(214,211,209,0.3)',
  'planet-mars': 'rgba(249,115,22,0.5)',
  rocket: 'rgba(239,68,68,0.35)',
};

interface GameIconProps {
  name: IconName;
  /** Tamanho em px ou qualquer valor CSS (ex.: '1.15em' para usar junto a texto). */
  size?: number | string;
  className?: string;
  alt?: string;
  dim?: boolean;
}

export default function GameIcon({ name, size = 24, className = '', alt = '', dim = false }: GameIconProps) {
  const glow = GLOW[name];
  return (
    <img
      src={iconUrl(name)}
      alt={alt}
      draggable={false}
      className={`inline-block shrink-0 object-contain align-[-0.2em] ${dim ? 'grayscale opacity-45' : ''} ${className}`}
      style={{ width: size, height: size, filter: !dim && glow ? `drop-shadow(0 0 6px ${glow})` : undefined }}
    />
  );
}

/** Valor em Stardust com o orbe. */
export function Stardust({ value, sign = '', size = '1.15em' }: { value: number | string; sign?: string; size?: string | number }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <GameIcon name="orb" size={size} alt="Stardust" />
      {sign}
      {value}
    </span>
  );
}

/** Valor em Pó Lunar com o cristal. */
export function LunarDust({ value, sign = '', size = '1.15em' }: { value: number | string; sign?: string; size?: string | number }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <GameIcon name="gem" size={size} alt="Pó Lunar" />
      {sign}
      {value}
    </span>
  );
}

export const PLANET_ICON: Record<PlanetKind, IconName> = {
  earth: 'planet-earth',
  moon: 'planet-moon',
  ceres: 'planet-ceres',
  mars: 'planet-mars',
  gas: 'planet-mars',
};

export function routeIcon(routeId: string): IconName {
  const route = getRoute(routeId);
  return route ? PLANET_ICON[route.destination] : 'planet-earth';
}

export function statIcon(stat: Stat): IconName {
  return STAT_ICON[stat] as IconName;
}

export function missionIcon(def: DailyMission): IconName {
  switch (def.type) {
    case 'launches': return def.target > 3 ? 'booster' : 'rocket';
    case 'success': return 'trophy';
    case 'quality': return 'radar';
    case 'orbs': return 'orb';
    case 'rings': return 'ring';
    case 'perfect': return 'medal';
    case 'flawless': return 'escudo';
    case 'route': return routeIcon(def.routeId ?? '');
    case 'stardust': return 'gem';
  }
}

/** Cadeado desenhado em SVG (substitui o 🔒). */
export function LockIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id="lockg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2e8f0" />
          <stop offset="1" stopColor="#64748b" />
        </linearGradient>
      </defs>
      <path d="M7 10V7a5 5 0 0 1 10 0v3" fill="none" stroke="#cbd5e1" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="4" y="10" width="16" height="12" rx="3" fill="url(#lockg)" stroke="#0f172a" strokeWidth="0.8" />
      <circle cx="12" cy="15.5" r="1.8" fill="#0f172a" />
      <rect x="11.2" y="16" width="1.6" height="3" rx="0.8" fill="#0f172a" />
    </svg>
  );
}
