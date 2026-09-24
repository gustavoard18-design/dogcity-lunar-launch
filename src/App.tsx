import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { LaunchOutcome, LaunchSummary, PlayerProfile, Route } from './types';
import { WalletConnection, getMockDogBalance } from './lib/wallet';
import { GUEST_PROVIDER, providerLabel, renamePilot } from './lib/storage';
import { getEventByRoute } from './lib/events';
import LanguageSwitcher, { takeResume } from './components/LanguageSwitcher';
import { track } from './lib/analytics';
import { type Challenge, challengeOutcome, challengeRoute, takeChallengeFromLocation } from './lib/challenge';
import { newSeed } from './lib/rng';
import { applyDailyStreak, type StreakReward } from './lib/streak';
import { SEASON_TIERS, applySeasonPoints, seasonName } from './lib/seasons';
import { DISTRICT_PRIZE, applyDistrictPrize, playerDistrict } from './lib/districts';
import ChallengeCard from './components/ChallengeCard';
import StreakPanel from './components/StreakPanel';
import SeasonPanel from './components/SeasonPanel';
import ChestShop from './components/ChestShop';
import {
  type ChestOrder,
  type ChestStatus,
  applyChestReward,
  cancelChestOrder,
  chestName,
  claimChest,
  createChestOrder,
  fetchChestStatus,
  payWithXverse,
} from './lib/chests';
import { loadProfile, createProfile, saveProfile } from './lib/storage';
import { getRouteCost, getTier, isRouteUnlocked } from './lib/economy';
import { fetchDistrictLeaderboard, fetchDogInfo, fetchEventLeaderboard, onlineEnabled, submitScore } from './lib/online';
import { claimMission, ensureDailyMissions, rerollMissions } from './lib/missions';
import { applyLaunchResult, equipCosmetic, purchaseCosmetic, purchaseUpgrade } from './lib/progress';
import { COSMETICS, UPGRADES } from './lib/shop';
import { STAT_INFO } from './lib/stats';
import { claimAchievement, getAchievementDef, hasClaimableAchievement, setTitle, titleText, unlockAchievements } from './lib/achievements';
import { cutoutArt } from './lib/evolution';
import { isMuted, setMuted, sfx } from './lib/audio';
import { isMusicEnabled, music, setMusicEnabled } from './lib/music';
import { usePwaInstall } from './lib/pwa';
import { setNameStyle, getNameFrame } from './lib/frames';
import { applyPodiumPrize, pastEventWeeks } from './lib/podium';
import type { PodiumRecord } from './types';
import ConnectWallet from './components/ConnectWallet';
import PlayerProfileCard from './components/PlayerProfile';
import RouteSelector from './components/RouteSelector';
import MissionsPanel from './components/MissionsPanel';
import AchievementsPanel from './components/AchievementsPanel';
import NameFramesPanel from './components/NameFramesPanel';
import UpgradeShop from './components/UpgradeShop';
import CosmeticShop from './components/CosmeticShop';
import WeeklyLeaderboard from './components/WeeklyLeaderboard';
import LaunchHistory from './components/LaunchHistory';
import SpaceBackdrop from './components/SpaceBackdrop';
import ErrorBoundary from './components/ErrorBoundary';
import { hasWebGL } from './lib/webgl';
import GameIcon, { IconName, LunarDust, SpeakerIcon, Stardust, statIcon } from './components/GameIcon';
import { L } from './lib/i18n';

const LaunchGame = lazy(() => import('./game/LaunchGame'));

type Tab = 'launch' | 'missions' | 'upgrades' | 'cosmetics' | 'leaderboard' | 'history';

interface Session {
  id: number;
  route: Route;
  paidCost: number;
  summary: LaunchSummary | null;
  /** Semente dos sorteios do voo (a mesma do desafio, quando há um). */
  seed: number;
  challenge: Challenge | null;
}

const LUNAR_DUST = () => L({ en: 'Lunar Dust', pt: 'Pó Lunar', es: 'Polvo Lunar' });
const MUSIC_OFF = () => L({ en: 'Turn music off', pt: 'Desligar música', es: 'Apagar música' });
const MUSIC_ON = () => L({ en: 'Turn music on', pt: 'Ligar música', es: 'Encender música' });
const ordinalEn = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'launch', label: L({ en: 'Launch', pt: 'Lançar', es: 'Lanzar' }), icon: 'rocket' },
  { id: 'missions', label: L({ en: 'Missions', pt: 'Missões', es: 'Misiones' }), icon: 'medal' },
  { id: 'upgrades', label: L({ en: 'Workshop', pt: 'Oficina', es: 'Taller' }), icon: 'propulsores' },
  { id: 'cosmetics', label: L({ en: 'Shop', pt: 'Loja', es: 'Tienda' }), icon: 'capacete' },
  { id: 'leaderboard', label: L({ en: 'Ranks', pt: 'Ranking', es: 'Ranking' }), icon: 'trophy' },
  { id: 'history', label: L({ en: 'Log', pt: 'Diário', es: 'Diario' }), icon: 'acessorios' },
];


export default function App() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('launch');
  const [notification, setNotification] = useState<{ text: string; icon?: IconName; key: number } | null>(null);
  const [muted, setMutedState] = useState(isMuted());
  const [musicOn, setMusicOn] = useState(isMusicEnabled());
  const [iosHelp, setIosHelp] = useState(false);
  const pwa = usePwaInstall();
  const [podiumWin, setPodiumWin] = useState<PodiumRecord[] | null>(null);

  // Pódio do evento: ao entrar, confere as últimas semanas e entrega o prêmio uma vez.
  useEffect(() => {
    if (!profile || !onlineEnabled) return;
    const address = profile.address;
    let alive = true;
    (async () => {
      const found: { week: ReturnType<typeof pastEventWeeks>[number]; place: number }[] = [];
      for (const week of pastEventWeeks()) {
        if (profile.podiums.some(p => p.weekStart === week.weekStart)) continue;
        try {
          const top = await fetchEventLeaderboard(week.event.route.id, 3, week.weeksAgo);
          const i = top.findIndex(e => e.address === address);
          if (i >= 0) found.push({ week, place: i + 1 });
        } catch {
          return; // servidor fora do ar ou sem a migração: tenta na próxima entrada
        }
      }
      if (!alive || found.length === 0) return;
      setProfile(p => {
        if (!p || p.address !== address) return p;
        let next = p;
        const won: PodiumRecord[] = [];
        for (const f of found) {
          const r = applyPodiumPrize(next, f.week, f.place);
          if (r) {
            next = r.profile;
            won.push(r.record);
          }
        }
        if (won.length === 0) return p;
        const checked = unlockAchievements(next).profile;
        saveProfile(checked);
        setPodiumWin(won);
        return checked;
      });
    })();
    return () => {
      alive = false;
    };
  }, [profile?.address]);

  // Guerra de distritos: se o distrito do piloto venceu a semana passada, paga o prêmio uma vez.
  const district = profile ? playerDistrict(profile) : null;
  useEffect(() => {
    if (!profile || !district || !onlineEnabled) return;
    const lastWeek = pastEventWeeks(new Date(), 1)[0].weekStart;
    if (profile.districtWins.includes(lastWeek)) return;
    let alive = true;
    fetchDistrictLeaderboard(1, 1)
      .then(top => {
        if (!alive || !top[0]) return;
        const next = applyDistrictPrize(profile, lastWeek, top[0].district);
        if (!next) return;
        commit(next);
        sfx.levelUp();
        notify(
          `🏙️ ${L({
            en: `${district} won the district war! +${DISTRICT_PRIZE.stardust} Stardust · +${DISTRICT_PRIZE.lunarDust} Lunar Dust`,
            pt: `${district} venceu a guerra de distritos! +${DISTRICT_PRIZE.stardust} Stardust · +${DISTRICT_PRIZE.lunarDust} Pó Lunar`,
            es: `¡${district} ganó la guerra de distritos! +${DISTRICT_PRIZE.stardust} Stardust · +${DISTRICT_PRIZE.lunarDust} Polvo Lunar`,
          })}`,
          'trophy'
        );
      })
      .catch(() => {}); // servidor fora do ar ou sem a migração: tenta na próxima entrada
    return () => {
      alive = false;
    };
  }, [profile?.address, district]);

  // Fora da missão toca o ambiente do hangar (a missão troca o clima sozinha).
  useEffect(() => {
    if (!session) music.play('hangar');
  }, [session]);

  const notify = useCallback((text: string, icon?: IconName) => setNotification({ text, icon, key: Date.now() }), []);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 3200);
    return () => clearTimeout(timer);
  }, [notification]);

  // Toda mudança de perfil passa aqui: compras e level ups também podem desbloquear conquistas.
  const commit = useCallback(
    (next: PlayerProfile) => {
      const { profile: checked, unlocked } = unlockAchievements(next);
      saveProfile(checked);
      setProfile(checked);
      if (unlocked.length) window.setTimeout(() => notify(`${L({ en: 'Achievement unlocked', pt: 'Conquista desbloqueada', es: 'Logro desbloqueado' })}: ${unlocked.map(a => a.title).join(', ')}`, 'trophy'), 1600);
    },
    [notify]
  );

  // Renova as missões quando o dia vira com o jogo aberto.
  useEffect(() => {
    if (!profile) return;
    const timer = setInterval(() => {
      setProfile(p => {
        if (!p) return p;
        const renewed = ensureDailyMissions(p);
        // O dia virou com o jogo aberto: conta a sequência também.
        const streak = applyDailyStreak(renewed);
        const next = streak?.profile ?? renewed;
        if (streak) streakNotice(streak.day, streak.reward);
        if (next !== p) saveProfile(next);
        return next;
      });
    }, 60_000);
    return () => clearInterval(timer);
  }, [profile?.address]);

  const streakNotice = useCallback(
    (day: number, reward: StreakReward) => {
      track('streak_claim', { day });
      window.setTimeout(
        () =>
          notify(
            `🔥 ${L({ en: `Day ${day} streak`, pt: `Sequência de ${day} ${day === 1 ? 'dia' : 'dias'}`, es: `Racha de ${day} ${day === 1 ? 'día' : 'días'}` })}: +${reward.stardust} Stardust${
              reward.lunarDust ? ` · +${reward.lunarDust} ${LUNAR_DUST()}` : ''
            }`,
            'orb'
          ),
        3600
      );
    },
    [notify]
  );

  // ── Baús pagos com DOG ──────────────────────────────────────────────────────
  const [chestStatus, setChestStatus] = useState<ChestStatus | null>(null);
  const [chestBusy, setChestBusy] = useState(false);
  const [chestReveal, setChestReveal] = useState<{ chestId: string; stardust: number; lunarDust: number } | null>(null);
  const realWallet = !!profile && profile.provider !== GUEST_PROVIDER;

  const refreshChests = useCallback(async (address: string) => {
    const st = await fetchChestStatus(address);
    if (st) setChestStatus(st);
    return st;
  }, []);

  /** Credita um pedido pago (uma vez só) e mostra o baú abrindo. */
  const creditChest = useCallback(
    (order: ChestOrder) => {
      if (!order.reward) return;
      setProfile(p => {
        if (!p) return p;
        const next = applyChestReward(p, order.id, order.reward!);
        if (!next) return p;
        saveProfile(next);
        track('chest_open', { chest: order.chest_id, stardust: order.reward!.stardust, lunarDust: order.reward!.lunarDust });
        window.setTimeout(() => {
          setChestReveal({ chestId: order.chest_id, stardust: order.reward!.stardust, lunarDust: order.reward!.lunarDust });
          sfx.levelUp();
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 }, zIndex: 100 });
        }, 0);
        return next;
      });
    },
    []
  );

  const checkPendingChest = useCallback(async () => {
    const pending = profile?.chestPending;
    if (!profile || !pending?.txid) return;
    const r = await claimChest(pending.orderId, pending.txid);
    if (r.kind === 'paid') {
      creditChest(r.order);
      void refreshChests(profile.address);
    } else if (r.kind === 'rejected') {
      // Pagamento não confere: libera o txid para o jogador tentar outro.
      commit({ ...profile, chestPending: { ...pending, txid: null } });
      notify(`${L({ en: 'Payment not accepted', pt: 'Pagamento não aceito', es: 'Pago no aceptado' })}: ${r.reason}`, 'escudo');
    }
  }, [profile, creditChest, refreshChests, commit, notify]);

  // Ao entrar com carteira real: limites, pedidos pagos ainda não creditados (outro aparelho) e o pendente.
  useEffect(() => {
    if (!profile || !realWallet || !onlineEnabled) return;
    let alive = true;
    refreshChests(profile.address).then(st => {
      if (!alive || !st) return;
      for (const o of st.orders) if (o.status === 'paid' && o.reward) creditChest(o);
    });
    return () => {
      alive = false;
    };
  }, [profile?.address, realWallet]);

  // Pagamento enviado: confere a cada minuto até o baú abrir.
  useEffect(() => {
    if (!profile?.chestPending?.txid) return;
    void checkPendingChest();
    const timer = setInterval(() => void checkPendingChest(), 60_000);
    return () => clearInterval(timer);
  }, [profile?.chestPending?.txid]);

  const orderChest = async (chestId: string) => {
    if (!profile || chestBusy) return;
    setChestBusy(true);
    const r = await createChestOrder(profile.address, chestId);
    setChestBusy(false);
    if (r.kind === 'ok' || r.kind === 'open') {
      const o = r.order;
      commit({ ...profile, chestPending: { orderId: o.id, chestId: o.chest_id, priceDog: Number(o.price_dog), txid: o.txid, createdAt: o.created_at } });
      if (r.kind === 'open') notify(L({ en: 'You already have an open chest order.', pt: 'Você já tem um pedido de baú aberto.', es: 'Ya tienes un pedido de cofre abierto.' }), 'medal');
    } else if (r.kind === 'limit') {
      notify(L({ en: 'Chest limit reached for now.', pt: 'Limite de baús atingido por enquanto.', es: 'Límite de cofres alcanzado por ahora.' }), 'medal');
    } else {
      notify(L({ en: 'Could not reach the chest shop. Try again soon.', pt: 'Não deu para falar com a loja de baús. Tente de novo em instantes.', es: 'No se pudo contactar la tienda de cofres. Inténtalo en un momento.' }), 'escudo');
    }
    void refreshChests(profile.address);
  };

  const submitChestTxid = (txid: string) => {
    if (!profile?.chestPending) return;
    commit({ ...profile, chestPending: { ...profile.chestPending, txid } });
  };

  const payChestXverse = async () => {
    if (!profile?.chestPending || chestBusy) return;
    setChestBusy(true);
    try {
      const txid = await payWithXverse(profile.chestPending.priceDog);
      if (txid) submitChestTxid(txid);
    } catch {
      notify(L({ en: 'The wallet did not send the payment.', pt: 'A carteira não enviou o pagamento.', es: 'La billetera no envió el pago.' }), 'escudo');
    } finally {
      setChestBusy(false);
    }
  };

  const cancelChest = async () => {
    if (!profile?.chestPending || chestBusy) return;
    setChestBusy(true);
    await cancelChestOrder(profile.chestPending.orderId);
    setChestBusy(false);
    commit({ ...profile, chestPending: undefined });
    void refreshChests(profile.address);
  };

  const handleConnect = (wallet: WalletConnection) => {
    const existing = loadProfile(wallet.address);
    const base = existing
      ? { ...existing, provider: wallet.provider }
      : createProfile(wallet.address, wallet.provider, getMockDogBalance(wallet.address));
    // Primeira entrada do dia: conta a sequência e paga a recompensa.
    const streak = applyDailyStreak(base);
    const next = streak?.profile ?? base;
    commit(next);
    if (streak) streakNotice(streak.day, streak.reward);
    track('wallet_connect', { wallet: wallet.provider === GUEST_PROVIDER ? 'guest' : wallet.provider });
    notify(
      existing
        ? L({ en: `Welcome back, ${next.dog.name}!`, pt: `Bem-vindo de volta, ${next.dog.name}!`, es: `¡Bienvenido de nuevo, ${next.dog.name}!` })
        : L({ en: `Your pilot ${next.dog.name} is ready!`, pt: `Seu piloto ${next.dog.name} está pronto!`, es: `¡Tu piloto ${next.dog.name} está listo!` }),
      'astronaut'
    );
    // Carteira real: busca saldo DOG on-chain, ranking e lote no DogCity; recalcula a patente.
    if (wallet.provider !== GUEST_PROVIDER) {
      fetchDogInfo(wallet.address).then(info => {
        if (!info) return;
        setProfile(p => {
          if (!p || p.address !== wallet.address) return p;
          const updated = { ...p, dogBalance: Math.floor(info.balance), dogBalanceSource: 'real' as const, dogOnchain: info, tier: getTier(info.balance) };
          saveProfile(updated);
          return updated;
        });
      });
    }
  };

  // Desafio recebido por link (?c=…): fica esperando o jogador aceitar no hangar.
  const [pendingChallenge, setPendingChallenge] = useState<Challenge | null>(() => takeChallengeFromLocation());
  useEffect(() => {
    if (pendingChallenge) track('challenge_opened', { route: pendingChallenge.routeId });
  }, []);

  useEffect(() => {
    track('app_open', { installed: window.matchMedia?.('(display-mode: standalone)').matches ?? false });
  }, []);

  // Depois de trocar o idioma (a página recarrega), reabre o hangar no mesmo piloto.
  useEffect(() => {
    const resume = takeResume();
    if (resume) handleConnect({ address: resume.address, provider: resume.provider, connected: true });
  }, []);

  const startRoute = (route: Route, challenge: Challenge | null = null) => {
    // Desafio vale em qualquer rota, mesmo ainda bloqueada, e sai de graça para quem não pode pagar.
    if (!profile || (!challenge && !isRouteUnlocked(route, profile.dog.level))) return;
    const fullCost = getRouteCost(route, profile);
    const cost = challenge && profile.stardust < fullCost ? 0 : fullCost;
    if (profile.stardust < cost) return;
    if (!hasWebGL()) {
      notify(L({ en: 'This browser cannot render 3D (WebGL is off). Try Chrome or turn on hardware acceleration.', pt: 'Este navegador não consegue desenhar o 3D (WebGL desligado). Tente o Chrome ou ative a aceleração de hardware.', es: 'Este navegador no puede mostrar el 3D (WebGL desactivado). Prueba Chrome o activa la aceleración por hardware.' }), 'rocket');
      return;
    }
    sfx.unlock();
    sfx.click();
    if (profile.stats.launches === 0) track('first_flight', { route: route.id });
    track('flight_start', { route: route.id, level: profile.dog.level });
    // O custo é debitado já na entrada: só volta se cancelar antes da decolagem.
    commit({ ...profile, stardust: profile.stardust - cost });
    setSession({ id: Date.now(), route, paidCost: cost, summary: null, seed: challenge?.seed ?? newSeed(), challenge });
  };

  const acceptChallenge = () => {
    if (!pendingChallenge) return;
    const route = challengeRoute(pendingChallenge.routeId);
    if (!route) return;
    track('challenge_accepted', { route: route.id });
    startRoute(route, pendingChallenge);
    setPendingChallenge(null);
  };

  const handleCancel = () => {
    if (!profile || !session) return;
    commit({ ...profile, stardust: profile.stardust + session.paidCost });
    setSession(null);
  };

  const handleFinish = (outcome: LaunchOutcome) => {
    if (!profile || !session || session.summary) return;
    const result = applyLaunchResult(profile, session.route, outcome, session.paidCost);
    // Temporada do mês: pontos do voo e níveis do passe (pagos na hora).
    const season = applySeasonPoints(result.profile, outcome.score, outcome.success);
    const next = season.profile;
    const summary = { ...result.summary, seasonPoints: season.points, seasonTiers: season.tiers };
    for (const tier of season.tiers) track('season_tier', { tier });
    if (season.tiers.length) {
      const last = SEASON_TIERS[season.tiers[season.tiers.length - 1] - 1];
      window.setTimeout(
        () =>
          notify(
            season.frame
              ? L({
                  en: `Season pass complete! «${seasonName(season.frame)}» frame unlocked`,
                  pt: `Passe da temporada completo! Moldura «${seasonName(season.frame)}» liberada`,
                  es: `¡Pase de temporada completo! Marco «${seasonName(season.frame)}» desbloqueado`,
                })
              : `${L({ en: 'Season tier', pt: 'Nível da temporada', es: 'Nivel de temporada' })} ${season.tiers[season.tiers.length - 1]}: +${last.stardust} Stardust${last.lunarDust ? ` · +${last.lunarDust} ${LUNAR_DUST()}` : ''}`,
            'medal'
          ),
        2400
      );
    }
    if (session.challenge) track('challenge_result', { route: session.route.id, result: challengeOutcome(session.challenge, outcome.score, outcome.success) });
    track(outcome.success ? 'flight_complete' : outcome.aborted ? 'flight_aborted' : 'flight_lost', {
      route: session.route.id,
      score: outcome.score,
      quality: Math.round((outcome.score / session.route.maxScore) * 100),
      hits: outcome.hits,
    });
    commit(next);
    if (outcome.success) {
      void submitScore({ address: next.address, dogName: next.dog.name, tier: next.tier, routeId: session.route.id, score: outcome.score, title: next.title, style: next.nameStyle });
    }
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
    notify(`+${reward.stardust} Stardust · +${reward.xp} XP${reward.lunarDust ? ` · +${reward.lunarDust} ${LUNAR_DUST()}` : ''}`, 'orb');
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
    if (result.levelsGained > 0) {
      sfx.levelUp();
      notify(
        L({
          en: `${result.profile.dog.name} reached level ${result.profile.dog.level}!`,
          pt: `${result.profile.dog.name} subiu para o nível ${result.profile.dog.level}!`,
          es: `¡${result.profile.dog.name} subió al nivel ${result.profile.dog.level}!`,
        }),
        'trophy'
      );
    }
  };

  const handleClaimAchievement = (id: string) => {
    if (!profile) return;
    const result = claimAchievement(profile, id);
    if (!result) return;
    commit(result.profile);
    sfx.coin();
    const { reward } = result;
    notify(`${getAchievementDef(id)?.title}: +${reward.stardust} Stardust${reward.lunarDust ? ` · +${reward.lunarDust} ${LUNAR_DUST()}` : ''}`, 'trophy');
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
  };

  const handleSetNameStyle = (id: string | null) => {
    if (!profile) return;
    const next = setNameStyle(profile, id);
    if (!next) return;
    commit(next);
    sfx.click();
    notify(
      id
        ? L({ en: `«${getNameFrame(id)?.name}» frame on your name`, pt: `Moldura «${getNameFrame(id)?.name}» no seu nome`, es: `Marco «${getNameFrame(id)?.name}» en tu nombre` })
        : L({ en: 'Frame removed', pt: 'Moldura removida', es: 'Marco quitado' }),
      'medal'
    );
  };

  const handleSetTitle = (id: string | null) => {
    if (!profile) return;
    const next = setTitle(profile, id);
    if (!next) return;
    commit(next);
    sfx.click();
    notify(
      id
        ? L({ en: `New title: «${titleText(id)}»`, pt: `Novo título: «${titleText(id)}»`, es: `Nuevo título: «${titleText(id)}»` })
        : L({ en: 'Title removed', pt: 'Título removido', es: 'Título quitado' }),
      'medal'
    );
  };

  const handleRename = (name: string) => {
    if (!profile) return;
    const next = renamePilot(profile, name);
    if (!next) return;
    commit(next);
    sfx.click();
    notify(
      L({
        en: `Your astronaut is now ${next.dog.name}! The leaderboard updates on your next completed flight.`,
        pt: `Seu astronauta agora se chama ${next.dog.name}! O ranking atualiza no próximo voo concluído.`,
        es: `¡Tu astronauta ahora se llama ${next.dog.name}! La clasificación se actualiza en tu próximo vuelo completado.`,
      }),
      'astronaut'
    );
  };

  const handleReroll = () => {
    if (!profile) return;
    const next = rerollMissions(profile);
    if (!next) return;
    commit(next);
    sfx.click();
    notify(L({ en: 'Missions swapped!', pt: 'Missões trocadas!', es: '¡Misiones cambiadas!' }), 'medal');
  };

  const handleUpgrade = (upgradeId: string) => {
    if (!profile) return;
    const next = purchaseUpgrade(profile, upgradeId);
    const upgrade = UPGRADES.find(u => u.id === upgradeId);
    if (!next || !upgrade) return;
    commit(next);
    sfx.coin();
    notify(`${upgrade.name} ${L({ en: 'installed!', pt: 'instalado!', es: '¡instalado!' })} ${STAT_INFO[upgrade.stat].label} ${upgrade.level}`, statIcon(upgrade.stat));
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
  };

  const handleBuyCosmetic = (id: string) => {
    if (!profile) return;
    const bought = purchaseCosmetic(profile, id);
    if (!bought) return;
    const next = equipCosmetic(bought, id) ?? bought;
    commit(next);
    sfx.coin();
    const item = COSMETICS.find(c => c.id === id);
    notify(`${item?.name} ${L({ en: 'unlocked and equipped!', pt: 'desbloqueado e equipado!', es: '¡desbloqueado y equipado!' })}`, item?.type === 'trail' ? 'booster' : item?.type === 'skin' ? 'astronaut' : 'capacete');
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
  };

  const handleEquip = (id: string) => {
    if (!profile) return;
    const next = equipCosmetic(profile, id);
    if (!next) return;
    commit(next);
    sfx.click();
  };

  const toggleMusic = () => {
    setMusicEnabled(!musicOn);
    setMusicOn(!musicOn);
  };

  const handleInstall = async () => {
    if (pwa.canPrompt) {
      const ok = await pwa.install();
      if (ok) notify(L({ en: 'DogCity installed! Open it from the icon on your home screen.', pt: 'DogCity instalado! Abra pelo ícone na tela inicial.', es: '¡DogCity instalado! Ábrelo desde el icono en la pantalla de inicio.' }), 'rocket');
    } else if (pwa.showIosHelp) setIosHelp(v => !v);
  };

  const toggleMute = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };

  if (profile && session) {
    return (
      <ErrorBoundary
        fallback={() => (
          <SceneCrash
            refund={session.summary ? 0 : session.paidCost}
            onBack={() => {
              // Quebrou antes do resultado: devolve o custo da missão.
              if (!session.summary) commit({ ...profile, stardust: profile.stardust + session.paidCost });
              setSession(null);
            }}
          />
        )}
      >
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
          onRetry={() => startRoute(session.route, session.challenge)}
          seed={session.seed}
          challenge={session.challenge}
        />
      </Suspense>
      </ErrorBoundary>
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

      <AnimatePresence>
        {podiumWin && (
          <motion.div
            key="podium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onAnimationComplete={() => {
              sfx.levelUp();
              confetti({ particleCount: 160, spread: 90, origin: { y: 0.55 }, zIndex: 100 });
            }}
          >
            <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} className="hud-panel w-full max-w-sm p-6 text-center">
              <div className="text-5xl mb-2">{podiumWin[0].place === 1 ? '👑' : '🏅'}</div>
              <div className="font-display text-xl text-white mb-1">{L({ en: 'Event podium!', pt: 'Pódio do evento!', es: '¡Podio del evento!' })}</div>
              {podiumWin.map(w => (
                <div key={w.weekStart} className="mt-3 rounded-xl bg-white/[0.05] border border-white/10 p-3">
                  <div className="text-sm text-slate-200">
                    <b className="text-amber-300">{L({ en: `${ordinalEn(w.place)} place`, pt: `${w.place}º lugar`, es: `${w.place}.º lugar` })}</b> {L({ en: 'in', pt: 'em', es: 'en' })} {getEventByRoute(w.routeId)?.name ?? w.eventName}
                  </div>
                  <div className="flex justify-center gap-3 mt-1 text-sm">
                    <span className="text-amber-300"><Stardust value={w.stardust} sign="+" /></span>
                    <span className="text-violet-300"><LunarDust value={w.lunarDust} sign="+" /></span>
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-slate-400 mt-3">
                {L({ en: 'Frame', pt: 'Moldura', es: 'Marco' })} «{getNameFrame(podiumWin.some(w => w.place === 1) ? 'champion' : 'podium')?.name}» {L({ en: 'unlocked! Pick it in the Missions tab.', pt: 'desbloqueada! Escolha na aba Missões.', es: '¡desbloqueado! Elígelo en la pestaña Misiones.' })}
              </p>
              <button onClick={() => setPodiumWin(null)} className="btn-primary w-full py-3 mt-4">
                {L({ en: 'Claim prize', pt: 'Receber prêmio', es: 'Recibir premio' })}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {chestReveal && (
          <motion.div key="chest" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.7, rotate: -4 }} animate={{ scale: 1, rotate: 0 }} className="hud-panel w-full max-w-sm p-6 text-center">
              <div className="text-6xl mb-2">🎁</div>
              <div className="font-display text-xl text-white mb-1">{chestName(chestReveal.chestId)}</div>
              <div className="text-xs text-slate-400 mb-3">{L({ en: 'Chest opened!', pt: 'Baú aberto!', es: '¡Cofre abierto!' })}</div>
              <div className="flex justify-center gap-4 text-xl font-display">
                <span className="text-amber-300"><Stardust value={chestReveal.stardust} sign="+" size={26} /></span>
                {chestReveal.lunarDust > 0 && <span className="text-violet-300"><LunarDust value={chestReveal.lunarDust} sign="+" size={26} /></span>}
              </div>
              <button onClick={() => setChestReveal(null)} className="btn-primary w-full py-3 mt-5">
                {L({ en: 'Collect', pt: 'Pegar', es: 'Recoger' })}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!profile ? (
        <>
          {pendingChallenge && (
            <div className="fixed top-3 inset-x-0 z-30 flex justify-center px-4 pointer-events-none">
              <div className="hud-panel px-4 py-2 text-sm text-white text-center">
                ⚔️{' '}
                {L({
                  en: `${pendingChallenge.name} challenged you: ${pendingChallenge.score} pts. Enter the game to accept!`,
                  pt: `${pendingChallenge.name} te desafiou: ${pendingChallenge.score} pts. Entre no jogo para aceitar!`,
                  es: `${pendingChallenge.name} te desafió: ${pendingChallenge.score} pts. ¡Entra al juego para aceptar!`,
                })}
              </div>
            </div>
          )}
          <ConnectWallet onConnect={handleConnect} />
        </>
      ) : (
        <>
          <header className="sticky top-0 z-20 border-b border-sky-400/15 bg-[#050d22]/70 backdrop-blur-xl shadow-[0_1px_20px_rgba(56,189,248,0.08)]">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/40 via-sky-700/30 to-blue-900/40 ring-2 ring-sky-300/50 shadow-[0_0_18px_rgba(56,189,248,0.45)] overflow-hidden">
                  <img src={`${import.meta.env.BASE_URL}dog-face.png`} alt="DOG" className="w-full h-full object-contain scale-110 translate-y-0.5" draggable={false} />
                </div>
                <h1 className="hidden sm:block font-display text-lg bg-gradient-to-r from-sky-300 via-white to-amber-300 bg-clip-text text-transparent">DOGCITY</h1>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-3 text-sm">
                <span className="text-amber-300 font-semibold"><Stardust value={profile.stardust} /></span>
                <span className="text-violet-300 font-semibold"><LunarDust value={profile.lunarDust} /></span>
                {(pwa.canPrompt || pwa.showIosHelp) && (
                  <div className="relative">
                    <button onClick={handleInstall} className="btn-ghost px-3 py-1.5 text-xs whitespace-nowrap" title={L({ en: 'Install DogCity as an app', pt: 'Instalar o DogCity como app', es: 'Instalar DogCity como app' })}>
                      <span className="inline-flex items-center gap-1.5"><InstallIcon /> <span className="hidden sm:inline">{L({ en: 'Install app', pt: 'Instalar app', es: 'Instalar app' })}</span></span>
                    </button>
                    {iosHelp && (
                      <div className="absolute right-0 top-full mt-2 w-64 hud-panel p-3 text-xs text-slate-200 z-30">
                        {L({ en: 'In Safari, tap', pt: 'No Safari, toque em', es: 'En Safari, toca' })} <b>{L({ en: 'Share', pt: 'Compartilhar', es: 'Compartir' })}</b> <ShareGlyph /> {L({ en: 'and then', pt: 'e depois em', es: 'y luego' })} <b>{L({ en: 'Add to Home Screen', pt: 'Adicionar à Tela de Início', es: 'Añadir a pantalla de inicio' })}</b>.
                      </div>
                    )}
                  </div>
                )}
                <button onClick={toggleMusic} className={`btn-ghost px-2.5 py-1.5 text-xs ${musicOn ? '' : 'opacity-50'}`} aria-label={musicOn ? MUSIC_OFF() : MUSIC_ON()} title={musicOn ? MUSIC_OFF() : MUSIC_ON()}>
                  <MusicIcon off={!musicOn} />
                </button>
                <button onClick={toggleMute} className="btn-ghost px-2.5 py-1.5 text-xs" aria-label={muted ? L({ en: 'Unmute', pt: 'Ativar som', es: 'Activar sonido' }) : L({ en: 'Mute', pt: 'Silenciar', es: 'Silenciar' })}>
                  <SpeakerIcon muted={muted} />
                </button>
                <LanguageSwitcher resume={{ address: profile.address, provider: profile.provider }} />
                <button onClick={() => setProfile(null)} className="btn-ghost px-3 py-1.5 text-xs">
                  {L({ en: 'Exit', pt: 'Sair', es: 'Salir' })}
                </button>
              </div>
            </div>
          </header>

          <main className="relative z-10 max-w-6xl mx-auto px-4 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 order-2 lg:order-1">
                <PlayerProfileCard profile={profile} onRename={handleRename} />
              </div>

              <div className="lg:col-span-2 order-1 lg:order-2">
                {pendingChallenge && (
                  <ChallengeCard challenge={pendingChallenge} profile={profile} onAccept={acceptChallenge} onDismiss={() => setPendingChallenge(null)} />
                )}
                <nav className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-1 px-1">
                  {TABS.map(tab => {
                    const badge = tab.id === 'missions' && (profile.dailyMissions.some(m => m.completed && !m.claimed) || hasClaimableAchievement(profile));
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
                    {activeTab === 'missions' && (
                      <>
                        <StreakPanel profile={profile} />
                        <SeasonPanel profile={profile} />
                        <MissionsPanel profile={profile} onClaimReward={handleClaimMission} onReroll={handleReroll} />
                        <NameFramesPanel profile={profile} onSelect={handleSetNameStyle} />
                        <AchievementsPanel profile={profile} onClaim={handleClaimAchievement} onSetTitle={handleSetTitle} />
                      </>
                    )}
                    {activeTab === 'upgrades' && <UpgradeShop profile={profile} onPurchase={handleUpgrade} />}
                    {activeTab === 'cosmetics' && (
                      <ChestShop
                        profile={profile}
                        status={chestStatus}
                        busy={chestBusy}
                        onOrder={orderChest}
                        onPayXverse={payChestXverse}
                        onSubmitTxid={submitChestTxid}
                        onCancel={cancelChest}
                      />
                    )}
                    {activeTab === 'cosmetics' && <CosmeticShop profile={profile} onPurchase={handleBuyCosmetic} onEquip={handleEquip} />}
                    {activeTab === 'leaderboard' && <WeeklyLeaderboard playerAddress={profile.address} playerDistrict={playerDistrict(profile)} />}
                    {activeTab === 'history' && <LaunchHistory profile={profile} />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </main>

          <footer className="relative z-10 mt-12 py-6 text-center text-xs text-slate-600">
            {L({ en: 'DogCity Lunar Base', pt: 'Base Lunar DogCity', es: 'Base Lunar DogCity' })} · {providerLabel(profile.provider)} ·{' '}
            {profile.dogBalanceSource === 'real'
              ? L({ en: 'DOG balance read from the blockchain', pt: 'saldo DOG lido da blockchain', es: 'saldo DOG leído de la blockchain' })
              : L({ en: 'simulated DOG balance', pt: 'saldo DOG simulado', es: 'saldo DOG simulado' })}
            , {L({ en: 'no on-chain transactions', pt: 'sem transações on-chain', es: 'sin transacciones on-chain' })}
          </footer>
        </>
      )}
    </div>
  );
}

function SceneCrash({ refund, onBack }: { refund: number; onBack(): void }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,#0c2150,#030816_70%)]">
      <div className="hud-panel max-w-sm w-full p-6 text-center">
        <img src={cutoutArt('astronaut')} alt="" className="h-32 mx-auto object-contain mb-3 grayscale opacity-80" draggable={false} />
        <div className="font-display text-lg text-white mb-2">{L({ en: 'Houston, we have a problem', pt: 'Houston, temos um problema', es: 'Houston, tenemos un problema' })}</div>
        <p className="text-sm text-slate-300 mb-4">
          {L({ en: 'The 3D scene failed on this device. Close other tabs or update your browser and try again.', pt: 'A cena 3D falhou neste aparelho. Feche outras abas ou atualize o navegador e tente de novo.', es: 'La escena 3D falló en este dispositivo. Cierra otras pestañas o actualiza el navegador e inténtalo de nuevo.' })}
          {refund > 0 && (
            <>
              {' '}
              {L({ en: 'The mission cost', pt: 'O custo da missão', es: 'El coste de la misión' })} (<Stardust value={refund} />) {L({ en: 'was refunded.', pt: 'foi devolvido.', es: 'fue devuelto.' })}
            </>
          )}
        </p>
        <button onClick={onBack} className="btn-primary w-full py-3">
          {L({ en: 'Back to hangar', pt: 'Voltar ao hangar', es: 'Volver al hangar' })}
        </button>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,#0c2150,#030816_70%)] text-sky-200">
      <img src={cutoutArt('astronaut')} alt="" className="h-48 object-contain animate-float drop-shadow-[0_20px_30px_rgba(56,189,248,0.35)] mb-5" draggable={false} />
      <div className="font-display text-sm tracking-[0.3em]">{L({ en: 'PREPARING LAUNCH', pt: 'PREPARANDO LANÇAMENTO', es: 'PREPARANDO LANZAMIENTO' })}</div>
    </div>
  );
}

function MusicIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
      {off && <path d="M3 3l18 18" />}
    </svg>
  );
}

function InstallIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function ShareGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline -mt-0.5" aria-hidden>
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M5 12v8h14v-8" />
    </svg>
  );
}
