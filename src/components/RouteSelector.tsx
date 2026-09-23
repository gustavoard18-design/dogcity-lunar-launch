import { PlanetKind, PlayerProfile, Route } from '../types';
import { ROUTES, getRouteCost, isFreeTraining, isRouteUnlocked } from '../lib/economy';
import { cutoutArt } from '../lib/evolution';
import GameIcon, { Difficulty, LockIcon, PLANET_ICON, Stardust } from './GameIcon';

function PlanetBadge({ kind, locked }: { kind: PlanetKind; locked: boolean }) {
  return (
    <span className="relative w-14 h-14 shrink-0">
      <GameIcon name={PLANET_ICON[kind]} size={56} dim={locked} />
      {locked && (
        <span className="absolute inset-0 flex items-center justify-center">
          <LockIcon size={22} />
        </span>
      )}
    </span>
  );
}

interface RouteSelectorProps {
  profile: PlayerProfile;
  onSelectRoute: (route: Route) => void;
}

export default function RouteSelector({ profile, onSelectRoute }: RouteSelectorProps) {
  const bestByRoute = (id: string) =>
    profile.launches.filter(l => l.route.id === id).reduce((m, l) => Math.max(m, l.score), 0);

  return (
    <div className="panel relative space-y-3">
      <img
        src={cutoutArt('rocket')}
        alt=""
        draggable={false}
        className="hidden sm:block absolute -top-12 right-4 h-28 rotate-[18deg] object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.55)] pointer-events-none animate-float"
      />
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-lg text-white">Rotas de lançamento</h3>
        <span className="text-[11px] text-slate-500 sm:mr-24">Custo debitado na decolagem</span>
      </div>

      {ROUTES.map(route => {
        const unlocked = isRouteUnlocked(route, profile.dog.level);
        const cost = getRouteCost(route, profile);
        const affordable = profile.stardust >= cost;
        const disabled = !unlocked || !affordable;
        const best = bestByRoute(route.id);

        return (
          <button
            key={route.id}
            onClick={() => !disabled && onSelectRoute(route)}
            disabled={disabled}
            className={`group relative w-full text-left p-4 rounded-2xl border overflow-hidden transition-all ${
              disabled
                ? 'bg-white/[0.02] border-white/5 opacity-50 cursor-not-allowed'
                : 'bg-white/[0.04] border-white/10 hover:border-sky-300/60 hover:bg-white/[0.07] cursor-pointer hover:-translate-y-0.5'
            }`}
          >
            <div
              className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"
              style={{ background: route.color }}
            />
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <PlanetBadge kind={route.destination} locked={!unlocked} />
                <div className="min-w-0">
                  <h4 className="text-white font-semibold">{route.name}</h4>
                  <p className="text-xs text-slate-400 truncate">
                    {unlocked ? route.description : `Desbloqueia no nível ${route.unlockLevel}`}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    <Difficulty level={route.difficulty} /> · {route.flightSeconds}s · máx {route.maxScore}
                    {best > 0 && <span className="text-amber-300/80"> · recorde {best}</span>}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                {isFreeTraining(route, profile) ? (
                  <div className="text-xs font-bold text-emerald-300">GRÁTIS</div>
                ) : (
                  <div className={`text-sm font-bold ${affordable ? 'text-amber-300' : 'text-red-400'}`}><Stardust value={route.cost} /></div>
                )}
                <div className="text-[10px] text-slate-500">x{route.rewardMultiplier} XP</div>
              </div>
            </div>
          </button>
        );
      })}
      {profile.stardust < ROUTES[0].cost && (
        <p className="text-xs text-emerald-300/80">Sem Stardust? A Órbita Baixa vira treino gratuito até você se recuperar.</p>
      )}
    </div>
  );
}
