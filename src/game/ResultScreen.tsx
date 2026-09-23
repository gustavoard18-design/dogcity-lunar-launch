import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { LaunchSummary, Route } from '../types';
import { cutoutArt } from '../lib/evolution';
import GameIcon, { IconName, LunarDust, PLANET_ICON, Stardust } from '../components/GameIcon';

interface ResultScreenProps {
  route: Route;
  summary: LaunchSummary;
  canRetry: boolean;
  onRetry(): void;
  onExit(): void;
}

function useCountUp(target: number, ms = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

export default function ResultScreen({ route, summary, canRetry, onRetry, onExit }: ResultScreenProps) {
  const { outcome } = summary;
  const score = useCountUp(outcome.score);
  const stars = !outcome.success ? 0 : summary.quality >= 0.85 ? 3 : summary.quality >= 0.6 ? 2 : 1;
  const title = outcome.success ? 'MISSÃO CUMPRIDA' : outcome.aborted ? 'MISSÃO ABORTADA' : 'NAVE PERDIDA';

  const rows: [IconName, string, string, string?][] = [
    ['radar', 'Lançamento', `${Math.round(outcome.launchQuality * 100)}%${outcome.perfectLaunch ? ' · PERFEITO' : ''}`],
    ['orb', 'Orbes coletados', String(outcome.orbs)],
    ['ring', 'Anéis', String(outcome.rings)],
    ['asteroid', 'Impactos', `${outcome.hits}`, outcome.hits === 0 && outcome.success ? 'text-emerald-300' : undefined],
    ['escudo', 'Casco restante', `${outcome.hullLeft}/${outcome.hullMax}`],
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex justify-center p-4 bg-black/55 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg flex flex-col items-center my-auto">
      <motion.img
        src={cutoutArt(outcome.success ? 'astronaut' : 'rocket')}
        alt=""
        draggable={false}
        initial={{ y: 30, opacity: 0, scale: 0.8 }}
        animate={outcome.success ? { y: [0, -10, 0], opacity: 1, scale: 1, rotate: [-4, 4, -4] } : { y: 0, opacity: 1, scale: 1, rotate: 14 }}
        transition={outcome.success ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.6 }}
        className={`relative z-10 -mb-8 h-28 sm:h-36 object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.6)] ${outcome.success ? '' : 'grayscale opacity-70'}`}
      />
      <motion.div
        initial={{ scale: 0.85, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
        className={`hud-panel w-full px-5 pb-5 pt-9 sm:px-7 sm:pb-6 text-center ${outcome.success ? 'ring-1 ring-emerald-400/40' : 'ring-1 ring-red-400/40'}`}
      >
        <div className="text-xs tracking-[0.3em] text-slate-400 mb-1">
          <GameIcon name={PLANET_ICON[route.destination]} size={18} className="mr-1.5" />
          {route.name.toUpperCase()}
        </div>
        <h2 className={`font-display text-2xl sm:text-4xl mb-2 ${outcome.success ? 'text-emerald-300' : 'text-red-400'}`}>{title}</h2>

        <div className="flex justify-center gap-2 mb-1 text-3xl">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.4 + i * 0.2, type: 'spring', stiffness: 300 }}
              className={i < stars ? 'drop-shadow-[0_0_12px_rgba(253,224,71,0.9)]' : 'opacity-20 grayscale'}
            >
              ⭐
            </motion.span>
          ))}
        </div>

        <div className="font-display text-5xl text-white leading-none">{score}</div>
        <div className="text-xs text-slate-400 mt-1 mb-1">
          de {route.maxScore} pts · {Math.round(summary.quality * 100)}%
        </div>
        {summary.newBest && <div className="text-xs font-bold text-amber-300 mb-2">🏆 NOVO RECORDE PESSOAL</div>}

        <div className="my-3 space-y-1 text-sm">
          {rows.map(([icon, label, value, cls]) => (
            <div key={label} className="flex justify-between px-3 py-1 rounded-lg bg-sky-400/5 border border-sky-400/10">
              <span className="flex items-center gap-2 text-slate-300"><GameIcon name={icon} size={20} className="rounded" />{label}</span>
              <span className={`font-semibold ${cls ?? 'text-white'}`}>{value}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 py-3">
            <div className="text-amber-300 font-display text-lg"><Stardust value={summary.stardustEarned} sign="+" size={20} /></div>
            <div className="text-[10px] text-slate-400">Stardust</div>
          </div>
          <div className="rounded-xl bg-fuchsia-500/10 border border-fuchsia-400/30 py-3">
            <div className="text-fuchsia-300 font-display text-lg">+{summary.xpGained}</div>
            <div className="text-[10px] text-slate-400">XP</div>
          </div>
          <div className="rounded-xl bg-violet-500/10 border border-violet-400/30 py-3">
            <div className="text-violet-300 font-display text-lg"><LunarDust value={summary.lunarDustGained} sign="+" size={20} /></div>
            <div className="text-[10px] text-slate-400">Pó Lunar</div>
          </div>
        </div>

        {summary.levelsGained > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.15, 1] }}
            transition={{ delay: 1 }}
            className="mb-5 rounded-xl bg-gradient-to-r from-fuchsia-600/40 to-amber-500/40 border border-amber-300/50 py-3 font-display text-lg text-white"
          >
            🎉 NÍVEL {summary.newLevel}!
          </motion.div>
        )}

        <div className="flex gap-3">
          <button onClick={onExit} className="btn-ghost flex-1 py-3">
            Hangar
          </button>
          <button onClick={onRetry} disabled={!canRetry} className="btn-primary flex-1 py-3 disabled:opacity-40 disabled:cursor-not-allowed">
            <span className="inline-flex items-center justify-center gap-1.5"><GameIcon name="rocket" size={22} className="-my-1 rotate-[30deg]" /> Voar de novo</span>
          </button>
        </div>
      </motion.div>
      </div>
    </motion.div>
  );
}
