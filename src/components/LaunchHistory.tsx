import { PlayerProfile } from '../types';
import GameIcon, { Stardust, routeIcon } from './GameIcon';

export default function LaunchHistory({ profile }: { profile: PlayerProfile }) {
  return (
    <div className="panel">
      <h3 className="font-display text-lg text-white mb-4">Diário de bordo</h3>
      {profile.launches.length === 0 ? (
        <p className="text-slate-500 text-center py-8 text-sm">Nenhum voo ainda. Escolha uma rota e decole!</p>
      ) : (
        <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
          {profile.launches.map(launch => (
            <div
              key={launch.id}
              className={`flex items-center justify-between p-3 rounded-2xl border ${
                launch.success ? 'bg-emerald-500/[0.07] border-emerald-400/20' : 'bg-red-500/[0.07] border-red-400/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <GameIcon name={routeIcon(launch.route.id)} size={40} />
                <div>
                  <p className="text-white text-sm font-medium">{launch.route.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {new Date(launch.timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    {launch.stardustCost === 0 && ' · treino'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${launch.success ? 'text-emerald-300' : 'text-red-400'}`}>{launch.score} pts</p>
                <p className={`text-xs ${launch.stardustEarned - launch.stardustCost >= 0 ? 'text-amber-300' : 'text-slate-400'}`}>
                  <Stardust value={launch.stardustEarned - launch.stardustCost} sign={launch.stardustEarned - launch.stardustCost >= 0 ? '+' : ''} size="1em" />
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
