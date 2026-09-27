import type { PlayerProfile } from '../types';
import { type Challenge, challengeBlock, challengeRoute } from '../lib/challenge';
import { getRouteCost } from '../lib/economy';
import { L } from '../lib/i18n';
import GameIcon, { PLANET_ICON, Stardust } from './GameIcon';

/** Desafio recebido por link: quem desafiou, a rota, o score a bater e o botão de aceitar. */
export default function ChallengeCard({ challenge, profile, onAccept, onDismiss }: { challenge: Challenge; profile: PlayerProfile; onAccept(): void; onDismiss(): void }) {
  const route = challengeRoute(challenge.routeId);
  if (!route) return null;
  const cost = getRouteCost(route, profile);
  const free = profile.stardust < cost;
  const block = challengeBlock(route, profile.dog.level);
  return (
    <div className="mb-4 rounded-2xl p-[1.5px] bg-gradient-to-r from-fuchsia-400 via-sky-400 to-amber-300">
      <div className="rounded-[15px] bg-[#0a1430]/95 p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] font-bold tracking-[0.2em] px-2 py-0.5 rounded-full text-fuchsia-200 bg-fuchsia-500/20">
            ⚔️ {L({ en: 'CHALLENGE RECEIVED', pt: 'DESAFIO RECEBIDO', es: 'DESAFÍO RECIBIDO' })}
          </span>
          <button onClick={onDismiss} className="text-xs text-slate-400 hover:text-white" aria-label={L({ en: 'Dismiss', pt: 'Dispensar', es: 'Descartar' })}>
            ✕
          </button>
        </div>
        <div className="flex items-center gap-3">
          <GameIcon name={PLANET_ICON[route.destination]} size={48} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-white">
              <b>{challenge.name}</b>{' '}
              {L({ en: 'scored', pt: 'fez', es: 'hizo' })} <b className="text-amber-300 font-display">{challenge.score}</b>{' '}
              {L({ en: 'pts on', pt: 'pts em', es: 'pts en' })} <b>{route.name}</b>.
            </p>
            <p className="text-[11px] text-slate-400">
              {L({
                en: 'Same asteroids, same orbs, same rings. Beat that score!',
                pt: 'Mesmos asteroides, mesmos orbes, mesmos anéis. Supere esse score!',
                es: 'Mismos asteroides, mismos orbes, mismos anillos. ¡Supera esa puntuación!',
              })}
            </p>
          </div>
          <button onClick={onAccept} disabled={!!block} className="btn-primary shrink-0 px-4 py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed">
            <span className="block">{L({ en: 'Accept', pt: 'Aceitar', es: 'Aceptar' })}</span>
            <span className="block text-[10px] font-normal opacity-90">
              {block ? '🔒' : free || cost === 0 ? L({ en: 'free', pt: 'grátis', es: 'gratis' }) : <Stardust value={cost} size="1em" />}
            </span>
          </button>
        </div>
        {block && (
          <p className="mt-2 text-xs text-amber-200/90">
            {block.reason === 'level'
              ? L({
                  en: `${route.name} unlocks at level ${block.level}. Keep the link: the challenge works once you get there.`,
                  pt: `${route.name} libera no nível ${block.level}. Guarde o link: o desafio vale quando você chegar lá.`,
                  es: `${route.name} se desbloquea en el nivel ${block.level}. Guarda el enlace: el desafío vale cuando llegues.`,
                })
              : L({
                  en: `This challenge is from the ${block.eventName} event, which is not running this week. Keep the link: it works again when the event comes back.`,
                  pt: `Este desafio é do evento ${block.eventName}, que não está no ar esta semana. Guarde o link: ele vale de novo quando o evento voltar.`,
                  es: `Este desafío es del evento ${block.eventName}, que no está activo esta semana. Guarda el enlace: vuelve a valer cuando regrese el evento.`,
                })}
          </p>
        )}
      </div>
    </div>
  );
}
