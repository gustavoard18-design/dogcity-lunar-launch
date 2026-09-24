import { PlayerProfile } from '../types';
import { ACHIEVEMENTS } from '../lib/achievements';
import GameIcon, { LunarDust, Stardust } from './GameIcon';

interface AchievementsPanelProps {
  profile: PlayerProfile;
  onClaim: (id: string) => void;
  onSetTitle: (id: string | null) => void;
}

const fmt = (n: number) => n.toLocaleString('pt-BR');

/** Conquistas permanentes: primeiro as prontas para resgatar, depois em andamento, depois as concluídas. */
export default function AchievementsPanel({ profile, onClaim, onSetTitle }: AchievementsPanelProps) {
  const rank = (id: string) => {
    const st = profile.achievements[id];
    return st && !st.claimed ? 0 : !st ? 1 : 2;
  };
  const list = [...ACHIEVEMENTS].sort((a, b) => rank(a.id) - rank(b.id));
  const done = ACHIEVEMENTS.filter(a => profile.achievements[a.id]).length;

  return (
    <div className="panel mt-4">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h3 className="font-display text-lg text-white">Conquistas</h3>
          <p className="text-[11px] text-slate-500">Metas permanentes · cada conquista vira um título para o seu piloto</p>
        </div>
        <span className="text-sm text-slate-300">
          <b className="text-white font-display">{done}</b>/{ACHIEVEMENTS.length}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {list.map(a => {
          const st = profile.achievements[a.id];
          const value = Math.min(a.progress(profile), a.target);
          const pct = (value / a.target) * 100;
          const ready = st && !st.claimed;
          const hidden = a.secret && !st;
          const active = profile.title === a.id;
          return (
            <div
              key={a.id}
              className={`p-3 rounded-2xl border ${
                ready ? 'bg-amber-400/10 border-amber-300/50' : st ? 'bg-white/[0.02] border-white/5' : 'bg-white/[0.04] border-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                {hidden ? (
                  <span className="w-[38px] h-[38px] shrink-0 rounded-xl bg-white/5 flex items-center justify-center font-display text-slate-500">?</span>
                ) : (
                  <GameIcon name={a.icon} size={38} dim={!st} />
                )}
                <div className="min-w-0 flex-1">
                  <h4 className={`text-sm font-semibold truncate ${st ? 'text-white' : 'text-slate-300'}`}>
                    {hidden ? 'Conquista secreta' : a.title}
                    {a.secret && st && <span className="ml-1.5 text-[9px] tracking-widest text-fuchsia-300">SECRETA</span>}
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate">{hidden ? 'Continue voando para descobrir' : a.description}</p>
                </div>
              </div>
              {!st && !hidden && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {fmt(value)}/{fmt(a.target)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2 mt-2 text-xs">
                <span className="flex items-center gap-2">
                  {hidden ? (
                    <span className="text-slate-500">recompensa surpresa</span>
                  ) : (
                    <>
                      {a.reward.stardust > 0 && <span className="text-amber-300"><Stardust value={a.reward.stardust} sign="+" /></span>}
                      {a.reward.lunarDust > 0 && <span className="text-violet-300"><LunarDust value={a.reward.lunarDust} sign="+" /></span>}
                    </>
                  )}
                </span>
                {ready && (
                  <button onClick={() => onClaim(a.id)} className="btn-primary px-3 py-1 text-xs">
                    Resgatar
                  </button>
                )}
                {st?.claimed && (
                  <button
                    onClick={() => onSetTitle(active ? null : a.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                      active ? 'bg-amber-400/20 border-amber-300/60 text-amber-200' : 'border-white/10 text-slate-300 hover:text-white hover:border-sky-300/50'
                    }`}
                    title={active ? 'Remover título' : 'Mostrar como título no perfil e no ranking'}
                  >
                    {active ? '★ Título ativo' : 'Usar título'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
