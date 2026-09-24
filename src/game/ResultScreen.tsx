import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { LaunchSummary, Route } from '../types';
import { cutoutArt } from '../lib/evolution';
import { getAchievementDef } from '../lib/achievements';
import { GAME_URL, shareFlight } from '../lib/shareCard';
import GameIcon, { IconName, LunarDust, PLANET_ICON, Stardust, StarIcon } from '../components/GameIcon';
import { L } from '../lib/i18n';
import { track } from '../lib/analytics';
import { type Challenge, challengeOutcome, challengeUrl } from '../lib/challenge';
import { sanitizePilotName } from '../lib/storage';

interface ResultScreenProps {
  route: Route;
  summary: LaunchSummary;
  pilotName: string;
  pilotTitle?: string;
  pilotStyle?: string;
  /** Semente do voo (vai no link de desafio). */
  seed: number;
  /** Desafio aceito, para comparar os resultados. */
  challenge?: Challenge | null;
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

export default function ResultScreen({ route, summary, pilotName, pilotTitle, pilotStyle, seed, challenge, canRetry, onRetry, onExit }: ResultScreenProps) {
  const [challengeState, setChallengeState] = useState<'idle' | 'shared' | 'copied' | 'error'>('idle');
  const versus = challenge ? challengeOutcome(challenge, summary.outcome.score, summary.outcome.success) : null;
  const sendChallenge = async () => {
    const c = { routeId: route.id, seed, score: summary.outcome.score, name: sanitizePilotName(pilotName) ?? 'Pilot' };
    const url = challengeUrl(GAME_URL, c);
    const text = L({
      en: `I scored ${c.score} pts on ${route.name} in DogCity Lunar Launch. Same asteroids, same orbs: can you beat me? 🚀🐕`,
      pt: `Fiz ${c.score} pts em ${route.name} no DogCity Lunar Launch. Mesmos asteroides, mesmos orbes: consegue me superar? 🚀🐕`,
      es: `Hice ${c.score} pts en ${route.name} en DogCity Lunar Launch. Mismos asteroides, mismos orbes: ¿puedes superarme? 🚀🐕`,
    });
    track('challenge_created', { route: route.id, score: c.score });
    try {
      if (navigator.share) {
        await navigator.share({ title: 'DogCity Lunar Launch', text, url });
        setChallengeState('shared');
        return;
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setChallengeState('copied');
    } catch {
      setChallengeState('error');
    }
  };
  const [sharing, setSharing] = useState<'idle' | 'busy' | 'shared' | 'downloaded' | 'error'>('idle');
  const share = async () => {
    setSharing('busy');
    try {
      const r = await shareFlight({ route, summary, pilotName, pilotTitle, pilotStyle });
      setSharing(r === 'cancelled' ? 'idle' : r);
      if (r !== 'cancelled') track('share', { route: route.id, via: r });
    } catch {
      setSharing('error');
    }
  };
  const { outcome } = summary;
  const score = useCountUp(outcome.score);
  const stars = !outcome.success ? 0 : summary.quality >= 0.85 ? 3 : summary.quality >= 0.6 ? 2 : 1;
  const title = outcome.success
    ? L({ en: 'MISSION COMPLETE', pt: 'MISSÃO CUMPRIDA', es: 'MISIÓN CUMPLIDA' })
    : outcome.aborted
      ? L({ en: 'MISSION ABORTED', pt: 'MISSÃO ABORTADA', es: 'MISIÓN ABORTADA' })
      : L({ en: 'SHIP LOST', pt: 'NAVE PERDIDA', es: 'NAVE PERDIDA' });

  const rows: [IconName, string, string, string?][] = [
    ['radar', L({ en: 'Launch', pt: 'Lançamento', es: 'Lanzamiento' }), `${Math.round(outcome.launchQuality * 100)}%${outcome.perfectLaunch ? ` · ${L({ en: 'PERFECT', pt: 'PERFEITO', es: 'PERFECTO' })}` : ''}`],
    ['orb', L({ en: 'Orbs collected', pt: 'Orbes coletados', es: 'Orbes recogidos' }), String(outcome.orbs)],
    ['ring', L({ en: 'Rings', pt: 'Anéis', es: 'Anillos' }), String(outcome.rings)],
    ['asteroid', L({ en: 'Hits', pt: 'Impactos', es: 'Impactos' }), `${outcome.hits}`, outcome.hits === 0 && outcome.success ? 'text-emerald-300' : undefined],
    ['escudo', L({ en: 'Hull left', pt: 'Casco restante', es: 'Casco restante' }), `${outcome.hullLeft}/${outcome.hullMax}`],
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

        <div className="flex justify-center gap-2 mb-1">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.4 + i * 0.2, type: 'spring', stiffness: 300 }}
              >
              <StarIcon size={40} empty={i >= stars} />
            </motion.span>
          ))}
        </div>

        <div className="font-display text-5xl text-white leading-none">{score}</div>
        <div className="text-xs text-slate-400 mt-1 mb-1">
          {L({ en: 'of', pt: 'de', es: 'de' })} {route.maxScore} pts · {Math.round(summary.quality * 100)}%
        </div>
        {summary.newBest && <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 mb-2"><GameIcon name="trophy" size={18} /> {L({ en: 'NEW PERSONAL BEST', pt: 'NOVO RECORDE PESSOAL', es: 'NUEVO RÉCORD PERSONAL' })}</div>}

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
          <div className="rounded-xl bg-sky-500/10 border border-sky-400/30 py-3">
            <div className="text-sky-300 font-display text-lg">+{summary.xpGained}</div>
            <div className="text-[10px] text-slate-400">XP</div>
          </div>
          <div className="rounded-xl bg-violet-500/10 border border-violet-400/30 py-3">
            <div className="text-violet-300 font-display text-lg"><LunarDust value={summary.lunarDustGained} sign="+" size={20} /></div>
            <div className="text-[10px] text-slate-400">{L({ en: 'Lunar Dust', pt: 'Pó Lunar', es: 'Polvo Lunar' })}</div>
          </div>
        </div>

        {(summary.seasonPoints ?? 0) > 0 && (
          <div className="-mt-2 mb-4 text-xs text-slate-300">
            🌙 +{summary.seasonPoints} {L({ en: 'season points', pt: 'pontos de temporada', es: 'puntos de temporada' })}
            {summary.seasonTiers?.length ? (
              <b className="ml-1 text-amber-300">
                · {L({ en: 'tier', pt: 'nível', es: 'nivel' })} {summary.seasonTiers[summary.seasonTiers.length - 1]}!
              </b>
            ) : null}
          </div>
        )}

        {summary.levelsGained > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.15, 1] }}
            transition={{ delay: 1 }}
            className="mb-5 rounded-xl bg-gradient-to-r from-sky-600/40 to-amber-500/40 border border-amber-300/50 py-3 font-display text-lg text-white"
          >
            <span className="inline-flex items-center gap-2"><GameIcon name="medal" size={28} className="-my-1" /> {L({ en: 'LEVEL', pt: 'NÍVEL', es: 'NIVEL' })} {summary.newLevel}!</span>
          </motion.div>
        )}

        {summary.eventBonus && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-4 rounded-xl border py-2.5 px-3 text-sm text-white"
            style={{ borderColor: `${route.color}99`, background: `${route.color}22` }}
          >
            <div className="text-[10px] tracking-[0.2em] text-slate-300 mb-1">{L({ en: 'EVENT BONUS', pt: 'BÔNUS DO EVENTO', es: 'BONO DEL EVENTO' })}</div>
            <span className="inline-flex items-center gap-3 font-display">
              <span className="text-amber-300"><Stardust value={summary.eventBonus.stardust} sign="+" size={20} /></span>
              <span className="text-violet-300"><LunarDust value={summary.eventBonus.lunarDust} sign="+" size={20} /></span>
            </span>
          </motion.div>
        )}

        {summary.newAchievements.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }} className="mb-5 space-y-1.5">
            {summary.newAchievements.map(id => (
              <div key={id} className="flex items-center gap-2 rounded-xl bg-amber-400/10 border border-amber-300/40 px-3 py-2 text-left">
                <GameIcon name="trophy" size={24} />
                <div className="min-w-0">
                  <div className="text-[10px] tracking-widest text-amber-300">{L({ en: 'ACHIEVEMENT UNLOCKED', pt: 'CONQUISTA DESBLOQUEADA', es: 'LOGRO DESBLOQUEADO' })}</div>
                  <div className="text-sm text-white font-semibold truncate">{getAchievementDef(id)?.title}</div>
                </div>
              </div>
            ))}
            <p className="text-[11px] text-slate-400">{L({ en: 'Claim the reward in the Missions tab.', pt: 'Resgate a recompensa na aba Missões.', es: 'Reclama la recompensa en la pestaña Misiones.' })}</p>
          </motion.div>
        )}

        {challenge && versus && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className={`mb-4 rounded-xl border px-3 py-3 ${versus === 'won' ? 'border-emerald-300/60 bg-emerald-500/10' : versus === 'tied' ? 'border-sky-300/60 bg-sky-500/10' : 'border-red-300/50 bg-red-500/10'}`}
          >
            <div className="text-[10px] tracking-[0.2em] text-slate-300 mb-1">{L({ en: 'CHALLENGE', pt: 'DESAFIO', es: 'DESAFÍO' })}</div>
            <div className="flex items-center justify-center gap-3 font-display text-white">
              <span>
                {L({ en: 'You', pt: 'Você', es: 'Tú' })} <b className="text-amber-300">{summary.outcome.score}</b>
              </span>
              <span className="text-slate-500 text-xs">vs</span>
              <span>
                {challenge.name} <b className="text-amber-300">{challenge.score}</b>
              </span>
            </div>
            <div className={`mt-1 text-sm font-semibold ${versus === 'won' ? 'text-emerald-300' : versus === 'tied' ? 'text-sky-300' : 'text-red-300'}`}>
              {versus === 'won'
                ? L({ en: 'You won the challenge! 🏆', pt: 'Você venceu o desafio! 🏆', es: '¡Ganaste el desafío! 🏆' })
                : versus === 'tied'
                  ? L({ en: 'A perfect tie!', pt: 'Empate perfeito!', es: '¡Empate perfecto!' })
                  : L({ en: 'Not this time. Fly again!', pt: 'Não foi dessa vez. Voe de novo!', es: 'Esta vez no. ¡Vuela de nuevo!' })}
            </div>
          </motion.div>
        )}

        <button onClick={sendChallenge} className="btn-primary w-full py-2.5 mb-2 text-sm">
          <span className="inline-flex items-center justify-center gap-2">
            ⚔️{' '}
            {challengeState === 'copied'
              ? L({ en: 'Link copied! Paste it to a friend', pt: 'Link copiado! Cole para um amigo', es: '¡Enlace copiado! Pégalo a un amigo' })
              : challengeState === 'shared'
                ? L({ en: 'Challenge sent! Send another', pt: 'Desafio enviado! Mandar outro', es: '¡Desafío enviado! Enviar otro' })
                : challengeState === 'error'
                  ? L({ en: 'Could not share, try again', pt: 'Não deu para compartilhar, tente de novo', es: 'No se pudo compartir, inténtalo de nuevo' })
                  : versus
                    ? L({ en: 'Challenge back', pt: 'Desafiar de volta', es: 'Desafiar de vuelta' })
                    : L({ en: 'Challenge a friend', pt: 'Desafiar um amigo', es: 'Desafiar a un amigo' })}
          </span>
        </button>

        <button onClick={share} disabled={sharing === 'busy'} className="btn-ghost w-full py-2.5 mb-3 text-sm disabled:opacity-50">
          <span className="inline-flex items-center justify-center gap-2">
            <ShareIcon />
            {sharing === 'busy'
              ? L({ en: 'Creating image…', pt: 'Gerando imagem…', es: 'Generando imagen…' })
              : sharing === 'downloaded'
                ? L({ en: 'Image saved! Share again', pt: 'Imagem salva! Compartilhar de novo', es: '¡Imagen guardada! Compartir de nuevo' })
                : sharing === 'shared'
                  ? L({ en: 'Shared! One more time', pt: 'Compartilhado! Mais uma vez', es: '¡Compartido! Una vez más' })
                  : sharing === 'error'
                    ? L({ en: 'That failed, try again', pt: 'Não deu, tentar de novo', es: 'No funcionó, inténtalo de nuevo' })
                    : L({ en: 'Share result', pt: 'Compartilhar resultado', es: 'Compartir resultado' })}
          </span>
        </button>

        <div className="flex gap-3">
          <button onClick={onExit} className="btn-ghost flex-1 min-w-0 py-3 px-2 text-sm sm:text-base">
            Hangar
          </button>
          <button onClick={onRetry} disabled={!canRetry} className="btn-primary flex-1 min-w-0 py-3 px-2 text-[13px] tracking-normal sm:text-base sm:tracking-[0.05em] disabled:opacity-40 disabled:cursor-not-allowed">
            <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap"><GameIcon name="rocket" size={18} className="-my-1 shrink-0 rotate-[30deg]" /> {L({ en: 'Fly again', pt: 'Voar de novo', es: 'Volar de nuevo' })}</span>
          </button>
        </div>
      </motion.div>
      </div>
    </motion.div>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}
