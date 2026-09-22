import { PlayerProfile } from '../types';
import { getTierColor, getTierBadge } from '../lib/economy';

interface PlayerProfileProps {
  profile: PlayerProfile;
}

export default function PlayerProfileCard({ profile }: PlayerProfileProps) {
  const xpPercent = (profile.dog.xp / profile.dog.xpToNext) * 100;

  return (
    <div className="bg-gray-900/80 border border-purple-500/30 rounded-2xl p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {getTierBadge(profile.tier)}
            <span className={getTierColor(profile.tier)}>{profile.tier}</span>
          </h2>
          <p className="text-gray-400 text-xs font-mono mt-1">
            {profile.address.slice(0, 8)}...{profile.address.slice(-6)}
          </p>
        </div>
        <div className="text-4xl">🐕‍🦺</div>
      </div>

      <div className="bg-gray-800/50 rounded-xl p-3 mb-3">
        <h3 className="text-white font-semibold text-sm mb-2">{profile.dog.name}</h3>
        <div className="flex items-center gap-3 text-xs mb-2">
          <div><span className="text-gray-400">Lv </span><span className="text-yellow-400 font-bold">{profile.dog.level}</span></div>
          <div><span className="text-gray-400">Rep </span><span className="text-green-400 font-bold">{profile.dog.reputation}</span></div>
          <div><span className="text-gray-400">🚀 </span><span className="text-blue-400 font-bold">{profile.dog.missions}</span></div>
        </div>
        
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
            style={{ width: `${xpPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>XP: {profile.dog.xp}/{profile.dog.xpToNext}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-gray-800/50 rounded-lg p-2 text-center">
          <div className="text-yellow-400 font-bold">✨ {profile.stardust}</div>
          <div className="text-[10px] text-gray-400">Stardust</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-2 text-center">
          <div className="text-purple-400 font-bold">🌑 {profile.lunarDust}</div>
          <div className="text-[10px] text-gray-400">Pó Lunar</div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-orange-900/30 to-yellow-900/30 border border-orange-500/20 rounded-lg p-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-300 text-xs">Saldo DOG</span>
          <span className="text-orange-400 font-bold text-sm">{profile.dogBalance.toLocaleString()} DOG</span>
        </div>
      </div>
    </div>
  );
}
