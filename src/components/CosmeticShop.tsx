import { useMemo, useState } from 'react';
import { iconArt } from '../lib/evolution';
import { PlayerProfile, Cosmetic } from '../types';
import { COSMETICS, getCosmetic } from '../lib/shop';
import Showcase from './Showcase';
import CosmeticCard from './CosmeticCard';
import { EyeIcon, LunarDust, Stardust } from './GameIcon';

interface CosmeticShopProps {
  profile: PlayerProfile;
  onPurchase: (cosmeticId: string) => void;
  onEquip: (cosmeticId: string) => void;
}

const GROUPS: { type: Cosmetic['type']; label: string; target: string; icon: string }[] = [
  { type: 'skin', label: 'Pelagem', target: 'astronauta', icon: 'traje' },
  { type: 'helmet', label: 'Capacetes', target: 'astronauta e cabine', icon: 'capacete' },
  { type: 'trail', label: 'Rastros do motor', target: 'foguete', icon: 'booster' },
];

export default function CosmeticShop({ profile, onPurchase, onEquip }: CosmeticShopProps) {
  const [trying, setTrying] = useState<string | null>(null);
  const tried = trying ? getCosmetic(trying) : undefined;
  const dog = useMemo(() => (tried ? { ...profile.dog, [tried.type]: tried.id } : profile.dog), [profile.dog, tried]);

  return (
    <div className="panel">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-display text-lg text-white">Loja</h3>
        <span className="text-xs">
          <span className="inline-flex gap-3"><span className="text-amber-300"><Stardust value={profile.stardust} /></span><span className="text-violet-300"><LunarDust value={profile.lunarDust} /></span></span>
        </span>
      </div>

      <Showcase
        dog={dog}
        focus="astronaut"
        badge={tried ? <span className="inline-flex items-center gap-1"><EyeIcon /> Provando: {tried.name}</span> : <>Equipado agora</>}
        footer={
          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>Toque em um item para provar. Itens mais raros evoluem o astronauta (comum 1 · raro 2 · épico 3 · lendário 4 pts).</span>
            {tried && (
              <button onClick={() => setTrying(null)} className="btn-ghost px-2.5 py-1 text-[11px]">
                Tirar
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
