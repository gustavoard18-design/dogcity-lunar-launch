import { PlayerProfile } from '../types';
import { getAvailableUpgrades } from '../lib/shop';

interface UpgradeShopProps {
  profile: PlayerProfile;
  onPurchase: (upgradeId: string) => void;
}

export default function UpgradeShop({ profile, onPurchase }: UpgradeShopProps) {
  const available = getAvailableUpgrades(
    {
      power: profile.dog.power,
      accuracy: profile.dog.accuracy,
      luck: profile.dog.luck,
      speed: profile.dog.speed,
    },
    profile.purchasedUpgrades
  );

  return (
    <div className="bg-gray-900/80 border border-purple-500/30 rounded-2xl p-5 backdrop-blur-sm">
      <h3 className="text-lg font-bold text-white mb-4">🔧 Upgrades</h3>
      
      {available.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-5xl mb-3">🎊</div>
          <p className="text-gray-400">Todos os upgrades disponíveis foram comprados!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(['power', 'accuracy', 'luck', 'speed'] as const).map(stat => {
            const statUpgrades = available.filter(u => u.stat === stat);
            if (statUpgrades.length === 0) return null;
            
            const upgrade = statUpgrades[0];
            const canAfford = profile.stardust >= upgrade.cost;
            
            return (
              <div
                key={upgrade.id}
                className="flex items-center justify-between p-4 rounded-xl bg-gray-800/50 border border-gray-700/40"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{upgrade.emoji}</span>
                  <div>
                    <h4 className="text-white text-sm font-semibold">{upgrade.name}</h4>
                    <p className="text-xs text-gray-400">Nível {upgrade.level}</p>
                  </div>
                </div>
                <button
                  onClick={() => canAfford && onPurchase(upgrade.id)}
                  disabled={!canAfford}
                  className={`px-4 py-2 rounded-xl text-sm font-bold ${
                    canAfford
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  ✨ {upgrade.cost}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
