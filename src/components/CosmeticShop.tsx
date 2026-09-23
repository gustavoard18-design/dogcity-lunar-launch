import { useMemo, useState } from 'react';
import { RARITY_POINTS, iconArt, itemArt } from '../lib/evolution';
import { PlayerProfile, Cosmetic } from '../types';
import { COSMETICS, getCosmetic, getRarityColor, getRarityLabel, getRarityText } from '../lib/shop';
import Showcase from './Showcase';
import { LunarDust, Stardust } from './GameIcon';
import { EyeIcon } from './GameIcon';

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

/** Botão de compra na cor da raridade, como nas molduras da arte. */
const BUY_BUTTON: Record<Cosmetic['rarity'], string> = {
  common: 'bg-emerald-600/80 hover:bg-emerald-500 text-white border border-emerald-300/40',
  rare: 'bg-sky-600/80 hover:bg-sky-500 text-white border border-sky-300/40',
  epic: 'bg-purple-600/80 hover:bg-purple-500 text-white border border-fuchsia-300/40',
  legendary: 'bg-amber-600/80 hover:bg-amber-500 text-white border border-amber-200/50',
};

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
            {COSMETICS.filter(c => c.type === group.type).map(item => {
              const owned = profile.ownedCosmetics.includes(item.id);
              const equipped = profile.dog[item.type] === item.id;
              const isTrying = trying === item.id;
              const balance = item.currency === 'stardust' ? profile.stardust : profile.lunarDust;
              const canAfford = balance >= item.cost;

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setTrying(isTrying ? null : item.id)}
                  onKeyDown={e => e.key === 'Enter' && setTrying(isTrying ? null : item.id)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all hover:-translate-y-0.5 ${getRarityColor(item.rarity)} ${
                    equipped ? 'ring-2 ring-emerald-400/70' : isTrying ? 'ring-2 ring-sky-300/80' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <img
                      src={itemArt(item.id)}
                      alt={item.name}
                      draggable={false}
                      className={`w-16 h-16 sm:w-[72px] sm:h-[72px] shrink-0 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition-transform ${isTrying ? 'scale-110' : ''}`}
                    />
                    <div className="min-w-0">
                      <h5 className="text-white text-sm font-bold leading-tight">{item.name}</h5>
                      <p className={`text-[11px] font-semibold ${getRarityText(item.rarity)}`}>
                        {getRarityLabel(item.rarity)} · +{RARITY_POINTS[item.rarity]} pt
                      </p>
                      <p className="text-[10px] text-slate-400 leading-snug">{isTrying ? 'Provando…' : item.description}</p>
                    </div>
                  </div>

                  {owned ? (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setTrying(null);
                        onEquip(item.id);
                      }}
                      className={`w-full text-xs px-3 py-1.5 rounded-lg font-semibold ${
                        equipped ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' : 'bg-sky-600 hover:bg-sky-500 text-white'
                      }`}
                    >
                      {equipped ? '✓ Equipado' : 'Equipar'}
                    </button>
                  ) : (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (!canAfford) return;
                        setTrying(null);
                        onPurchase(item.id);
                      }}
                      disabled={!canAfford}
                      className={`w-full text-xs px-3 py-1.5 rounded-lg font-semibold ${
                        canAfford ? BUY_BUTTON[item.rarity] : 'bg-white/5 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {item.currency === 'stardust' ? <Stardust value={item.cost} /> : <LunarDust value={item.cost} />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
