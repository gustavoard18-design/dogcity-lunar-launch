import type { DailyMission, PlanetKind, Stat, Tier } from '../types';
import { getRoute } from '../lib/economy';
import { getEventByRoute } from '../lib/events';
import { STAT_ICON } from '../lib/evolution';
import { L } from '../lib/i18n';

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
  | 'planet-saturn'
  | 'propulsores'
  | 'radar'
  | 'escudo'
  | 'asas'
  | 'booster'
  | 'capacete'
  | 'acessorios'
  | 'modulo';

const UI = new Set(['orb', 'gem', 'ring', 'asteroid', 'trophy', 'medal', 'planet-earth', 'planet-moon', 'planet-ceres', 'planet-mars', 'planet-saturn']);

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
  'planet-saturn': 'rgba(252,211,77,0.45)',
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
      <GameIcon name="gem" size={size} alt={L({ en: 'Lunar Dust', pt: 'Pó Lunar', es: 'Polvo Lunar' })} />
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
  gas: 'planet-saturn',
};

export function routeIcon(routeId: string): IconName {
  const route = getRoute(routeId) ?? getEventByRoute(routeId)?.route;
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
    case 'stardust': return 'orb';
  }
}

/** Cadeado desenhado em SVG. */
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

type GlyphProps = { size?: number | string; className?: string };
const svgProps = (size: number | string, className: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  className: `inline-block shrink-0 align-[-0.15em] ${className}`,
  'aria-hidden': true,
});

/** Coração do casco, com brilho. `empty` = casco perdido. */
export function HeartIcon({ size = 20, className = '', empty = false }: GlyphProps & { empty?: boolean }) {
  return (
    <svg {...svgProps(size, className)} style={empty ? undefined : { filter: 'drop-shadow(0 0 4px rgba(248,113,113,0.7))' }}>
      <defs>
        <linearGradient id="heartg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff8a8a" />
          <stop offset="1" stopColor="#dc2626" />
        </linearGradient>
      </defs>
      <path
        d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.9 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.2 1.8-2 3.3-3.2 5.4-3.2 3.7 0 5.7 3.9 4.2 7.3C19.5 16.4 12 21 12 21z"
        fill={empty ? 'rgba(148,163,184,0.18)' : 'url(#heartg)'}
        stroke={empty ? 'rgba(148,163,184,0.4)' : '#7f1d1d'}
        strokeWidth="0.8"
      />
      {!empty && <ellipse cx="8" cy="8.5" rx="2" ry="1.3" fill="#fff" opacity="0.55" transform="rotate(-30 8 8.5)" />}
    </svg>
  );
}

/** Estrela dourada (resultado, dificuldade). */
export function StarIcon({ size = 20, className = '', empty = false }: GlyphProps & { empty?: boolean }) {
  return (
    <svg {...svgProps(size, className)} style={empty ? undefined : { filter: 'drop-shadow(0 0 5px rgba(253,224,71,0.6))' }}>
      <defs>
        <linearGradient id="starg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6L2.5 9.3l6.6-.8z"
        fill={empty ? 'rgba(148,163,184,0.18)' : 'url(#starg)'}
        stroke={empty ? 'rgba(148,163,184,0.35)' : '#b45309'}
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Dificuldade em 4 estrelas pequenas. */
export function Difficulty({ level, size = 11 }: { level: number; size?: number }) {
  return (
    <span className="inline-flex gap-px align-[-0.1em]" aria-label={L({ en: `Difficulty ${level} of 4`, pt: `Dificuldade ${level} de 4`, es: `Dificultad ${level} de 4` })}>
      {[0, 1, 2, 3].map(i => (
        <StarIcon key={i} size={size} empty={i >= level} />
      ))}
    </span>
  );
}

export function SpeakerIcon({ size = 16, className = '', muted = false }: GlyphProps & { muted?: boolean }) {
  return (
    <svg {...svgProps(size, className)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none" />
      {muted ? (
        <path d="M16 9.5l5 5M21 9.5l-5 5" />
      ) : (
        <>
          <path d="M15.5 9a4 4 0 0 1 0 6" />
          <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
        </>
      )}
    </svg>
  );
}

export function RefreshIcon({ size = 14, className = '' }: GlyphProps) {
  return (
    <svg {...svgProps(size, className)} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 11a8 8 0 0 0-14.6-4.5M4 13a8 8 0 0 0 14.6 4.5" />
      <path d="M5 3v4h4M19 21v-4h-4" />
    </svg>
  );
}

export function EjectIcon({ size = 14, className = '' }: GlyphProps) {
  return (
    <svg {...svgProps(size, className)} fill="currentColor">
      <path d="M12 4l8 9H4z" />
      <rect x="4" y="16" width="16" height="3" rx="1" />
    </svg>
  );
}

export function EyeIcon({ size = 13, className = '' }: GlyphProps) {
  return (
    <svg {...svgProps(size, className)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}

/** Patentes do piloto (valores salvos continuam em inglês; o texto exibido é em português). */
export const TIER_INFO: Record<Tier, { label: string; icon: IconName }> = {
  Legend: { label: L({ en: 'Legend', pt: 'Lenda', es: 'Leyenda' }), icon: 'trophy' },
  Commander: { label: L({ en: 'Commander', pt: 'Comandante', es: 'Comandante' }), icon: 'medal' },
  Pioneer: { label: L({ en: 'Pioneer', pt: 'Pioneiro', es: 'Pionero' }), icon: 'rocket' },
  Explorer: { label: L({ en: 'Explorer', pt: 'Explorador', es: 'Explorador' }), icon: 'radar' },
  Stray: { label: L({ en: 'Recruit', pt: 'Recruta', es: 'Recluta' }), icon: 'escudo' },
};
