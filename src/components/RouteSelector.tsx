import { Route, PlayerProfile } from '../types';
import { ROUTES } from '../lib/economy';

interface RouteSelectorProps {
  profile: PlayerProfile;
  onSelectRoute: (route: Route) => void;
}

export default function RouteSelector({ profile, onSelectRoute }: RouteSelectorProps) {
  const canAfford = (route: Route) => profile.stardust >= route.cost;
  
  const isRouteUnlocked = (route: Route) => {
    switch (route.id) {
      case 'low-orbit': return true;
      case 'sea-of-tranquility': return profile.dog.level >= 2;
      case 'asteroid-belt': return profile.dog.level >= 4;
      case 'mars-colony': return profile.dog.level >= 7;
      default: return false;
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-white">🗺️ Rotas de Lançamento</h3>
      
      {ROUTES.map(route => {
        const unlocked = isRouteUnlocked(route);
        const affordable = canAfford(route);
        const disabled = !unlocked || !affordable;
        
        return (
          <button
            key={route.id}
            onClick={() => !disabled && onSelectRoute(route)}
            disabled={disabled}
            className={`w-full text-left p-4 rounded-xl border transition-all ${
              disabled
                ? 'bg-gray-800/30 border-gray-700/30 opacity-50 cursor-not-allowed'
                : 'bg-gray-800/50 border-purple-500/30 hover:border-purple-400/60 hover:bg-gray-800/80 cursor-pointer'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{route.emoji}</span>
                <div>
                  <h4 className="text-white font-semibold">{route.name}</h4>
                  <p className="text-xs text-gray-400">{route.description}</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-bold ${affordable ? 'text-yellow-400' : 'text-red-400'}`}>
                  ✨ {route.cost}
                </div>
                <div className="text-xs text-gray-500">
                  {'★'.repeat(route.difficulty)}{'☆'.repeat(4 - route.difficulty)}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
