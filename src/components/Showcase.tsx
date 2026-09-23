import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { DogAstronaut, Stat } from '../types';
import { ASTRONAUT_TIERS, ROCKET_TIERS, Tier, TierProgress, astronautArt, astronautTier, rocketArt, rocketTier } from '../lib/evolution';
import { LockIcon } from './GameIcon';

type Dog = Pick<DogAstronaut, 'skin' | 'helmet' | 'trail' | Stat>;

interface ShowcaseProps {
  dog: Dog;
  /** Qual evolução detalhar na faixa de fases. */
  focus: 'astronaut' | 'rocket';
  badge?: ReactNode;
  footer?: ReactNode;
}

function Portrait({ src, label, tier, highlight }: { src: string; label: string; tier: Tier; highlight: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative w-full max-w-[190px] aspect-[220/302] rounded-xl overflow-hidden border transition-shadow ${
          highlight ? 'border-fuchsia-400/60 shadow-[0_0_30px_rgba(217,70,239,0.35)]' : 'border-white/10'
        }`}
      >
        <AnimatePresence mode="popLayout">
          <motion.img
            key={src}
            src={src}
            alt={`${label} — ${tier.name}`}
            draggable={false}
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </AnimatePresence>
      </div>
      <div className="mt-2 text-center leading-tight">
        <div className="text-[10px] tracking-[0.3em] text-slate-500">{label}</div>
        <div className={`font-display text-sm ${tier.accent}`}>{tier.name.toUpperCase()}</div>
      </div>
    </div>
  );
}

function EvolutionStrip({ tiers, progress, art, unit }: { tiers: Tier[]; progress: TierProgress; art: (t: Tier) => string; unit: string }) {
  const { tier, points, next } = progress;
  const span = next ? next.min - tier.min : 1;
  const pct = next ? Math.min(100, ((points - tier.min) / span) * 100) : 100;
  return (
    <div className="px-3 pb-3">
      <div className="flex items-center justify-between gap-1">
        {tiers.map((t, i) => {
          const reached = t.index <= tier.index;
          const current = t.index === tier.index;
          return (
            <div key={t.index} className="flex items-center gap-1 flex-1 min-w-0">
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div
                  className={`w-full max-w-[56px] aspect-[220/302] rounded-lg overflow-hidden border ${
                    current ? 'border-fuchsia-400 ring-2 ring-fuchsia-400/40' : reached ? 'border-white/20' : 'border-white/5'
                  }`}
                >
                  <img src={art(t)} alt={t.name} className={`w-full h-full object-cover ${reached ? '' : 'grayscale opacity-35'}`} draggable={false} />
                </div>
                <span className={`mt-1 text-[9px] truncate max-w-full ${current ? t.accent : reached ? 'text-slate-300' : 'text-slate-600'}`}>
                  {reached ? t.name : <><LockIcon size={9} className="inline -mt-0.5" /> {t.name}</>}
                </span>
              </div>
              {i < tiers.length - 1 && <span className={`text-xs ${t.index < tier.index ? 'text-sky-400' : 'text-slate-700'}`}>›</span>}
            </div>
          );
        })}
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-fuchsia-400 transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-[10px] text-slate-400">
        {next ? (
          <>
            Faltam <b className="text-white">{next.min - points}</b> {unit} para <b className={next.accent}>{next.name}</b>
          </>
        ) : (
          <span className="text-fuchsia-300">Fase máxima alcançada</span>
        )}
      </div>
    </div>
  );
}

/** Vitrine: astronauta e foguete na fase atual, com a trilha de evolução em foco. */
export default function Showcase({ dog, focus, badge, footer }: ShowcaseProps) {
  const astro = astronautTier(dog);
  const rocket = rocketTier(dog);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[radial-gradient(ellipse_at_30%_10%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(ellipse_at_80%_70%,rgba(124,58,237,0.25),transparent_60%),rgba(4,6,20,0.7)] mb-4">
      {badge && <div className="absolute top-3 left-3 z-10 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-black/60 border border-white/15 text-white">{badge}</div>}
      <div className="grid grid-cols-2 gap-3 px-4 pt-11 pb-3">
        <Portrait src={astronautArt(astro.tier)} label="ASTRONAUTA" tier={astro.tier} highlight={focus === 'astronaut'} />
        <Portrait src={rocketArt(rocket.tier)} label="FOGUETE" tier={rocket.tier} highlight={focus === 'rocket'} />
      </div>
      {focus === 'astronaut' ? (
        <EvolutionStrip tiers={ASTRONAUT_TIERS} progress={astro} art={astronautArt} unit="pontos de raridade" />
      ) : (
        <EvolutionStrip tiers={ROCKET_TIERS} progress={rocket} art={rocketArt} unit="níveis na Oficina" />
      )}
      {footer && <div className="relative border-t border-white/10 px-3 py-2">{footer}</div>}
    </div>
  );
}
