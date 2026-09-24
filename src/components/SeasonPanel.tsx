import type { PlayerProfile } from '../types';
import { SEASON_TIERS, currentSeason, msUntilNextSeason, seasonName } from '../lib/seasons';
import { L } from '../lib/i18n';
import { LunarDust, Stardust } from './GameIcon';
import PilotName from './PilotName';

/** Passe da temporada do mês: pontos, os 10 níveis com recompensa e a moldura exclusiva do nível 10. */
export default function SeasonPanel({ profile }: { profile: PlayerProfile }) {
  const season = currentSeason(profile);
  const days = Math.ceil(msUntilNextSeason() / 86_400_000);
  const next = SEASON_TIERS[season.tier];
  const prevPoints = season.tier > 0 ? SEASON_TIERS[season.tier - 1].points : 0;
  const pct = next ? Math.min(100, ((season.points - prevPoints) / (next.points - prevPoints)) * 100) : 100;
  return (
    <div className="panel mb-4">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h3 className="font-display text-lg text-white">🌙 {seasonName(season.id)}</h3>
        <span className="text-[11px] text-slate-400 shrink-0">
          {L({ en: `ends in ${days}d`, pt: `termina em ${days}d`, es: `termina en ${days}d` })}
        </span>
      </div>
      <p className="text-[11px] text-slate-500 mb-3">
        {L({
          en: 'Each completed flight is worth 10 + score/10 points. Harder routes earn more. Tier 10 unlocks this month’s exclusive name frame.',
          pt: 'Cada voo concluído vale 10 + score/10 pontos. Rotas difíceis rendem mais. O nível 10 libera a moldura exclusiva do mês.',
          es: 'Cada vuelo completado vale 10 + puntuación/10 puntos. Las rutas difíciles dan más. El nivel 10 desbloquea el marco exclusivo del mes.',
        })}
      </p>

      <div className="flex items-center gap-3 mb-2">
        <div className="font-display text-2xl text-white leading-none">
          {season.tier}
          <span className="text-sm text-slate-500">/{SEASON_TIERS.length}</span>
        </div>
        <div className="flex-1">
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-amber-300 transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 text-[10px] text-slate-400">
            {season.points} {L({ en: 'pts', pt: 'pts', es: 'pts' })}
            {next && (
              <>
                {' '}· {L({ en: 'next tier at', pt: 'próximo nível em', es: 'siguiente nivel en' })} {next.points}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {SEASON_TIERS.map((t, i) => {
          const reached = i < season.tier;
          return (
            <div key={t.points} className={`rounded-xl border px-1 py-1.5 text-center ${reached ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-white/10 bg-white/[0.03]'}`}>
              <div className="text-[9px] text-slate-400">
                {L({ en: 'TIER', pt: 'NÍVEL', es: 'NIVEL' })} {i + 1} {reached && <span className="text-emerald-300">✓</span>}
              </div>
              <div className="text-[10px] text-amber-300">
                <Stardust value={t.stardust} size="1em" />
              </div>
              {t.lunarDust > 0 && (
                <div className="text-[10px] text-violet-300">
                  <LunarDust value={t.lunarDust} size="1em" />
                </div>
              )}
              {t.frame && <div className="text-[10px]">🌙</div>}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
        <span>{L({ en: 'Tier 10 frame:', pt: 'Moldura do nível 10:', es: 'Marco del nivel 10:' })}</span>
        <span className={`font-display text-sm ${profile.seasonFrames.includes(season.id) ? '' : 'opacity-60'}`}>
          <PilotName name={profile.dog.name} style={season.id} />
        </span>
      </div>
    </div>
  );
}
