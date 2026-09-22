import { getLeaderboard } from '../lib/storage';
import { getTierColor, getTierBadge } from '../lib/economy';

interface WeeklyLeaderboardProps {
  playerAddress?: string;
}

export default function WeeklyLeaderboard({ playerAddress }: WeeklyLeaderboardProps) {
  const entries = getLeaderboard();
  const weeklyEntries = [...entries].sort((a, b) => b.weekScore - a.weekScore);

  return (
    <div className="bg-gray-900/80 border border-purple-500/30 rounded-2xl p-5 backdrop-blur-sm">
      <h3 className="text-lg font-bold text-white mb-4">🏆 Leaderboard Semanal</h3>
      
      <div className="space-y-2">
        {weeklyEntries.map((entry, index) => {
          const isPlayer = entry.address === playerAddress;
          
          return (
            <div
              key={entry.address}
              className={`flex items-center gap-3 p-3 rounded-xl ${
                isPlayer
                  ? 'bg-purple-900/40 border border-purple-500/50'
                  : 'bg-gray-800/30 border border-gray-700/30'
              }`}
            >
              <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                index === 1 ? 'bg-gray-400/20 text-gray-300' :
                index === 2 ? 'bg-orange-500/20 text-orange-400' :
                'bg-gray-700/50 text-gray-400'
              }`}>
                {index + 1}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-semibold">{entry.dogName}</span>
                  <span className={`text-xs ${getTierColor(entry.tier)}`}>
                    {getTierBadge(entry.tier)}
                  </span>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-yellow-400 font-bold text-sm">{entry.weekScore}</div>
                <div className="text-[10px] text-gray-500">pts/sem</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
