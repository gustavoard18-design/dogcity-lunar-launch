import { useMemo, useState } from 'react';
import { iconArt } from '../lib/evolution';
import { PlayerProfile, Cosmetic } from '../types';
import { COSMETICS, getCosmetic } from '../lib/shop';
import Showcase from './Showcase';
import CosmeticCard from './CosmeticCard';
import { EyeIcon, LunarDust, Stardust } from './GameIcon';
import { L } from '../lib/i18n';

interface CosmeticShopProps {
  profile: PlayerProfile;
  onPurchase: (cosmeticId: string) => void;
  onEquip: (cosmeticId: string) => void;
}

const GROUPS: { type: Cosmetic['type']; label: string; target: string; icon: string }[] = [
  { type: 'skin', label: L({ en: 'Fur', pt: 'Pelagem', es: 'Pelaje' }), target: L({ en: 'astronaut', pt: 'astronauta', es: 'astronauta' }), icon: 'traje' },
  { type: 'helmet', label: L({ en: 'Helmets', pt: 'Capacetes', es: 'Cascos' }), target: L({ en: 'astronaut and cockpit', pt: 'astronauta e cabine', es: 'astronauta y cabina' }), icon: 'capacete' },
  { type: 'trail', label: L({ en: 'Engine trails', pt: 'Rastros do motor', es: 'Estelas del motor' }), target: L({ en: 'rocket', pt: 'foguete', es: 'cohete' }), icon: 'booster' },
];

export default function CosmeticShop({ profile, onPurchase, onEquip }: CosmeticShopProps) {
  const [trying, setTrying] = useState<string | null>(null);
  const tried = trying ? getCosmetic(trying) : undefined;
  const dog = useMemo(() => (tried ? { ...profile.dog, [tried.type]: tried.id } : profile.dog), [profile.dog, tried]);

  return (
    <div className="panel">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-display text-lg text-white">{L({ en: 'Shop', pt: 'Loja', es: 'Tienda' })}</h3>
        <span className="text-xs">
          <span className="inline-flex gap-3"><span className="text-amber-300"><Stardust value={profile.stardust} /></span><span className="text-violet-300"><LunarDust value={profile.lunarDust} /></span></span>
        </span>
      </div>

      <Showcase
        dog={dog}
        focus="astronaut"
        badge={tried ? <span className="inline-flex items-center gap-1"><EyeIcon /> {L({ en: 'Trying on', pt: 'Provando', es: 'Probando' })}: {tried.name}</span> : <>{L({ en: 'Equipped now', pt: 'Equipado agora', es: 'Equipado ahora' })}</>}
        footer={
          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>{L({ en: 'Tap an item to try it on. Rarer items evolve the astronaut (common 1 · rare 2 · epic 3 · legendary 4 pts).', pt: 'Toque em um item para provar. Itens mais raros evoluem o astronauta (comum 1 · raro 2 · épico 3 · lendário 4 pts).', es: 'Toca un objeto para probarlo. Los objetos más raros hacen evolucionar al astronauta (común 1 · raro 2 · épico 3 · legendario 4 pts).' })}</span>
            {tried && (
              <button onClick={() => setTrying(null)} className="btn-ghost px-2.5 py-1 text-[11px]">
                {L({ en: 'Take off', pt: 'Tirar', es: 'Quitar' })}
              </button>
            )}
          </div>
        }
      />

      {GROUPS.map(group => (
        <div key={group.type} className="mb-4 last:mb-0">
          <div className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-slate-500 mb-2">
            <img src={iconArt(group.icon)} alt="" className="w-7 h-7 rounded-md object-cover border border-white/10" draggable={false} />
            <span>
              {group.label.toUpperCase()} <span className="tracking-normal text-slate-600">· {group.target}</span>
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {COSMETICS.filter(c => c.type === group.type).map(item => (
              <CosmeticCard
                key={item.id}
                item={item}
                profile={profile}
                trying={trying === item.id}
                onTry={() => setTrying(trying === item.id ? null : item.id)}
                onPurchase={() => {
                  setTrying(null);
                  onPurchase(item.id);
                }}
                onEquip={() => {
                  setTrying(null);
                  onEquip(item.id);
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
