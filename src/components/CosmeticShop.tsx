import { PlayerProfile, Cosmetic } from '../types';
import { COSMETICS, getRarityLabel } from '../lib/shop';

interface CosmeticShopProps {
  profile: PlayerProfile;
  onPurchase: (cosmeticId: string) => void;
  onEquip: (cosmeticId: string) => void;
}

export default function CosmeticShop({ profile, onPurchase, onEquip }: CosmeticShopProps) {
  const owned = profile.ownedCosmetics;

  const isEquipped = (cosmetic: Cosmetic): boolean => {
    switch (cosmetic.type) {
      case 'skin': return profile.dog.skin === cosmetic.id;
      case 'helmet': return profile.dog.helmet === cosmetic.id;
      case 'trail': return profile.dog.trail === cosmetic.id;
    }
  };

  return (
    <div className="bg-gray-900/80 border border-purple-500/30 rounded-2xl p-5 backdrop-blur-sm">
      <h3 className="text-lg font-bold text-white mb-4">🎨 Cosméticos</h3>
      
      <div className="grid grid-cols-2 gap-3">
        {COSMETICS.map(item => {
          const isOwned = owned.includes(item.id);
          const equipped = isEquipped(item);
          const canAfford = item.currency === 'stardust'
            ? profile.stardust >= item.cost
            : profile.lunarDust >= item.cost;
          
          return (
            <div
              key={item.id}
              className="p-3 rounded-xl border border-gray-700/40 bg-gray-800/50"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{item.emoji}</span>
                <div className="flex-1">
                  <h5 className="text-white text-xs font-semibold">{item.name}</h5>
                  <p className="text-[10px] text-gray-400">{getRarityLabel(item.rarity)}</p>
                </div>
              </div>
              
              {isOwned ? (
                equipped ? (
                  <span className="text-xs text-green-400">✓ Equipado</span>
                ) : (
                  <button
                    onClick={() => onEquip(item.id)}
                    className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg"
                  >
                    Equipar
                  </button>
                )
              ) : (
                <button
                  onClick={() => canAfford && onPurchase(item.id)}
                  disabled={!canAfford}
                  className={`w-full text-xs px-3 py-1 rounded-lg ${
                    canAfford
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {item.currency === 'stardust' ? '✨' : '🌑'} {item.cost}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
