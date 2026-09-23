import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { LaunchOutcome, LaunchSummary, PlayerProfile, Route } from './types';
import { WalletConnection, getMockDogBalance } from './lib/wallet';
import { loadProfile, createProfile, saveProfile } from './lib/storage';
import { getRouteCost, isRouteUnlocked } from './lib/economy';
import { claimMission, ensureDailyMissions, rerollMissions } from './lib/missions';
import { applyLaunchResult, equipCosmetic, purchaseCosmetic, purchaseUpgrade } from './lib/progress';
import { COSMETICS, UPGRADES } from './lib/shop';
import { STAT_INFO } from './lib/stats';
import { cutoutArt } from './lib/evolution';
import { isMuted, setMuted, sfx } from './lib/audio';
import ConnectWallet from './components/ConnectWallet';
import PlayerProfileCard from './components/PlayerProfile';
import RouteSelector from './components/RouteSelector';
import MissionsPanel from './components/MissionsPanel';
import UpgradeShop from './components/UpgradeShop';
import CosmeticShop from './components/CosmeticShop';
import WeeklyLeaderboard from './components/WeeklyLeaderboard';
import LaunchHistory from './components/LaunchHistory';
import SpaceBackdrop from './components/SpaceBackdrop';
import GameIcon, { IconName, LunarDust, SpeakerIcon, Stardust, statIcon } from './components/GameIcon';

const LaunchGame = lazy(() => import('./game/LaunchGame'));

type Tab = 'launch' | 'missions' | 'upgrades' | 'cosmetics' | 'leaderboard' | 'history';

interface Session {
  id: number;
  route: Route;
  paidCost: number;
  summary: LaunchSummary | null;
}

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'launch', label: 'Lançar', icon: 'rocket' },
  { id: 'missions', label: 'Missões', icon: 'medal' },
  { id: 'upgrades', label: 'Oficina', icon: 'propulsores' },
  { id: 'cosmetics', label: 'Loja', icon: 'capacete' },
  { id: 'leaderboard', label: 'Ranking', icon: 'trophy' },
  { id: 'history', label: 'Diário', icon: 'acessorios' },
];


export default function App() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('launch');
  const [notification, setNotification] = useState<{ text: string; icon?: IconName; key: number } | null>(null);
  const [muted, setMutedState] = useState(isMuted());

  const notify = useCallback((text: string, icon?: IconName) => setNotification({ text, icon, key: Date.now() }), []);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 3200);
    return () => clearTimeout(timer);
  }, [notification]);

  const commit = useCallback((next: PlayerProfile) => {
    saveProfile(next);
    setProfile(next);
  }, []);

  // Renova as missões quando o dia vira com o jogo aberto.
  useEffect(() => {
    if (!profile) return;
    const timer = setInterval(() => {
      setProfile(p => {
        if (!p) return p;
        const next = ensureDailyMissions(p);
        if (next !== p) saveProfile(next);
        return next;
      });
    }, 60_000);
    return () => clearInterval(timer);
  }, [profile?.address]);

  const handleConnect = (wallet: WalletConnection) => {
    const existing = loadProfile(wallet.address);
    const next = existing
      ? { ...existing, provider: wallet.provider }
      : createProfile(wallet.address, wallet.provider, getMockDogBalance(wallet.address));
    commit(next);
    notify(existing ? `Bem-vindo de volta, ${next.dog.name}!` : `Seu piloto ${next.dog.name} está pronto!`, 'astronaut');
  };

  const startRoute = (route: Route) => {
    if (!profile || !isRouteUnlocked(route, profile.dog.level)) return;
    const cost = getRouteCost(route, profile);
    if (profile.stardust < cost) return;
    sfx.unlock();
    sfx.click();
    // O custo é debitado já na entrada: só volta se cancelar antes da decolagem.
    commit({ ...profile, stardust: profile.stardust - cost });
    setSession({ id: Date.now(), route, paidCost: cost, summary: null });
  };

  const handleCancel = () => {
    if (!profile || !session) return;
    commit({ ...profile, stardust: profile.stardust + session.paidCost });
    setSession(null);
  };

  const handleFinish = (outcome: LaunchOutcome) => {
    if (!profile || !session || session.summary) return;
    const { profile: next, summary } = applyLaunchResult(profile, session.route, outcome, session.paidCost);
    commit(next);
    setSession({ ...session, summary });
    if (summary.levelsGained > 0) {
      window.setTimeout(() => {
        sfx.levelUp();
        confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, zIndex: 100 });
      }, 1100);
    } else if (outcome.success) {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 }, zIndex: 100 });
    }
  };

  const canRetry = useMemo(() => {
    if (!profile || !session) return false;
    return profile.stardust >= getRouteCost(session.route, profile);
  }, [profile, session]);

  const handleClaimMission = (missionId: string) => {
    if (!profile) return;
    const result = claimMission(profile, missionId);
    if (!result) return;
    commit(result.profile);
    sfx.coin();
    const { reward } = result;
    notify(`+${reward.stardust} Stardust · +${reward.xp} XP${reward.lunarDust ? ` · +${reward.lunarDust} Pó Lunar` : ''}`, 'orb');
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
    if (result.levelsGained > 0) {
      sfx.levelUp();
      notify(`${result.profile.dog.name} subiu para o nível ${result.profile.dog.level}!`, 'trophy');
    }
  };

  const handleReroll = () => {
    if (!profile) return;
    const next = rerollMissions(profile);
    if (!next) return;
    commit(next);
    sfx.click();
    notify('Missões trocadas!', 'medal');
  };

  const handleUpgrade = (upgradeId: string) => {
    if (!profile) return;
    const next = purchaseUpgrade(profile, upgradeId);
    const upgrade = UPGRADES.find(u => u.id === upgradeId);
    if (!next || !upgrade) return;
    commit(next);
    sfx.coin();
    notify(`${upgrade.name} instalado! ${STAT_INFO[upgrade.stat].label} ${upgrade.level}`, statIcon(upgrade.stat));
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
  };

  const handleBuyCosmetic = (id: string) => {
    if (!profile) return;
    const bought = purchaseCosmetic(profile, id);
    if (!bought) return;
    const next = equipCosmetic(bought, id) ?? bought;
    commit(next);
    sfx.coin();
    notify(`${COSMETICS.find(c => c.id === id)?.name} desbloqueado e equipado!`, 'capacete');
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
  };

  const handleEquip = (id: string) => {
    if (!profile) return;
    const next = equipCosmetic(profile, id);
    if (!next) return;
    commit(next);
    sfx.click();
  };

  const toggleMute = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };

  if (profile && session) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <LaunchGame
          key={session.id}
          route={session.route}
          profile={profile}
          paidCost={session.paidCost}
          summary={session.summary}
          canRetry={canRetry}
          onFinish={handleFinish}
          onCancel={handleCancel}
          onExit={() => setSession(null)}
          onRetry={() => startRoute(session.route)}
        />
      </Suspense>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 z-0">
        <SpaceBackdrop />
      </div>

      <AnimatePresence>
        {notification && (
          <motion.div
            key={notification.key}
            initial={{ opacity: 0, y: 40, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 40, x: '-50%' }}
            className="fixed bottom-6 left-1/2 z-50 max-w-[90vw]"
          >
            <div className="hud-panel flex items-center gap-2.5 px-5 py-3 text-white text-sm">
              {notification.icon && <GameIcon name={notification.icon} size={26} />}
              {notification.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!profile ? (
        <ConnectWallet onConnect={handleConnect} />
      ) : (
        <>
          <header className="sticky top-0 z-20 border-b border-sky-400/15 bg-[#050d22]/70 backdrop-blur-xl shadow-[0_1px_20px_rgba(56,189,248,0.08)]">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/40 via-sky-700/30 to-blue-900/40 ring-2 ring-sky-300/50 shadow-[0_0_18px_rgba(56,189,248,0.45)] overflow-hidden">
                  <img src={`${import.meta.env.BASE_URL}dog-face.png`} alt="DOG" className="w-full h-full object-contain scale-110 translate-y-0.5" draggable={false} />
                </div>
                <h1 className="font-display text-lg bg-gradient-to-r from-sky-300 via-white to-amber-300 bg-clip-text text-transparent">DOGCITY</h1>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-sm">
                <span className="text-amber-300 font-semibold"><Stardust value={profile.stardust} /></span>
                <span className="text-violet-300 font-semibold"><LunarDust value={profile.lunarDust} /></span>
                <button onClick={toggleMute} className="btn-ghost px-2.5 py-1.5 text-xs" aria-label={muted ? 'Ativar som' : 'Silenciar'}>
                  <SpeakerIcon muted={muted} />
                </button>
                <button onClick={() => setProfile(null)} className="btn-ghost px-3 py-1.5 text-xs">
                  Sair
                </button>
              </div>
            </div>
          </header>

          <main className="relative z-10 max-w-6xl mx-auto px-4 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 order-2 lg:order-1">
                <PlayerProfileCard profile={profile} />
              </div>

              <div className="lg:col-span-2 order-1 lg:order-2">
                <nav className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-1 px-1">
                  {TABS.map(tab => {
                    const badge = tab.id === 'missions' && profile.dailyMissions.some(m => m.completed && !m.claimed);
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                          activeTab === tab.id
                            ? 'tab-active'
                            : 'bg-[#0b1733]/70 backdrop-blur text-slate-300 hover:text-white hover:bg-[#10224a]/80 border border-sky-400/15'
                        }`}
                      >
                        <GameIcon name={tab.icon} size={22} className="-my-1 mr-1.5" />
                        {tab.label}
                        {badge && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />}
                      </button>
                    );
                  })}
                </nav>

                <AnimatePresence mode="wait">
                  <motion.div key={activeTab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.2 }}>
                    {activeTab === 'launch' && <RouteSelector profile={profile} onSelectRoute={startRoute} />}
                    {activeTab === 'missions' && <MissionsPanel profile={profile} onClaimReward={handleClaimMission} onReroll={handleReroll} />}
                    {activeTab === 'upgrades' && <UpgradeShop profile={profile} onPurchase={handleUpgrade} />}
                    {activeTab === 'cosmetics' && <CosmeticShop profile={profile} onPurchase={handleBuyCosmetic} onEquip={handleEquip} />}
                    {activeTab === 'leaderboard' && <WeeklyLeaderboard playerAddress={profile.address} />}
                    {activeTab === 'history' && <LaunchHistory profile={profile} />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </main>

          <footer className="relative z-10 mt-12 py-6 text-center text-xs text-slate-600">
            Base Lunar DogCity · {profile.provider} · saldo DOG simulado, sem transações on-chain
          </footer>
        </>
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,#0c2150,#030816_70%)] text-sky-200">
      <img src={cutoutArt('astronaut')} alt="" className="h-48 object-contain animate-float drop-shadow-[0_20px_30px_rgba(56,189,248,0.35)] mb-5" draggable={false} />
      <div className="font-display text-sm tracking-[0.3em]">PREPARANDO LANÇAMENTO</div>
    </div>
  );
}
