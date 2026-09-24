import type { PlayerProfile } from '../types';
import { STREAK_FRAME_DAYS, STREAK_REWARDS } from '../lib/streak';
import { L } from '../lib/i18n';
import { LunarDust, Stardust } from './GameIcon';

/** Sequência de dias: ciclo de 7 recompensas, o dia de hoje e o caminho até a moldura dos 30 dias. */
export default function StreakPanel({ profile }: { profile: PlayerProfile }) {
  const { count, best } = profile.streak;
  const inCycle = count === 0 ? 0 : ((count - 1) % STREAK_REWARDS.length) + 1;
  const toFrame = Math.max(0, STREAK_FRAME_DAYS - best);
  return (
    <div className="panel mb-4">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div>
          <h3 className="font-display text-lg text-white">
            🔥 {L({ en: 'Daily streak', pt: 'Sequência de dias', es: 'Racha diaria' })}
          </h3>
          <p className="text-[11px] text-slate-500">
            {L({
              en: 'Come back every day: the reward grows until day 7. Missing a day starts over.',
              pt: 'Volte todo dia: a recompensa cresce até o dia 7. Perder um dia recomeça.',
              es: 'Vuelve cada día: la recompensa crece hasta el día 7. Perder un día reinicia.',
            })}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display text-2xl text-amber-300 leading-none">{count}</div>
          <div className="text-[10px] text-slate-400">
            {L({ en: 'best', pt: 'recorde', es: 'récord' })} {best}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {STREAK_REWARDS.map((r, i) => {
          const day = i + 1;
          const done = day < inCycle;
          const today = day === inCycle;
          return (
            <div
              key={day}
              className={`rounded-xl border px-1 py-2 text-center ${
                today ? 'border-amber-300/80 bg-amber-400/15' : done ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <div className={`text-[9px] tracking-wider ${today ? 'text-amber-200' : 'text-slate-400'}`}>
                {L({ en: 'DAY', pt: 'DIA', es: 'DÍA' })} {day}
              </div>
              <div className="text-[11px] text-amber-300 font-semibold mt-0.5">
                <Stardust value={r.stardust} size="1em" />
              </div>
              {r.lunarDust > 0 && (
                <div className="text-[10px] text-violet-300">
                  <LunarDust value={r.lunarDust} size="1em" />
                </div>
              )}
              {done && <div className="text-[10px] text-emerald-300">✓</div>}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        {toFrame > 0
          ? L({
              en: `${toFrame} more days in a row (best streak) unlock the 🔥 Eternal Flame name frame.`,
              pt: `Mais ${toFrame} dias seguidos (no recorde) liberam a moldura 🔥 Chama Eterna.`,
              es: `${toFrame} días seguidos más (en el récord) desbloquean el marco 🔥 Llama Eterna.`,
            })
          : L({ en: '🔥 Eternal Flame frame unlocked!', pt: 'Moldura 🔥 Chama Eterna liberada!', es: '¡Marco 🔥 Llama Eterna desbloqueado!' })}
      </p>
    </div>
  );
}
