import { getLeaderboard } from '../lib/storage';
import { getTierColor } from '../lib/economy';
import GameIcon, { TIER_INFO } from './GameIcon';

interface WeeklyLeaderboardProps {
  playerAddress?: string;
}

export default function WeeklyLeaderboard({ playerAddress }: WeeklyLeaderboardProps) {
  const entries = getLeaderboard();

  return (
    <div className="panel">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-display text-lg text-white">Ranking semanal</h3>
        <span className="text-[11px] text-slate-500">Melhor voo da semana</span>
      </div>

      <div className="space-y-2">
        {entries.map((entry, index) => {
          const isPlayer = entry.address === playerAddress;
          const medal = ['bg-yellow-400/20 text-yellow-300', 'bg-slate-300/20 text-slate-200', 'bg-orange-500/20 text-orange-300'][index];
          return (
            <div
              key={entry.address}
              className={`flex items-center gap-3 p-3 rounded-2xl ${
                isPlayer ? 'bg-sky-500/15 border border-sky-300/50' : 'bg-white/[0.03] border border-white/5'
              }`}
            >
              <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-display ${medal ?? 'bg-white/5 text-slate-400'}`}>
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-semibold truncate">{entry.dogName}</span>
                  <span className={`inline-flex items-center gap-1 text-[10px] ${getTierColor(entry.tier)}`}>
                    <GameIcon name={TIER_INFO[entry.tier].icon} size={14} />
                    {TIER_INFO[entry.tier].label}
                  </span>
                  {isPlayer && <span className="text-[10px] text-sky-300">você</span>}
                  {entry.simulated && <span className="text-[10px] text-slate-600">bot</span>}
                </div>
                <div className="text-[10px] text-slate-500">
                  {entry.totalLaunches} {entry.totalLaunches === 1 ? 'voo' : 'voos'} · recorde {entry.bestScore}
                </div>
              </div>
              <div className="text-right">
                <div className="text-amber-300 font-display">{entry.weekScore}</div>
                <div className="text-[10px] text-slate-500">pts</div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-600 mt-3">Ranking local deste navegador. Pilotos “bot” são simulados até existir um servidor.</p>
    </div>
  );
}
