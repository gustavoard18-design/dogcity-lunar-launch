import { PlanetKind, PlayerProfile, Route } from '../types';
import { ROUTES, getRouteCost, isFreeTraining, isRouteUnlocked } from '../lib/economy';
import { cutoutArt } from '../lib/evolution';
import { getCurrentEvent, hasWonEventThisWeek, msUntilNextEvent } from '../lib/events';
import GameIcon, { Difficulty, LockIcon, LunarDust, PLANET_ICON, Stardust } from './GameIcon';
import { L } from '../lib/i18n';

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

function timeLeft(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const d = Math.floor(h / 24);
  return d > 0 ? `${d}d ${h % 24}h` : `${h}h ${Math.floor((ms % 3_600_000) / 60_000)}min`;
}

const MAX = () => L({ en: 'max', pt: 'máx', es: 'máx' });
const BEST = () => L({ en: 'best', pt: 'recorde', es: 'récord' });

/** Rota especial da semana, com o bônus e o tempo que falta. */
function EventCard({ profile, onSelectRoute }: RouteSelectorProps) {
  const event = getCurrentEvent();
  const { route } = event;
  const unlocked = isRouteUnlocked(route, profile.dog.level);
  const affordable = profile.stardust >= route.cost;
  const disabled = !unlocked || !affordable;
  const won = hasWonEventThisWeek(profile);
  const best = profile.launches.filter(l => l.route.id === route.id).reduce((m, l) => Math.max(m, l.score), 0);

  return (
    <button
      onClick={() => !disabled && onSelectRoute(route)}
      disabled={disabled}
      className={`group relative w-full text-left rounded-2xl p-[1.5px] overflow-hidden transition-all ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-0.5 cursor-pointer'}`}
      style={{ background: `linear-gradient(120deg, ${route.color}, #38bdf8 55%, ${route.color})` }}
    >
      <div className="relative rounded-[15px] bg-[#0a1430]/95 p-4 overflow-hidden">
        <div className="absolute -right-8 -top-12 w-48 h-48 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity" style={{ background: route.color }} />
        <div className="relative flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] font-bold tracking-[0.2em] px-2 py-0.5 rounded-full" style={{ color: route.color, background: `${route.color}22` }}>
            {L({ en: 'EVENT OF THE WEEK', pt: 'EVENTO DA SEMANA', es: 'EVENTO DE LA SEMANA' })}
          </span>
          <span className="text-[11px] text-slate-400">{L({ en: 'ends in', pt: 'termina em', es: 'termina en' })} {timeLeft(msUntilNextEvent())}</span>
        </div>
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <PlanetBadge kind={route.destination} locked={!unlocked} />
            <div className="min-w-0">
              <h4 className="font-display text-white text-lg leading-tight">{event.name}</h4>
              <p className="text-xs text-slate-300">{unlocked ? event.tagline : L({ en: `Unlocks at level ${route.unlockLevel}`, pt: `Desbloqueia no nível ${route.unlockLevel}`, es: `Se desbloquea en el nivel ${route.unlockLevel}` })}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                <Difficulty level={route.difficulty} /> · {route.flightSeconds}s · {MAX()} {route.maxScore}
                {(route.orbRateMult ?? 1) > 1 && <span className="text-amber-300/90"> · {L({ en: 'orbs', pt: 'orbes', es: 'orbes' })} x{route.orbRateMult}</span>}
                {best > 0 && <span className="text-amber-300/80"> · {BEST()} {best}</span>}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-sm font-bold ${affordable ? 'text-amber-300' : 'text-red-400'}`}><Stardust value={route.cost} /></div>
            <div className="text-[10px] text-slate-500">x{route.rewardMultiplier} XP</div>
          </div>
        </div>
        <div className={`relative mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-3 py-2 text-xs ${won ? 'bg-emerald-500/10 text-emerald-300' : 'bg-white/[0.04] text-slate-300'}`}>
          {won ? (
            <span className="inline-flex items-center gap-1.5"><GameIcon name="trophy" size={18} /> {L({ en: 'Bonus earned this week', pt: 'Bônus desta semana conquistado', es: 'Bono de esta semana conseguido' })}</span>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5"><GameIcon name="trophy" size={18} />{' '}
                {L({
                  en: `Bonus: finish with ${Math.round(event.minQuality * 100)}% or more`,
                  pt: `Bônus: conclua com ${Math.round(event.minQuality * 100)}% ou mais`,
                  es: `Bono: termina con ${Math.round(event.minQuality * 100)}% o más`,
                })}</span>
              <span className="text-amber-300"><Stardust value={event.bonus.stardust} sign="+" /></span>
              <span className="text-violet-300"><LunarDust value={event.bonus.lunarDust} sign="+" /></span>
            </>
          )}
        </div>
      </div>
    </button>
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
        <h3 className="font-display text-lg text-white">{L({ en: 'Launch routes', pt: 'Rotas de lançamento', es: 'Rutas de lanzamiento' })}</h3>
        <span className="text-[11px] text-slate-500 sm:mr-24">{L({ en: 'Cost charged at liftoff', pt: 'Custo debitado na decolagem', es: 'Coste cobrado al despegar' })}</span>
      </div>

      <EventCard profile={profile} onSelectRoute={onSelectRoute} />

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
                    {unlocked ? route.description : L({ en: `Unlocks at level ${route.unlockLevel}`, pt: `Desbloqueia no nível ${route.unlockLevel}`, es: `Se desbloquea en el nivel ${route.unlockLevel}` })}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    <Difficulty level={route.difficulty} /> · {route.flightSeconds}s · {MAX()} {route.maxScore}
                    {best > 0 && <span className="text-amber-300/80"> · {BEST()} {best}</span>}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                {isFreeTraining(route, profile) ? (
                  <div className="text-xs font-bold text-emerald-300">{L({ en: 'FREE', pt: 'GRÁTIS', es: 'GRATIS' })}</div>
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
        <p className="text-xs text-emerald-300/80">{L({ en: 'Out of Stardust? Low Orbit becomes free training until you recover.', pt: 'Sem Stardust? A Órbita Baixa vira treino gratuito até você se recuperar.', es: '¿Sin Stardust? La Órbita Baja se vuelve entrenamiento gratis hasta que te recuperes.' })}</p>
      )}
    </div>
  );
}
