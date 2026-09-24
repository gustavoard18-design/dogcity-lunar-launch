import { PlayerProfile } from '../types';
import { ROUTES } from '../lib/economy';
import { EVENTS } from '../lib/events';
import GameIcon, { IconName, PLANET_ICON, Stardust, routeIcon } from './GameIcon';

const fmt = (n: number) => n.toLocaleString('pt-BR');

/** Números de toda a carreira do piloto (contadores permanentes). */
function CareerStats({ profile }: { profile: PlayerProfile }) {
  const s = profile.stats;
  const cells: { icon: IconName; label: string; value: string }[] = [
    { icon: 'rocket', label: 'Voos', value: fmt(s.launches) },
    { icon: 'trophy', label: 'Concluídos', value: fmt(s.successes) },
    { icon: 'orb', label: 'Orbes', value: fmt(s.orbs) },
    { icon: 'ring', label: 'Anéis', value: fmt(s.rings) },
    { icon: 'medal', label: 'Perfeitos', value: fmt(s.perfects) },
    { icon: 'escudo', label: 'Sem dano', value: fmt(s.flawless) },
  ];
  const routes = [...ROUTES, ...EVENTS.map(e => e.route)].filter(r => (s.routes[r.id] ?? 0) > 0);
  return (
    <div className="panel mb-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-display text-lg text-white">Carreira do piloto</h3>
        <span className="text-[11px] text-slate-500">
          <Stardust value={fmt(s.stardustEarned)} size="1em" /> ganhos em voos · {profile.eventWins.length} {profile.eventWins.length === 1 ? 'evento vencido' : 'eventos vencidos'}
        </span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {cells.map(c => (
          <div key={c.label} className="rounded-xl bg-white/[0.04] border border-white/5 py-2 text-center">
            <GameIcon name={c.icon} size={24} className="mb-0.5" />
            <div className="text-white font-display text-sm">{c.value}</div>
            <div className="text-[10px] text-slate-400">{c.label}</div>
          </div>
        ))}
      </div>
      {routes.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {routes.map(r => (
            <span key={r.id} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] border border-white/10 pl-1 pr-2.5 py-0.5 text-[11px] text-slate-300">
              <GameIcon name={PLANET_ICON[r.destination]} size={18} />
              {r.name} <b className="text-white">×{s.routes[r.id]}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LaunchHistory({ profile }: { profile: PlayerProfile }) {
  return (
    <>
      <CareerStats profile={profile} />
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
        {profile.launches.length > 0 && <p className="text-[11px] text-slate-600 mt-3">Mostrando os últimos {profile.launches.length} voos.</p>}
      </div>
    </>
  );
}
