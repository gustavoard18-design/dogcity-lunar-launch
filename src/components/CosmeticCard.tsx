import type { Cosmetic, PlayerProfile } from '../types';
import { RARITY_POINTS, itemArt } from '../lib/evolution';
import { getRarityColor, getRarityLabel, getRarityText } from '../lib/shop';
import { LunarDust, Stardust } from './GameIcon';
import { L } from '../lib/i18n';

/** Botão de compra na cor da raridade, como nas molduras da arte. */
const BUY_BUTTON: Record<Cosmetic['rarity'], string> = {
  common: 'bg-emerald-600/80 hover:bg-emerald-500 text-white border border-emerald-300/40',
  rare: 'bg-sky-600/80 hover:bg-sky-500 text-white border border-sky-300/40',
  epic: 'bg-purple-600/80 hover:bg-purple-500 text-white border border-fuchsia-300/40',
  legendary: 'bg-amber-600/80 hover:bg-amber-500 text-white border border-amber-200/50',
};

interface CosmeticCardProps {
  item: Cosmetic;
  profile: PlayerProfile;
  trying: boolean;
  onTry(): void;
  onPurchase(): void;
  onEquip(): void;
}

/** Cartão de item (Loja e seção Motor da Oficina): prova ao tocar, compra ou equipa. */
export default function CosmeticCard({ item, profile, trying, onTry, onPurchase, onEquip }: CosmeticCardProps) {
  const owned = profile.ownedCosmetics.includes(item.id);
  const equipped = profile.dog[item.type] === item.id;
  const balance = item.currency === 'stardust' ? profile.stardust : profile.lunarDust;
  const canAfford = balance >= item.cost;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onTry}
      onKeyDown={e => e.key === 'Enter' && onTry()}
      className={`p-3 rounded-2xl border cursor-pointer transition-all hover:-translate-y-0.5 ${getRarityColor(item.rarity)} ${
        equipped ? 'ring-2 ring-emerald-400/70' : trying ? 'ring-2 ring-sky-300/80' : ''
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <img
          src={itemArt(item.id)}
          alt={item.name}
          draggable={false}
          className={`w-16 h-16 sm:w-[72px] sm:h-[72px] shrink-0 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition-transform ${trying ? 'scale-110' : ''}`}
        />
        <div className="min-w-0">
          <h5 className="text-white text-sm font-bold leading-tight">{item.name}</h5>
          <p className={`text-[11px] font-semibold ${getRarityText(item.rarity)}`}>
            {getRarityLabel(item.rarity)} · +{RARITY_POINTS[item.rarity]} pt
          </p>
          <p className="text-[10px] text-slate-400 leading-snug">{trying ? L({ en: 'Trying on…', pt: 'Provando…', es: 'Probando…' }) : item.description}</p>
        </div>
      </div>

      {owned ? (
        <button
          onClick={e => {
            e.stopPropagation();
            onEquip();
          }}
          className={`w-full text-xs px-3 py-1.5 rounded-lg font-semibold ${
            equipped ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' : 'bg-sky-600 hover:bg-sky-500 text-white'
          }`}
        >
          {equipped ? L({ en: '✓ Equipped', pt: '✓ Equipado', es: '✓ Equipado' }) : L({ en: 'Equip', pt: 'Equipar', es: 'Equipar' })}
        </button>
      ) : (
        <button
          onClick={e => {
            e.stopPropagation();
            if (canAfford) onPurchase();
          }}
          disabled={!canAfford}
          className={`w-full text-xs px-3 py-1.5 rounded-lg font-semibold ${canAfford ? BUY_BUTTON[item.rarity] : 'bg-white/5 text-slate-500 cursor-not-allowed'}`}
        >
          {item.currency === 'stardust' ? <Stardust value={item.cost} /> : <LunarDust value={item.cost} />}
        </button>
      )}
    </div>
  );
}
