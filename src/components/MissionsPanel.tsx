import { PlayerProfile } from '../types';
import { REROLL_COST, canReroll, getMissionDef } from '../lib/missions';
import { getDayKey } from '../lib/economy';
import GameIcon, { LunarDust, RefreshIcon, Stardust, missionIcon } from './GameIcon';

interface MissionsPanelProps {
  profile: PlayerProfile;
  onClaimReward: (missionId: string) => void;
  onReroll: () => void;
}

function timeToMidnight(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const mins = Math.ceil((next.getTime() - now.getTime()) / 60000);
  return `${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')}`;
}

export default function MissionsPanel({ profile, onClaimReward, onReroll }: MissionsPanelProps) {
  const rerollUsed = profile.missionRerollDay === getDayKey();
  const hasOpen = profile.dailyMissions.some(m => !m.claimed);

  return (
    <div className="panel">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display text-lg text-white">Missões diárias</h3>
          <p className="text-[11px] text-slate-500">Novas missões em {timeToMidnight()}</p>
        </div>
        <button
          onClick={onReroll}
          disabled={!canReroll(profile) || !hasOpen}
          className="btn-ghost text-xs px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
          title={rerollUsed ? 'Troca já usada hoje' : `Troca as missões não resgatadas por ${REROLL_COST} Stardust`}
        >
          <span className="inline-flex items-center gap-1.5"><RefreshIcon />{rerollUsed ? 'Troca usada' : <>Trocar <Stardust value={REROLL_COST} /></>}</span>
        </button>
      </div>

      <div className="space-y-3">
        {profile.dailyMissions.map(state => {
          const def = getMissionDef(state.missionId);
          if (!def) return null;
          const progress = Math.min(state.progress, def.target);
          const percent = (progress / def.target) * 100;

          return (
            <div
              key={state.missionId}
              className={`p-4 rounded-2xl border transition-colors ${
                state.claimed
                  ? 'bg-white/[0.02] border-white/5 opacity-60'
                  : state.completed
                    ? 'bg-emerald-500/10 border-emerald-400/40'
                    : 'bg-white/[0.04] border-white/10'
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <GameIcon name={missionIcon(def)} size={44} className="rounded-lg" />
                  <div className="min-w-0">
                    <h4 className="text-white text-sm font-semibold">{def.title}</h4>
                    <p className="text-xs text-slate-400">{def.description}</p>
                  </div>
                </div>
                <div className="text-right text-xs shrink-0">
                  <div className="text-amber-300"><Stardust value={def.reward.stardust} sign="+" /></div>
                  <div className="text-sky-300">+{def.reward.xp} XP</div>
                  {def.reward.lunarDust && <div className="text-violet-300"><LunarDust value={def.reward.lunarDust} sign="+" /></div>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${state.completed ? 'bg-emerald-400' : 'bg-gradient-to-r from-sky-400 to-blue-500'}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="text-[11px] text-slate-400 w-16 text-right">
                  {progress}/{def.target}
                  {def.type === 'quality' ? '%' : ''}
                </span>
              </div>

              {state.completed && !state.claimed && (
                <button onClick={() => onClaimReward(state.missionId)} className="btn-primary w-full mt-3 py-2 text-sm">
                  Resgatar recompensa
                </button>
              )}
              {state.claimed && <div className="text-xs text-slate-500 text-center mt-2">✓ Resgatada</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
