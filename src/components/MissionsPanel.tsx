import { PlayerProfile } from '../types';
import { DAILY_MISSIONS, initializeDailyMissions } from '../lib/missions';

interface MissionsPanelProps {
  profile: PlayerProfile;
  onClaimReward: (missionId: string) => void;
  onResetMissions: () => void;
}

export default function MissionsPanel({ profile, onClaimReward, onResetMissions }: MissionsPanelProps) {
  const missions = initializeDailyMissions(profile);

  return (
    <div className="bg-gray-900/80 border border-purple-500/30 rounded-2xl p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">📋 Missões Diárias</h3>
        <button
          onClick={onResetMissions}
          className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg"
        >
          🔄 Renovar
        </button>
      </div>
      
      <div className="space-y-3">
        {missions.map(missionState => {
          const missionDef = DAILY_MISSIONS.find(m => m.id === missionState.missionId);
          if (!missionDef) return null;
          
          const progress = Math.min(missionState.progress, missionDef.target);
          const percent = (progress / missionDef.target) * 100;
          
          return (
            <div
              key={missionState.missionId}
              className={`p-4 rounded-xl border ${
                missionState.claimed
                  ? 'bg-gray-800/30 border-gray-700/30 opacity-60'
                  : missionState.completed
                  ? 'bg-green-900/20 border-green-500/40'
                  : 'bg-gray-800/50 border-gray-700/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{missionDef.emoji}</span>
                  <div>
                    <h4 className="text-white text-sm font-semibold">{missionDef.title}</h4>
                    <p className="text-xs text-gray-400">{missionDef.description}</p>
                  </div>
                </div>
                <div className="text-right text-xs text-yellow-400">
                  +✨{missionDef.reward.stardust}
                </div>
              </div>
              
              <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    missionState.completed ? 'bg-green-500' : 'bg-purple-500'
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              
              {missionState.completed && !missionState.claimed && (
                <button
                  onClick={() => onClaimReward(missionState.missionId)}
                  className="w-full text-sm bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-bold"
                >
                  ✅ Coletar Recompensa
                </button>
              )}
              
              {missionState.claimed && (
                <div className="text-xs text-gray-500 text-center">✓ Coletada</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
