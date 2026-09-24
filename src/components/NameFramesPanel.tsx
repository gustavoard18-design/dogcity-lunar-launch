import type { PlayerProfile } from '../types';
import { nameFramesFor } from '../lib/frames';
import { PODIUM_PRIZES } from '../lib/podium';
import PilotName from './PilotName';
import { LockIcon } from './GameIcon';
import { L } from '../lib/i18n';

interface NameFramesPanelProps {
  profile: PlayerProfile;
  onSelect: (id: string | null) => void;
}

/** Molduras de nome: prévia com o nome do piloto, como desbloquear e botão de usar. */
export default function NameFramesPanel({ profile, onSelect }: NameFramesPanelProps) {
  const frames = nameFramesFor(profile);
  const open = frames.filter(f => f.unlocked(profile)).length;
  return (
    <div className="panel mt-4">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="font-display text-lg text-white">{L({ en: 'Name frames', pt: 'Molduras de nome', es: 'Marcos de nombre' })}</h3>
        <span className="text-sm text-slate-300">
          <b className="text-white font-display">{open}</b>/{frames.length}
        </span>
      </div>
      <p className="text-[11px] text-slate-500 mb-4">
        {L({
          en: `Shown on your profile and the leaderboard. Podium frames come from the weekly event top 3 (1st: +${PODIUM_PRIZES[1].stardust} Stardust and +${PODIUM_PRIZES[1].lunarDust} Lunar Dust).`,
          pt: `Aparecem no seu perfil e no ranking. As de pódio vêm do top 3 do evento semanal (1º: +${PODIUM_PRIZES[1].stardust} Stardust e +${PODIUM_PRIZES[1].lunarDust} Pó Lunar).`,
          es: `Aparecen en tu perfil y en la clasificación. Los de podio vienen del top 3 del evento semanal (1.º: +${PODIUM_PRIZES[1].stardust} Stardust y +${PODIUM_PRIZES[1].lunarDust} Polvo Lunar).`,
        })}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {frames.map(f => {
          const unlocked = f.unlocked(profile);
          const active = profile.nameStyle === f.id;
          return (
            <button
              key={f.id}
              disabled={!unlocked}
              onClick={() => onSelect(active ? null : f.id)}
              className={`text-left p-3 rounded-2xl border transition-colors ${
                active
                  ? 'bg-amber-400/10 border-amber-300/60'
                  : unlocked
                    ? 'bg-white/[0.04] border-white/10 hover:border-sky-300/50'
                    : 'bg-white/[0.02] border-white/5 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`font-display text-sm min-w-0 ${unlocked ? '' : 'opacity-40 grayscale'}`}>
                  <PilotName name={profile.dog.name} style={f.id} />
                </span>
                {unlocked ? (
                  <span className={`text-[11px] shrink-0 ${active ? 'text-amber-200' : 'text-slate-400'}`}>{active ? L({ en: '★ In use', pt: '★ Em uso', es: '★ En uso' }) : L({ en: 'Use', pt: 'Usar', es: 'Usar' })}</span>
                ) : (
                  <LockIcon size={14} />
                )}
              </div>
              <div className="text-[11px] mt-1">
                <span className="text-slate-200">{f.name}</span>
                <span className="text-slate-500"> · {f.requirement}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
