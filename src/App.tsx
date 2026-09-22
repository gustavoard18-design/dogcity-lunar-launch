import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { PlayerProfile, Route } from './types';
import { WalletConnection, getMockDogBalance } from './lib/wallet';
import { loadProfile, createProfile, saveProfile } from './lib/storage';
import { calculateReward, calculateXpGain, getReputationGain, getXpForLevel, getWeekStart } from './lib/economy';
import { initializeDailyMissions, updateMissionProgress, claimMissionReward } from './lib/missions';
import { UPGRADES, COSMETICS } from './lib/shop';
import ConnectWallet from './components/ConnectWallet';
import PlayerProfileCard from './components/PlayerProfile';
import RouteSelector from './components/RouteSelector';
import Game3D from './components/Game3D';
import MissionsPanel from './components/MissionsPanel';
import UpgradeShop from './components/UpgradeShop';
import CosmeticShop from './components/CosmeticShop';
import WeeklyLeaderboard from './components/WeeklyLeaderboard';
import SpaceScene from './components/SpaceScene';

type Screen = 'connect' | 'game' | 'playing';
type Tab = 'launch' | 'missions' | 'upgrades' | 'cosmetics' | 'leaderboard' | 'history';

export default function App() {
  const [screen, setScreen] = useState<Screen>('connect');
  const [wallet, setWallet] = useState<WalletConnection | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [launchResult, setLaunchResult] = useState<{ score: number; success: boolean; stardustEarned: number } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('launch');
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (wallet) {
      const existing = loadProfile(wallet.address);
      if (existing) {
        setProfile(existing);
      } else {
        const dogBalance = getMockDogBalance(wallet.address);
        const newProfile = createProfile(wallet.address, dogBalance);
        setProfile(newProfile);
      }
      setScreen('game');
    }
  }, [wallet]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleConnect = (walletConn: WalletConnection) => {
    setWallet(walletConn);
  };

  const handleSelectRoute = (route: Route) => {
    if (!profile) return;
    if (profile.stardust < route.cost) return;
    setSelectedRoute(route);
    setScreen('playing');
  };

  const handleGameComplete = (score: number, success: boolean) => {
    if (!profile || !selectedRoute) return;

    const stardustEarned = calculateReward(score, selectedRoute, success);
    const xpGain = calculateXpGain(score, selectedRoute, success);
    const repGain = getReputationGain(score, success);

    const updatedProfile = { ...profile };
    updatedProfile.stardust = updatedProfile.stardust - selectedRoute.cost + stardustEarned;
    updatedProfile.totalScore += score;
    updatedProfile.bestScore = Math.max(updatedProfile.bestScore, score);
    
    updatedProfile.dog = { ...updatedProfile.dog };
    updatedProfile.dog.xp += xpGain;
    updatedProfile.dog.reputation += repGain;
    updatedProfile.dog.missions += 1;
    
    let leveledUp = false;
    while (updatedProfile.dog.xp >= updatedProfile.dog.xpToNext) {
      updatedProfile.dog.xp -= updatedProfile.dog.xpToNext;
      updatedProfile.dog.level += 1;
      updatedProfile.dog.xpToNext = getXpForLevel(updatedProfile.dog.level);
      leveledUp = true;
    }

    if (leveledUp) {
      setNotification(`🎉 ${updatedProfile.dog.name} subiu para o nível ${updatedProfile.dog.level}!`);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }

    updatedProfile.launches = [
      {
        id: `launch_${Date.now()}`,
        route: selectedRoute,
        score,
        stardustEarned,
        stardustCost: selectedRoute.cost,
        success,
        timestamp: new Date().toISOString(),
      },
      ...updatedProfile.launches,
    ].slice(0, 50);

    if (success && score > 200) {
      updatedProfile.lunarDust += Math.floor(score / 100);
    }

    const weekStart = getWeekStart();
    if (updatedProfile.currentWeekStart !== weekStart) {
      if (updatedProfile.weeklyScores.length === 0 || updatedProfile.weeklyScores[0].weekStart !== weekStart) {
        updatedProfile.weeklyScores = [
          { weekStart, bestScore: score, totalLaunches: 1, totalScore: score },
          ...updatedProfile.weeklyScores,
        ].slice(0, 12);
      }
      updatedProfile.currentWeekStart = weekStart;
    } else {
      const currentWeek = updatedProfile.weeklyScores[0];
      if (currentWeek) {
        currentWeek.bestScore = Math.max(currentWeek.bestScore, score);
        currentWeek.totalLaunches += 1;
        currentWeek.totalScore += score;
      }
    }

    updatedProfile.dailyMissions = updateMissionProgress(updatedProfile.dailyMissions, 'launches', 1);
    updatedProfile.dailyMissions = updateMissionProgress(updatedProfile.dailyMissions, 'score', score);
    if (success) {
      updatedProfile.dailyMissions = updateMissionProgress(updatedProfile.dailyMissions, 'success', 1);
    }
    updatedProfile.dailyMissions = updateMissionProgress(updatedProfile.dailyMissions, 'route', 1, selectedRoute.id);
    updatedProfile.dailyMissions = updateMissionProgress(updatedProfile.dailyMissions, 'stardust', stardustEarned);

    saveProfile(updatedProfile);
    setProfile(updatedProfile);
    setLaunchResult({ score, success, stardustEarned });
    setScreen('game');
    setSelectedRoute(null);

    if (success) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }
  };

  const handleCancelGame = () => {
    setScreen('game');
    setSelectedRoute(null);
  };

  const handleDisconnect = () => {
    setWallet(null);
    setProfile(null);
    setScreen('connect');
  };

  const handleClaimMissionReward = (missionId: string) => {
    if (!profile) return;
    
    const missionState = profile.dailyMissions.find(m => m.missionId === missionId);
    if (!missionState) return;
    
    const result = claimMissionReward(missionState, profile);
    if (!result) return;
    
    const updatedProfile = { ...result.profile };
    updatedProfile.dailyMissions = profile.dailyMissions.map(m =>
      m.missionId === missionId ? { ...m, claimed: true } : m
    );
    
    saveProfile(updatedProfile);
    setProfile(updatedProfile);
    setNotification(`🎁 Recompensa: +✨${result.reward.stardust} +${result.reward.xp}XP${result.reward.lunarDust ? ` +🌑${result.reward.lunarDust}` : ''}`);
    
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
  };

  const handleResetMissions = () => {
    if (!profile) return;
    
    const updatedProfile = { ...profile };
    updatedProfile.lastMissionReset = new Date().toISOString();
    updatedProfile.dailyMissions = initializeDailyMissions(updatedProfile);
    
    saveProfile(updatedProfile);
    setProfile(updatedProfile);
    setNotification('📋 Novas missões diárias disponíveis!');
  };

  const handlePurchaseUpgrade = (upgradeId: string) => {
    if (!profile) return;
    
    const upgrade = UPGRADES.find(u => u.id === upgradeId);
    if (!upgrade) return;
    if (profile.stardust < upgrade.cost) return;
    
    const updatedProfile = { ...profile };
    updatedProfile.stardust -= upgrade.cost;
    updatedProfile.purchasedUpgrades = [...updatedProfile.purchasedUpgrades, upgradeId];
    updatedProfile.dog = { ...updatedProfile.dog };
    updatedProfile.dog[upgrade.stat] = upgrade.level;
    
    saveProfile(updatedProfile);
    setProfile(updatedProfile);
    setNotification(`🔧 ${upgrade.name} instalado! ${upgrade.stat} → ${upgrade.level}`);
    
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
  };

  const handlePurchaseCosmetic = (cosmeticId: string) => {
    if (!profile) return;
    
    const cosmetic = COSMETICS.find(c => c.id === cosmeticId);
    if (!cosmetic) return;
    
    const canAfford = cosmetic.currency === 'stardust'
      ? profile.stardust >= cosmetic.cost
      : profile.lunarDust >= cosmetic.cost;
    
    if (!canAfford) return;
    
    const updatedProfile = { ...profile };
    if (cosmetic.currency === 'stardust') {
      updatedProfile.stardust -= cosmetic.cost;
    } else {
      updatedProfile.lunarDust -= cosmetic.cost;
    }
    updatedProfile.ownedCosmetics = [...updatedProfile.ownedCosmetics, cosmeticId];
    
    saveProfile(updatedProfile);
    setProfile(updatedProfile);
    setNotification(`🎨 ${cosmetic.name} desbloqueado!`);
    
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
  };

  const handleEquipCosmetic = (cosmeticId: string) => {
    if (!profile) return;
    
    const cosmetic = COSMETICS.find(c => c.id === cosmeticId);
    if (!cosmetic) return;
    
    const updatedProfile = { ...profile };
    updatedProfile.dog = { ...updatedProfile.dog };
    
    switch (cosmetic.type) {
      case 'skin': updatedProfile.dog.skin = cosmeticId; break;
      case 'helmet': updatedProfile.dog.helmet = cosmeticId; break;
      case 'trail': updatedProfile.dog.trail = cosmeticId; break;
    }
    
    saveProfile(updatedProfile);
    setProfile(updatedProfile);
  };

  if (screen === 'connect') {
    return <ConnectWallet onConnect={handleConnect} />;
  }

  if (screen === 'playing' && selectedRoute) {
    return (
      <div className="relative min-h-screen">
        <div className="fixed inset-0 z-0">
          <Suspense fallback={<div className="w-full h-full bg-gradient-to-b from-[#0a0a1a] to-[#1a0a2e]" />}>
            <SpaceScene />
          </Suspense>
        </div>
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center w-full max-w-4xl"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              {selectedRoute.emoji} {selectedRoute.name}
            </h2>
            <p className="text-gray-300 text-sm mb-6">
              Custo: ✨{selectedRoute.cost} | Dificuldade: {'★'.repeat(selectedRoute.difficulty)}
              {profile && ` | Stats: 🔥${profile.dog.power} 🎯${profile.dog.accuracy} 🍀${profile.dog.luck}`}
            </p>
            <Game3D
              route={selectedRoute}
              onComplete={handleGameComplete}
              onCancel={handleCancelGame}
              dogStats={profile ? { power: profile.dog.power, accuracy: profile.dog.accuracy, luck: profile.dog.luck, speed: profile.dog.speed } : undefined}
            />
          </motion.div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const tabs: { id: Tab; label: string; emoji: string }[] = [
    { id: 'launch', label: 'Lançar', emoji: '🚀' },
    { id: 'missions', label: 'Missões', emoji: '📋' },
    { id: 'upgrades', label: 'Upgrades', emoji: '🔧' },
    { id: 'cosmetics', label: 'Loja', emoji: '🎨' },
    { id: 'leaderboard', label: 'Ranking', emoji: '🏆' },
    { id: 'history', label: 'Histórico', emoji: '📜' },
  ];

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 z-0">
        <Suspense fallback={<div className="w-full h-full bg-gradient-to-b from-[#0a0a1a] to-[#1a0a2e]" />}>
          <SpaceScene />
        </Suspense>
      </div>
      
      <header className="relative z-20 border-b border-purple-500/20 bg-black/50 backdrop-blur-md sticky top-0">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <span className="text-2xl">🐕‍🦺🚀</span>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              DogCity
            </h1>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <motion.span whileHover={{ scale: 1.1 }} className="text-yellow-400 font-medium">
                ✨ {profile.stardust}
              </motion.span>
              <span className="text-gray-600">|</span>
              <motion.span whileHover={{ scale: 1.1 }} className="text-purple-400 font-medium">
                🌑 {profile.lunarDust}
              </motion.span>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDisconnect}
              className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors"
            >
              Sair
            </motion.button>
          </motion.div>
        </div>
      </header>

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-20 left-1/2 z-50"
          >
            <div className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-900/90 to-pink-900/90 border border-purple-500/50 text-white text-sm shadow-2xl shadow-purple-500/30 backdrop-blur-sm">
              {notification}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {launchResult && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-20 right-4 z-50"
          >
            <div className={`px-5 py-3 rounded-xl shadow-2xl backdrop-blur-sm ${
              launchResult.success
                ? 'bg-gradient-to-r from-green-900/90 to-emerald-900/90 border border-green-500/50'
                : 'bg-gradient-to-r from-red-900/90 to-orange-900/90 border border-red-500/50'
            }`}>
              <div className="flex items-center gap-3">
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5 }}
                  className="text-2xl"
                >
                  {launchResult.success ? '🎉' : '💥'}
                </motion.span>
                <div>
                  <p className="text-white font-bold text-sm">
                    {launchResult.success ? 'Sucesso!' : 'Falha!'}
                  </p>
                  <p className="text-xs text-gray-300">
                    Score: {launchResult.score} | +✨{launchResult.stardustEarned}
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setLaunchResult(null)}
                  className="text-gray-400 hover:text-white text-sm ml-2"
                >
                  ✕
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <PlayerProfileCard profile={profile} />
          </div>

          <div className="lg:col-span-2">
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {tabs.map((tab, index) => (
                <motion.button
                  key={tab.id}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                      : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800/80'
                  }`}
                >
                  {tab.emoji} {tab.label}
                </motion.button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {activeTab === 'launch' && (
                  <div className="bg-gray-900/80 border border-purple-500/30 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
                    <RouteSelector profile={profile} onSelectRoute={handleSelectRoute} />
                  </div>
                )}

                {activeTab === 'missions' && (
                  <MissionsPanel
                    profile={profile}
                    onClaimReward={handleClaimMissionReward}
                    onResetMissions={handleResetMissions}
                  />
                )}

                {activeTab === 'upgrades' && (
                  <UpgradeShop profile={profile} onPurchase={handlePurchaseUpgrade} />
                )}

                {activeTab === 'cosmetics' && (
                  <CosmeticShop
                    profile={profile}
                    onPurchase={handlePurchaseCosmetic}
                    onEquip={handleEquipCosmetic}
                  />
                )}

                {activeTab === 'leaderboard' && (
                  <WeeklyLeaderboard playerAddress={profile.address} />
                )}

                {activeTab === 'history' && (
                  <div className="bg-gray-900/80 border border-purple-500/30 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                      📜 Histórico de Lançamentos
                    </h3>
                    
                    {profile.launches.length === 0 ? (
                      <p className="text-gray-500 text-center py-8 text-sm">
                        Nenhum lançamento ainda. Escolha uma rota e comece! 🚀
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {profile.launches.map((launch, index) => (
                          <motion.div
                            key={launch.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ scale: 1.02 }}
                            className={`flex items-center justify-between p-3 rounded-xl ${
                              launch.success
                                ? 'bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-500/20'
                                : 'bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-500/20'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{launch.route.emoji}</span>
                              <div>
                                <p className="text-white text-sm font-medium">{launch.route.name}</p>
                                <p className="text-xs text-gray-400">
                                  {new Date(launch.timestamp).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-bold ${launch.success ? 'text-green-400' : 'text-red-400'}`}>
                                {launch.score} pts
                              </p>
                              <p className="text-xs text-yellow-400">
                                +✨{launch.stardustEarned}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-purple-500/10 mt-12 py-6 text-center">
        <p className="text-gray-600 text-xs">
          DogCity Lunar Launch — MVP Module | Pronto para integração com DogCity
        </p>
        <p className="text-gray-700 text-xs mt-1">
          Wallet mockada • Sem emissão de DOG • Bitcoin-native
        </p>
      </footer>
    </div>
  );
}
