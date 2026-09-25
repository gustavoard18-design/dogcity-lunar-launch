import { useMemo, useState } from 'react';
import { PlayerProfile, Stat } from '../types';
import { getNextUpgrade } from '../lib/shop';
import { STAT_ICON, iconArt } from '../lib/evolution';
import { MAX_STAT_LEVEL, STAT_INFO, UPGRADE_VISUALS } from '../lib/stats';
import Showcase from './Showcase';
import { EyeIcon, LockIcon, Stardust } from './GameIcon';
import { L } from '../lib/i18n';

interface UpgradeShopProps {
  profile: PlayerProfile;
  onPurchase: (upgradeId: string) => void;
}

export default function UpgradeShop({ profile, onPurchase }: UpgradeShopProps) {
  const [preview, setPreview] = useState<Stat | null>(null);
  const previewLevel = preview ? Math.min(MAX_STAT_LEVEL, profile.dog[preview] + 1) : 0;
  const dog = useMemo(() => (preview ? { ...profile.dog, [preview]: previewLevel } : profile.dog), [profile.dog, preview, previewLevel]);
  const installed = (Object.keys(UPGRADE_VISUALS) as Stat[]).flatMap(stat =>
    UPGRADE_VISUALS[stat].filter(v => profile.dog[stat] >= v.level).map(v => v.part)
  );

  return (
    <div className="panel">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-display text-lg text-white">{L({ en: 'Rocket', pt: 'Foguete', es: 'Cohete' })}</h3>
        <span className="text-xs text-amber-300"><Stardust value={profile.stardust} /></span>
      </div>

      <Showcase
        dog={dog}
        focus="rocket"
        badge={preview ? <span className="inline-flex items-center gap-1"><EyeIcon /> {L({ en: 'Preview', pt: 'Prévia', es: 'Vista previa' })}: {STAT_INFO[preview].label} {L({ en: 'lv', pt: 'nv', es: 'nv' })} {previewLevel}</span> : <>{L({ en: 'Current setup', pt: 'Configuração atual', es: 'Configuración actual' })}</>}
        footer={
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-slate-400 mr-1">{L({ en: 'Installed parts (shown on the rocket in flight):', pt: 'Peças instaladas (aparecem no foguete em voo):', es: 'Piezas instaladas (aparecen en el cohete en vuelo):' })}</span>
            {installed.length === 0 ? (
              <span className="text-slate-500">{L({ en: 'none yet — level up your stats to equip the rocket', pt: 'nenhuma ainda — suba os atributos para equipar o foguete', es: 'ninguna aún — sube los atributos para equipar el cohete' })}</span>
            ) : (
              installed.map(part => (
                <span key={part} className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                  {part}
                </span>
              ))
            )}
          </div>
        }
      />

      <div className="space-y-3">
        {(Object.keys(STAT_INFO) as Stat[]).map(stat => {
          const info = STAT_INFO[stat];
          const level = profile.dog[stat];
          const next = getNextUpgrade(profile.dog, stat);
          const canAfford = !!next && profile.stardust >= next.cost;
          const active = preview === stat;

          return (
            <div
              key={stat}
              onMouseEnter={() => next && setPreview(stat)}
              onMouseLeave={() => setPreview(p => (p === stat ? null : p))}
              onClick={() => next && setPreview(active ? null : stat)}
              className={`p-4 rounded-2xl bg-white/[0.04] border transition-colors cursor-default ${active ? 'border-sky-300/60' : 'border-white/10'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img src={iconArt(STAT_ICON[stat])} alt="" className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0" draggable={false} />
                  <div className="min-w-0">
                    <h4 className={`text-sm font-semibold ${info.color}`}>
                      {info.label} <span className="text-white">{L({ en: 'lv', pt: 'nv', es: 'nv' })} {level}</span>
                    </h4>
                    <p className="text-xs text-slate-400">{info.effect}</p>
                    {next && <p className="text-[11px] text-slate-500 mt-0.5">{L({ en: 'Next', pt: 'Próximo', es: 'Siguiente' })}: {next.name}</p>}
                  </div>
                </div>
                {next ? (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      if (canAfford) onPurchase(next.id);
                    }}
                    disabled={!canAfford}
                    className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      canAfford ? 'btn-primary' : 'bg-white/5 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Stardust value={next.cost} />
                  </button>
                ) : (
                  <span className="shrink-0 font-display text-xs text-amber-300">{L({ en: 'MAX', pt: 'MÁX', es: 'MÁX' })}</span>
                )}
              </div>
              <div className="flex gap-0.5 mt-3">
                {Array.from({ length: MAX_STAT_LEVEL }, (_, i) => (
                  <div
                    key={i}
                    className="stat-pip"
                    style={
                      i < level
                        ? { background: 'linear-gradient(90deg,#38bdf8,#f97316)' }
                        : UPGRADE_VISUALS[stat].some(v => v.level === i + 1)
                          ? { background: 'rgba(242,122,26,0.35)' }
                          : undefined
                    }
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {UPGRADE_VISUALS[stat].map(v => {
                  const on = level >= v.level;
                  return (
                    <span
                      key={v.part}
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        on ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30' : 'bg-white/5 text-slate-400 border-white/10'
                      }`}
                    >
                      {on ? '✓' : <><LockIcon size={11} className="inline -mt-0.5" /> {L({ en: 'lv', pt: 'nv', es: 'nv' })} {v.level}</>} {v.part}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
