import { beforeEach, describe, expect, it } from 'vitest';
import type { LaunchOutcome, PlayerProfile } from '../types';
import {
  ROUTES,
  STARTING_STARDUST,
  applyXp,
  calculateReward,
  getDayKey,
  getRouteCost,
  getWeekStart,
  rankingTier,
  getXpForLevel,
} from './economy';
import { MISSION_POOL, REROLL_COST, applyLaunchToMissions, claimMission, ensureDailyMissions, pickDailyMissions, rerollMissions } from './missions';
import { applyLaunchResult, equipCosmetic, purchaseCosmetic, purchaseUpgrade } from './progress';
import { computeOutcome, FlightResult } from './scoring';
import { UPGRADES, getNextUpgrade } from './shop';
import { gaugeQuality, getGameTuning } from './stats';
import { breedLabel, createProfile, renamePilot, sanitizePilotName, getEventLeaderboard, loadProfile, migrateProfile, providerLabel, saveProfile } from './storage';
import { L, LANGUAGES, lang } from './i18n';
import { flightRandom, mulberry32 } from './rng';
import { challengeOutcome, challengeUrl, decodeChallenge, encodeChallenge } from './challenge';
import { STREAK_REWARDS, applyDailyStreak } from './streak';
import { SEASON_TIERS, applySeasonPoints, isSeasonId, msUntilNextSeason, seasonId, seasonPoints } from './seasons';
import { DISTRICT_PRIZE, applyDistrictPrize, playerDistrict } from './districts';
import { checkPayment, countsForLimit, roll, windowStarts } from '../../supabase/functions/_shared/chest-rules.ts';
import { GUEST_ADDRESS_RE, checkSignInMessage, signInMessage } from '../../supabase/functions/_shared/auth-rules.ts';
import { getSession } from './auth';
import { DROPS, dropPoint, rollDrop } from '../../supabase/functions/_shared/drop-rules.ts';
import { storedProfile } from './storage';
import { CHESTS, CHEST_LIMITS, CHEST_TREASURY, applyChestReward, chestOdds, isTxid } from './chests';
import { dogDataProfileUrl, inscriptionImageUrls, prestigeStars, sanitizeIdentity } from './dogdata';
import { astronautTier, rocketTier } from './evolution';
import { isTutorialPending, markTutorialDone } from './tutorial';
import { NAME_FRAMES, setNameStyle } from './frames';
import { PODIUM_PRIZES, applyPodiumPrize, pastEventWeeks } from './podium';
import { EVENTS, getCurrentEvent, getEventBonus, getWeekIndex, msUntilNextEvent, routeName } from './events';
import { ACHIEVEMENTS, claimAchievement, setTitle, statsFromHistory, titleText, unlockAchievements } from './achievements';

const [LOW, MOON] = ROUTES;

function outcome(partial: Partial<LaunchOutcome> = {}): LaunchOutcome {
  return {
    score: 50,
    success: true,
    aborted: false,
    launchQuality: 0.8,
    perfectLaunch: false,
    orbs: 10,
    rings: 1,
    hits: 1,
    hullLeft: 2,
    hullMax: 3,
    ...partial,
  };
}

function flight(partial: Partial<FlightResult> = {}): FlightResult {
  return { crashed: false, orbs: 30, rings: 2, hits: 0, hullLeft: 3, hullMax: 3, points: 60, spawnedPoints: 60, progress: 1, ...partial };
}

let profile: PlayerProfile;

beforeEach(() => {
  localStorage.clear();
  profile = createProfile('bc1qtest', 'Convidado', 1234);
});


/** Data/hora no relógio de Brasília (UTC−3), independente do fuso da máquina. */
const brt = (y: number, m: number, d: number, h = 0, min = 0) => new Date(Date.UTC(y, m, d, h + 3, min));

describe('economia', () => {
  it('um voo mediano de sucesso dá lucro em todas as rotas', () => {
    for (const route of ROUTES) {
      const reward = calculateReward(route.maxScore * 0.5, route, true);
      expect(reward).toBeGreaterThan(route.cost);
    }
  });

  it('falha nunca devolve mais que o custo', () => {
    for (const route of ROUTES) {
      expect(calculateReward(route.maxScore, route, false)).toBeLessThan(route.cost);
    }
  });

  it('jogador sem Stardust ganha treino gratuito na Órbita Baixa', () => {
    const broke = { ...profile, stardust: 3 };
    expect(getRouteCost(LOW, broke)).toBe(0);
    expect(getRouteCost(MOON, broke)).toBe(MOON.cost);
    expect(getRouteCost(LOW, profile)).toBe(LOW.cost);
  });

  it('applyXp sobe vários níveis de uma vez e é imutável', () => {
    const before = profile.dog;
    const { dog, levelsGained } = applyXp(before, getXpForLevel(1) + getXpForLevel(2) + 5);
    expect(levelsGained).toBe(2);
    expect(dog.level).toBe(3);
    expect(dog.xp).toBe(5);
    expect(before.level).toBe(1);
  });

  it('getWeekStart não altera a data recebida e cai na segunda-feira 00:00 de Brasília', () => {
    const sunday = brt(2026, 8, 20, 15);
    const copy = sunday.getTime();
    expect(getWeekStart(sunday)).toBe('2026-09-14T03:00:00.000Z');
    expect(sunday.getTime()).toBe(copy);
  });

  it('a semana vira no mesmo instante em qualquer fuso (segunda 00:00 de Brasília)', () => {
    // Segunda 08:00 em Tóquio = domingo 20:00 em Brasília: ainda é a semana anterior.
    const tokyoMonday = new Date('2026-09-20T23:00:00Z');
    expect(getWeekStart(tokyoMonday)).toBe('2026-09-14T03:00:00.000Z');
    expect(getWeekStart(brt(2026, 8, 20, 23, 59))).toBe('2026-09-14T03:00:00.000Z');
    expect(getWeekStart(brt(2026, 8, 21, 0, 0))).toBe('2026-09-21T03:00:00.000Z');
  });
});

describe('pontuação', () => {
  it('voo perfeito vale o score máximo', () => {
    const o = computeOutcome(LOW, 1, true, flight({ points: 200 }), false);
    expect(o.score).toBe(LOW.maxScore);
    expect(o.success).toBe(true);
  });

  it('nave perdida vale bem menos que um voo concluído equivalente', () => {
    const ok = computeOutcome(MOON, 0.8, false, flight({ points: 40 }), false);
    const crash = computeOutcome(MOON, 0.8, false, flight({ points: 40, crashed: true, hullLeft: 0, progress: 0.9 }), false);
    expect(crash.success).toBe(false);
    expect(crash.score).toBeLessThan(ok.score * 0.6);
  });

  it('o medidor dá 1 no centro, ~0.85 na borda e 0 longe', () => {
    expect(gaugeQuality(50, 50, 5)).toBe(1);
    expect(gaugeQuality(55, 50, 5)).toBeCloseTo(0.85);
    expect(gaugeQuality(70, 50, 5)).toBe(0);
  });

  it('upgrades melhoram os parâmetros do jogo', () => {
    const base = getGameTuning({ power: 1, accuracy: 1, luck: 1, speed: 1 }, LOW);
    const maxed = getGameTuning({ power: 10, accuracy: 10, luck: 10, speed: 10 }, LOW);
    expect(maxed.angleHalfZone).toBeGreaterThan(base.angleHalfZone);
    expect(maxed.gaugeSpeed).toBeLessThan(base.gaugeSpeed);
    expect(maxed.hull).toBe(base.hull + 2);
    expect(maxed.steer).toBeGreaterThan(base.steer);
    expect(maxed.orbRate).toBeGreaterThan(base.orbRate);
  });
});

describe('resultado do lançamento', () => {
  it('credita recompensa, XP, histórico e ranking semanal', () => {
    const paid = { ...profile, stardust: profile.stardust - LOW.cost };
    const { profile: next, summary } = applyLaunchResult(paid, LOW, outcome({ score: 80 }), LOW.cost);
    expect(next.stardust).toBe(paid.stardust + summary.stardustEarned);
    expect(next.stardust).toBeGreaterThan(STARTING_STARDUST);
    expect(next.launches[0]).toMatchObject({ score: 80, stardustCost: LOW.cost, success: true });
    expect(next.weeklyScores[0]).toMatchObject({ bestScore: 80, totalLaunches: 1 });
    expect(next.bestScore).toBe(80);
    expect(summary.newBest).toBe(true);
  });

  it('nave perdida não conta como recorde', () => {
    const { profile: next, summary } = applyLaunchResult(profile, LOW, outcome({ score: 30, success: false }), LOW.cost);
    expect(next.bestScore).toBe(0);
    expect(next.weeklyScores[0].bestScore).toBe(0);
    expect(summary.newBest).toBe(false);
  });

  it('a semana acumula sem mutar o perfil anterior', () => {
    const first = applyLaunchResult(profile, LOW, outcome({ score: 40 }), 10).profile;
    const snapshot = JSON.stringify(first.weeklyScores);
    const second = applyLaunchResult(first, LOW, outcome({ score: 70 }), 10).profile;
    expect(JSON.stringify(first.weeklyScores)).toBe(snapshot);
    expect(second.weeklyScores[0]).toMatchObject({ bestScore: 70, totalLaunches: 2, totalScore: 110 });
  });
});

describe('missões diárias', () => {
  it('sorteia 3 missões válidas respeitando o nível', () => {
    const picks = pickDailyMissions('2026-09-22', 'addr', 1);
    expect(picks).toHaveLength(3);
    expect(picks.every(m => (m.minLevel ?? 1) <= 1)).toBe(true);
    expect(pickDailyMissions('2026-09-22', 'addr', 1).map(m => m.id)).toEqual(picks.map(m => m.id));
  });

  it('renova quando o dia muda (bug antigo: nunca renovava)', () => {
    const today = new Date(2026, 8, 22, 10);
    const tomorrow = new Date(2026, 8, 23, 10);
    const p1 = ensureDailyMissions({ ...profile, missionDay: '' }, today);
    expect(p1.missionDay).toBe(getDayKey(today));
    expect(ensureDailyMissions(p1, today)).toBe(p1);
    const p2 = ensureDailyMissions(p1, tomorrow);
    expect(p2.missionDay).toBe(getDayKey(tomorrow));
  });

  it('progride pelos eventos do voo', () => {
    const states = MISSION_POOL.map(m => ({ missionId: m.id, progress: 0, completed: false, claimed: false }));
    const next = applyLaunchToMissions(states, outcome({ score: 200, perfectLaunch: true, hits: 0, orbs: 45, rings: 8 }), MOON, 60);
    const get = (id: string) => next.find(s => s.missionId === id)!;
    expect(get('launch_3').progress).toBe(1);
    expect(get('orbs_40').completed).toBe(true);
    expect(get('rings_8').completed).toBe(true);
    expect(get('perfect_1').completed).toBe(true);
    expect(get('flawless_1').completed).toBe(true);
    expect(get('moon_1').completed).toBe(true);
    expect(get('quality_70').completed).toBe(true);
    expect(get('earn_250').progress).toBe(60);
  });

  it('resgatar missão aplica XP com level up (bug antigo: XP travava)', () => {
    const id = profile.dailyMissions[0].missionId;
    const ready = {
      ...profile,
      dog: { ...profile.dog, xp: profile.dog.xpToNext - 1 },
      dailyMissions: profile.dailyMissions.map(m => (m.missionId === id ? { ...m, completed: true } : m)),
    };
    const result = claimMission(ready, id)!;
    expect(result.levelsGained).toBeGreaterThanOrEqual(1);
    expect(result.profile.dailyMissions.find(m => m.missionId === id)!.claimed).toBe(true);
    expect(claimMission(result.profile, id)).toBeNull();
  });

  it('troca de missões custa Stardust e só vale uma vez por dia', () => {
    const now = new Date(2026, 8, 22, 12);
    const p = ensureDailyMissions({ ...profile, missionDay: '' }, now);
    const once = rerollMissions(p, now)!;
    expect(once.stardust).toBe(p.stardust - REROLL_COST);
    expect(once.dailyMissions).toHaveLength(3);
    expect(once.dailyMissions.map(m => m.missionId)).not.toEqual(p.dailyMissions.map(m => m.missionId));
    expect(rerollMissions(once, now)).toBeNull();
  });
});

describe('loja', () => {
  it('existem 9 upgrades por stat (níveis 2 a 10) com custo crescente', () => {
    const power = UPGRADES.filter(u => u.stat === 'power');
    expect(power).toHaveLength(9);
    for (let i = 1; i < power.length; i++) expect(power[i].cost).toBeGreaterThan(power[i - 1].cost);
  });

  it('só compra o próximo nível e se houver saldo', () => {
    const rich = { ...profile, stardust: 10_000 };
    expect(purchaseUpgrade(rich, 'power_3')).toBeNull();
    const next = purchaseUpgrade(rich, getNextUpgrade(rich.dog, 'power')!.id)!;
    expect(next.dog.power).toBe(2);
    expect(purchaseUpgrade({ ...profile, stardust: 0 }, 'power_2')).toBeNull();
  });

  it('cosmético: compra uma vez, equipa e desequipa', () => {
    const rich = { ...profile, stardust: 1000 };
    const bought = purchaseCosmetic(rich, 'skin_golden')!;
    expect(bought.stardust).toBe(800);
    expect(purchaseCosmetic(bought, 'skin_golden')).toBeNull();
    const equipped = equipCosmetic(bought, 'skin_golden')!;
    expect(equipped.dog.skin).toBe('skin_golden');
    expect(equipCosmetic(equipped, 'skin_golden')!.dog.skin).toBe('default');
    expect(equipCosmetic(profile, 'skin_golden')).toBeNull();
  });
});

describe('armazenamento', () => {
  it('migra perfil da v1 sem perder progresso', () => {
    const v1 = {
      address: 'old',
      dogBalance: 5200,
      tier: 'Commander',
      stardust: 640,
      lunarDust: 22,
      dog: { id: 'd', name: 'Rex', breed: 'Shiba', level: 3, xp: 40, xpToNext: 999, reputation: 12, missions: 9, createdAt: 'x', power: 2, accuracy: 3, luck: 1, speed: 99, skin: 'default', helmet: 'none', trail: 'orange' },
      launches: [{ id: 'l', route: { id: 'low-orbit', name: 'Órbita Baixa', emoji: '🌍', cost: 10 }, score: 80, stardustEarned: 20, stardustCost: 10, success: true, timestamp: 't' }],
      dailyMissions: [{ missionId: 'score_200', progress: 1, completed: false, claimed: false }],
      purchasedUpgrades: ['power_2'],
    } as unknown as Partial<PlayerProfile>;
    const p = migrateProfile(v1);
    expect(p.version).toBe(2);
    expect(p.stardust).toBe(640);
    expect(p.dog.level).toBe(3);
    expect(p.dog.xpToNext).toBe(getXpForLevel(3));
    expect(p.dog.speed).toBe(10);
    expect(p.launches[0].route).toEqual({ id: 'low-orbit', name: 'Órbita Baixa' });
    saveProfile(p);
    const loaded = loadProfile('old')!;
    expect(loaded.dailyMissions.every(s => MISSION_POOL.some(m => m.id === s.missionId))).toBe(true);
  });
});

describe('evolução dos avatares', () => {
  it('astronauta evolui com a raridade dos itens equipados', () => {
    const d = profile.dog;
    expect(astronautTier(d).tier.index).toBe(1);
    expect(astronautTier({ ...d, helmet: 'helmet_classic', trail: 'trail_blue' }).tier.index).toBe(2);
    expect(astronautTier({ ...d, skin: 'skin_golden', helmet: 'helmet_neon', trail: 'trail_blue' }).tier.index).toBe(3);
    expect(astronautTier({ ...d, skin: 'skin_nebula', helmet: 'helmet_gold', trail: 'trail_green' }).tier.index).toBe(3);
    // Rastro Azul é raro (2 pts): a mesma combinação sobe de fase.
    expect(astronautTier({ ...d, skin: 'skin_nebula', helmet: 'helmet_gold', trail: 'trail_blue' }).tier.index).toBe(4);
    expect(astronautTier({ ...d, skin: 'skin_nebula', helmet: 'helmet_gold', trail: 'trail_plasma' }).tier.index).toBe(4);
    const max = astronautTier({ ...d, skin: 'skin_cosmic', helmet: 'helmet_gold', trail: 'trail_rainbow' });
    expect(max.tier.index).toBe(5);
    expect(max.next).toBeUndefined();
  });

  it('foguete evolui com a soma dos níveis da Oficina', () => {
    const lv = (n: number) => ({ power: n, accuracy: n, luck: n, speed: n });
    expect(rocketTier(lv(1)).tier.index).toBe(1);
    expect(rocketTier({ ...lv(1), power: 7 }).tier.index).toBe(2);
    expect(rocketTier(lv(5)).tier.index).toBe(3);
    expect(rocketTier(lv(7)).tier.index).toBe(4);
    expect(rocketTier(lv(10)).tier.index).toBe(5);
    expect(rocketTier(lv(1)).next?.min).toBe(10);
  });
});

describe('evento semanal', () => {
  it('troca toda segunda-feira em rodízio e é o mesmo durante a semana', () => {
    const mon = brt(2026, 8, 21, 0, 30);
    const sun = brt(2026, 8, 27, 23, 30);
    const nextMon = brt(2026, 8, 28, 0, 30);
    expect(getCurrentEvent(mon).id).toBe(getCurrentEvent(sun).id);
    expect(getWeekIndex(nextMon)).toBe(getWeekIndex(mon) + 1);
    expect(getCurrentEvent(nextMon).id).not.toBe(getCurrentEvent(mon).id);
    const ids = new Set(Array.from({ length: EVENTS.length }, (_, i) => getCurrentEvent(brt(2026, 8, 21 + 7 * i, 12)).id));
    expect(ids.size).toBe(EVENTS.length);
    expect(msUntilNextEvent(sun)).toBe(30 * 60 * 1000);
  });

  it('dá o bônus uma vez por semana, só na rota do evento e com qualidade mínima', () => {
    const now = brt(2026, 8, 23, 12);
    const event = getCurrentEvent(now);
    const good = Math.ceil(event.route.maxScore * event.minQuality);
    expect(getEventBonus(profile, LOW, 100, true, now)).toBeNull();
    expect(getEventBonus(profile, event.route, good - 1, true, now)).toBeNull();
    expect(getEventBonus(profile, event.route, good, false, now)).toBeNull();

    const { profile: won, summary } = applyLaunchResult(profile, event.route, outcome({ score: good }), event.route.cost, now);
    expect(summary.eventBonus).toEqual(event.bonus);
    expect(won.lunarDust).toBe(profile.lunarDust + summary.lunarDustGained + event.bonus.lunarDust);
    expect(won.eventWins).toHaveLength(1);

    const again = applyLaunchResult(won, event.route, outcome({ score: good }), event.route.cost, now);
    expect(again.summary.eventBonus).toBeUndefined();
  });

  it('rotas de evento aumentam a taxa de orbes', () => {
    const stats = { power: 1, accuracy: 1, luck: 1, speed: 1 };
    const event = EVENTS.find(e => (e.route.orbRateMult ?? 1) > 1)!;
    expect(getGameTuning(stats, event.route).orbRate).toBeGreaterThan(getGameTuning(stats, LOW).orbRate);
  });
});

describe('conquistas', () => {
  it('os voos alimentam os contadores de vida e desbloqueiam conquistas', () => {
    const { profile: next, summary } = applyLaunchResult(profile, MOON, outcome({ score: 200, orbs: 12, rings: 2, perfectLaunch: true, hits: 0 }), MOON.cost);
    expect(next.stats).toMatchObject({ launches: 1, successes: 1, orbs: 12, rings: 2, perfects: 1, flawless: 1 });
    expect(next.stats.routes[MOON.id]).toBe(1);
    expect(summary.newAchievements).toEqual(expect.arrayContaining(['first_success', 'route_moon']));
    expect(next.achievements.first_success.claimed).toBe(false);
  });

  it('resgatar paga uma vez só', () => {
    const { profile: next } = applyLaunchResult(profile, LOW, outcome(), LOW.cost);
    const claimed = claimAchievement(next, 'first_success')!;
    const def = ACHIEVEMENTS.find(a => a.id === 'first_success')!;
    expect(claimed.profile.stardust).toBe(next.stardust + def.reward.stardust);
    expect(claimAchievement(claimed.profile, 'first_success')).toBeNull();
    expect(claimAchievement(profile, 'first_success')).toBeNull();
  });

  it('não desbloqueia de novo o que já foi desbloqueado', () => {
    const first = unlockAchievements({ ...profile, dog: { ...profile.dog, level: 5 } });
    expect(first.unlocked.map(a => a.id)).toContain('level_5');
    const second = unlockAchievements(first.profile);
    expect(second.unlocked).toHaveLength(0);
    expect(second.profile).toBe(first.profile);
  });

  it('perfil antigo ganha contadores estimados pelo histórico e as conquistas já cumpridas', () => {
    const old = { ...profile } as Partial<PlayerProfile>;
    delete old.stats;
    delete old.achievements;
    delete old.eventWins;
    old.dog = { ...profile.dog, missions: 12 };
    old.launches = [
      { id: 'a', route: { id: 'mars-colony', name: 'Colônia de Marte' }, score: 700, stardustEarned: 150, stardustCost: 100, success: true, timestamp: 't' },
      { id: 'b', route: { id: 'low-orbit', name: 'Órbita Baixa' }, score: 10, stardustEarned: 1, stardustCost: 10, success: false, timestamp: 't' },
    ];
    expect(statsFromHistory(old as PlayerProfile)).toMatchObject({ launches: 12, successes: 1, stardustEarned: 150, routes: { 'mars-colony': 1 } });
    saveProfile(old as PlayerProfile);
    const loaded = loadProfile(profile.address)!;
    expect(loaded.eventWins).toEqual([]);
    expect(Object.keys(loaded.achievements)).toEqual(expect.arrayContaining(['launches_10', 'route_mars', 'first_success']));
  });
});

describe('títulos, secretas e ranking do evento', () => {
  it('só dá para usar como título uma conquista desbloqueada', () => {
    expect(setTitle(profile, 'route_mars')).toBeNull();
    const { profile: flown } = applyLaunchResult(profile, LOW, outcome(), LOW.cost);
    const titled = setTitle(flown, 'first_success')!;
    expect(titled.title).toBe('first_success');
    expect(titleText(titled.title)).toBe('First Leap');
    expect(setTitle(titled, null)!.title).toBeUndefined();
  });

  it('título inválido some na migração', () => {
    const bad = migrateProfile({ ...profile, title: 'route_mars' });
    expect(bad.title).toBeUndefined();
  });

  it('contadores das secretas: por um fio, coruja e naves perdidas', () => {
    const night = new Date(2026, 8, 23, 2, 30);
    const { profile: a } = applyLaunchResult(profile, LOW, outcome({ hullLeft: 1, hullMax: 3 }), LOW.cost, night);
    expect(a.stats).toMatchObject({ closeCalls: 1, nightFlights: 1, crashes: 0 });
    expect(a.achievements.secret_close).toBeTruthy();
    expect(a.achievements.secret_night).toBeTruthy();
    const { profile: b } = applyLaunchResult(a, LOW, outcome({ success: false, score: 5 }), LOW.cost, new Date(2026, 8, 23, 14));
    expect(b.stats.crashes).toBe(1);
  });

  it('perfil com stats antigos (sem os contadores novos) é completado', () => {
    const old = { ...profile, stats: { launches: 3, successes: 2, orbs: 5, rings: 1, perfects: 0, flawless: 0, stardustEarned: 40, routes: {} } };
    const m = migrateProfile(old as unknown as PlayerProfile);
    expect(m.stats).toMatchObject({ launches: 3, crashes: 0, closeCalls: 0, nightFlights: 0 });
  });

  it('evento de Saturno tem anéis mais frequentes e o rodízio mantém o evento desta semana', () => {
    const saturn = EVENTS.find(e => e.route.destination === 'gas')!;
    expect(saturn.route.ringRateMult).toBeGreaterThan(1);
    expect(getCurrentEvent(brt(2026, 8, 23, 12)).id).toBe('solar-storm');
  });

  it('ranking local do evento só conta voos concluídos na rota, nesta semana', () => {
    const now = brt(2026, 8, 23, 12);
    const event = getCurrentEvent(now);
    const { profile: a } = applyLaunchResult(profile, event.route, outcome({ score: 120 }), event.route.cost, now);
    const { profile: b } = applyLaunchResult(a, LOW, outcome({ score: 90 }), LOW.cost, now);
    saveProfile(b);
    const board = getEventLeaderboard(event.route.id, now);
    expect(board).toHaveLength(1);
    expect(board[0]).toMatchObject({ weekScore: 120, totalLaunches: 1 });
    expect(getEventLeaderboard(event.route.id, brt(2026, 8, 30, 12))).toHaveLength(0);
  });
});

describe('tutorial do primeiro voo', () => {
  it('aparece para piloto novo e some depois de concluído ou para quem já voou', () => {
    expect(isTutorialPending(profile)).toBe(true);
    markTutorialDone(profile.address);
    expect(isTutorialPending(profile)).toBe(false);
    const other = createProfile('bc1qoutro', 'Convidado', 10);
    const { profile: flown } = applyLaunchResult(other, LOW, outcome(), LOW.cost);
    expect(isTutorialPending(flown)).toBe(false);
  });
});

describe('patente no ranking público', () => {
  it('só saldo DOG real vale patente; convidado com saldo simulado entra como Stray', () => {
    expect(rankingTier({ dogBalanceSource: 'simulated', tier: 'Legend' })).toBe('Stray');
    expect(rankingTier({ dogBalanceSource: undefined, tier: 'Commander' })).toBe('Stray');
    expect(rankingTier({ dogBalanceSource: 'real', tier: 'Legend' })).toBe('Legend');
  });
});

describe('molduras de nome e pódio do evento', () => {
  it('só dá para usar moldura desbloqueada', () => {
    expect(setNameStyle(profile, 'mars')).toBeNull();
    const withMars = { ...profile, achievements: { route_mars: { unlockedAt: 'x', claimed: true } } };
    expect(setNameStyle(withMars, 'mars')!.nameStyle).toBe('mars');
    expect(setNameStyle(withMars, null)!.nameStyle).toBeUndefined();
    expect(NAME_FRAMES.every(f => /^[a-z0-9_]{1,24}$/.test(f.id))).toBe(true);
  });

  it('toda moldura tem visual para o cartão de compartilhamento', () => {
    for (const f of NAME_FRAMES) {
      expect(f.card.colors.length).toBeGreaterThan(0);
      // Moldura com borda no perfil também tem borda no cartão.
      expect(Boolean(f.card.border)).toBe(Boolean(f.frame));
    }
  });

  it('semanas a conferir são as encerradas, com o evento de cada uma', () => {
    const weeks = pastEventWeeks(brt(2026, 8, 30, 10));
    expect(weeks[0].weeksAgo).toBe(1);
    expect(weeks[0].event.id).toBe('solar-storm');
    expect(weeks[0].weekStart).toBe('2026-09-21T03:00:00.000Z');
    expect(new Set(weeks.map(w => w.weekStart)).size).toBe(weeks.length);
  });

  it('prêmio do pódio sai uma vez por semana e libera moldura e conquista', () => {
    const [week] = pastEventWeeks(brt(2026, 8, 30, 10));
    const r = applyPodiumPrize(profile, week, 1)!;
    expect(r.profile.stardust).toBe(profile.stardust + PODIUM_PRIZES[1].stardust);
    expect(r.profile.lunarDust).toBe(profile.lunarDust + PODIUM_PRIZES[1].lunarDust);
    expect(applyPodiumPrize(r.profile, week, 1)).toBeNull();
    expect(applyPodiumPrize(profile, week, 4)).toBeNull();
    expect(setNameStyle(r.profile, 'champion')).not.toBeNull();
    expect(unlockAchievements(r.profile).unlocked.map(a => a.id)).toEqual(expect.arrayContaining(['podium_1', 'champion_1']));
    const second = applyPodiumPrize(profile, week, 2)!;
    expect(setNameStyle(second.profile, 'podium')).not.toBeNull();
    expect(setNameStyle(second.profile, 'champion')).toBeNull();
  });
});

describe('idiomas', () => {
  it('inglês é o padrão, com português e espanhol disponíveis', () => {
    expect(lang).toBe('en');
    expect(LANGUAGES.map(l => l.id)).toEqual(['en', 'pt', 'es']);
    expect(L({ en: 'Launch', pt: 'Lançar', es: 'Lanzar' })).toBe('Launch');
    expect(ROUTES[0].name).toBe('Low Orbit');
  });

  it('raças e convidado guardados em português aparecem traduzidos', () => {
    expect(breedLabel('Corgi Lunar')).toBe('Lunar Corgi');
    expect(breedLabel('Raça Desconhecida')).toBe('Raça Desconhecida');
    expect(providerLabel('Convidado')).toBe('Guest');
    expect(providerLabel('Xverse')).toBe('Xverse');
  });

  it('o histórico mostra o nome da rota no idioma atual', () => {
    expect(routeName({ id: 'mars-colony', name: 'Colônia de Marte' })).toBe('Mars Colony');
    expect(routeName({ id: 'event-solar-storm', name: 'Tempestade Solar' })).toBe('Solar Storm');
    expect(routeName({ id: 'rota-antiga', name: 'Rota Antiga' })).toBe('Rota Antiga');
  });
});

describe('nome do astronauta', () => {
  it('limpa espaços e aceita acentos, números e - _ \' .', () => {
    expect(sanitizePilotName('  Capitão   Rabo  ')).toBe('Capitão Rabo');
    expect(sanitizePilotName("D'Artagnan-9_X.")).toBe("D'Artagnan-9_X.");
    expect(sanitizePilotName('Ñandú')).toBe('Ñandú');
  });

  it('recusa curto, longo, vazio ou com símbolos', () => {
    expect(sanitizePilotName('A')).toBeNull();
    expect(sanitizePilotName('   ')).toBeNull();
    expect(sanitizePilotName('x'.repeat(21))).toBeNull();
    expect(sanitizePilotName('<script>')).toBeNull();
    expect(sanitizePilotName('-Traço')).toBeNull();
  });

  it('renomeia sem mexer no resto do perfil', () => {
    const renamed = renamePilot(profile, ' Lua Nova ')!;
    expect(renamed.dog.name).toBe('Lua Nova');
    expect(renamed.dog.level).toBe(profile.dog.level);
    expect(renamed.address).toBe(profile.address);
    expect(renamePilot(profile, '!')).toBeNull();
  });
});

describe('identidade DogData', () => {
  const INSC = `${'ab'.repeat(32)}i0`;

  it('aceita só handle e inscrição no formato do DogData', () => {
    expect(sanitizeIdentity({ handle: 'dog_army', avatarId: INSC })).toEqual({ handle: 'dog_army', avatarId: INSC });
    expect(sanitizeIdentity({ handle: 'Dog Army!', avatarId: INSC })).toEqual({ handle: null, avatarId: INSC });
    expect(sanitizeIdentity({ handle: 'dog_army', avatarId: 'javascript:alert(1)' })).toEqual({ handle: 'dog_army', avatarId: null });
    expect(sanitizeIdentity({ handle: 'x', avatarId: 'abc' })).toBeNull();
    expect(sanitizeIdentity(null)).toBeNull();
  });

  it('monta a imagem do Ordinal e o link do perfil', () => {
    expect(inscriptionImageUrls(INSC)[0]).toBe(`https://ordinals.com/content/${INSC}`);
    expect(inscriptionImageUrls(INSC)[1]).toBe(`https://static.unisat.io/content/${INSC}`);
    expect(dogDataProfileUrl('bc1pabc')).toBe('https://www.dogdata.xyz/address/bitcoin/bc1pabc');
  });

  it('prestígio vira de 0 a 5 estrelas', () => {
    expect(prestigeStars(3)).toBe(3);
    expect(prestigeStars(9)).toBe(5);
    expect(prestigeStars(0)).toBe(0);
    expect(prestigeStars(null)).toBe(0);
  });
});

describe('voo com semente e desafio', () => {
  it('a mesma semente repete a sequência, e cada tipo tem a sua', () => {
    const a = flightRandom(42);
    const b = flightRandom(42);
    const seqA = [a.hazard(), a.hazard(), a.orb(), a.ring()];
    // ordem diferente entre tipos não muda a sequência de cada um
    const orbB = b.orb();
    const seqB = [b.hazard(), b.hazard(), orbB, b.ring()];
    expect(seqB).toEqual(seqA);
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it('o link leva e traz o desafio, e recusa dados impossíveis', () => {
    const c = { routeId: 'mars-colony', seed: 123456789, score: 820, name: 'Capitão Lua' };
    expect(decodeChallenge(encodeChallenge(c))).toEqual(c);
    const url = challengeUrl('https://example.com/game/', c);
    expect(decodeChallenge(new URL(url).searchParams.get('c'))).toEqual(c);
    expect(decodeChallenge(encodeChallenge({ ...c, score: 5000 }))).toBeNull();
    expect(decodeChallenge(encodeChallenge({ ...c, routeId: 'rota-falsa' }))).toBeNull();
    expect(decodeChallenge(encodeChallenge({ ...c, name: '<b>' }))).toBeNull();
    expect(decodeChallenge('lixo!!')).toBeNull();
    expect(decodeChallenge(encodeChallenge({ ...c, routeId: 'event-solar-storm', score: 300 }))?.routeId).toBe('event-solar-storm');
  });

  it('só voo concluído vence o desafio', () => {
    const c = { routeId: 'low-orbit', seed: 1, score: 50, name: 'Ana' };
    expect(challengeOutcome(c, 60, true)).toBe('won');
    expect(challengeOutcome(c, 50, true)).toBe('tied');
    expect(challengeOutcome(c, 40, true)).toBe('lost');
    expect(challengeOutcome(c, 90, false)).toBe('lost');
  });
});

describe('sequência de dias', () => {
  it('conta dias seguidos, paga o ciclo de 7 e recomeça ao pular um dia', () => {
    const d1 = applyDailyStreak(profile, new Date(2026, 8, 1, 10))!;
    expect(d1.day).toBe(1);
    expect(d1.profile.stardust).toBe(profile.stardust + STREAK_REWARDS[0].stardust);
    expect(applyDailyStreak(d1.profile, new Date(2026, 8, 1, 22))).toBeNull();
    let p = d1.profile;
    for (let day = 2; day <= 8; day++) p = applyDailyStreak(p, new Date(2026, 8, day, 9))!.profile;
    expect(p.streak.count).toBe(8);
    expect(p.streak.best).toBe(8);
    const skipped = applyDailyStreak(p, new Date(2026, 8, 10, 9))!;
    expect(skipped.day).toBe(1);
    expect(skipped.profile.streak.best).toBe(8);
  });

  it('vira o mês sem quebrar a sequência', () => {
    const a = applyDailyStreak(profile, new Date(2026, 8, 30, 20))!;
    expect(applyDailyStreak(a.profile, new Date(2026, 9, 1, 8))!.day).toBe(2);
  });
});

describe('temporadas', () => {
  it('pontua voo concluído, paga os níveis e libera a moldura no último', () => {
    const now = new Date(2026, 9, 15);
    expect(seasonId(now)).toBe('season_2026_10');
    expect(isSeasonId('season_2026_10')).toBe(true);
    expect(isSeasonId('season_2026_13')).toBe(false);
    expect(seasonPoints(820, true)).toBe(92);
    expect(seasonPoints(820, false)).toBe(0);
    const g = applySeasonPoints(profile, 1000, true, now);
    expect(g.points).toBe(110);
    expect(g.tiers).toEqual([1]);
    expect(g.profile.stardust).toBe(profile.stardust + SEASON_TIERS[0].stardust);
    const almost = { ...profile, season: { id: 'season_2026_10', points: 2950, tier: 9 } };
    const last = applySeasonPoints(almost, 1000, true, now);
    expect(last.tiers).toEqual([10]);
    expect(last.frame).toBe('season_2026_10');
    expect(last.profile.seasonFrames).toContain('season_2026_10');
  });

  it('o mês da temporada vira à meia-noite de Brasília, como no servidor', () => {
    expect(seasonId(brt(2026, 8, 30, 23, 59))).toBe('season_2026_09');
    expect(seasonId(brt(2026, 9, 1, 0, 0))).toBe('season_2026_10');
    // 1º de outubro 09:00 em Tóquio ainda é 30 de setembro em Brasília.
    expect(seasonId(new Date('2026-10-01T00:00:00Z'))).toBe('season_2026_09');
    expect(msUntilNextSeason(brt(2026, 8, 30, 23, 30))).toBe(30 * 60 * 1000);
  });

  it('o mês novo zera pontos e níveis', () => {
    const old = { ...profile, season: { id: 'season_2026_09', points: 2000, tier: 8 } };
    const g = applySeasonPoints(old, 100, true, new Date(2026, 9, 2));
    expect(g.profile.season).toEqual({ id: 'season_2026_10', points: 20, tier: 0 });
  });
});

describe('guerra de distritos', () => {
  const week = new Date(2026, 8, 21).toISOString();
  const realProfile = (): PlayerProfile => ({
    ...profile,
    dogBalanceSource: 'real',
    dogOnchain: { balance: 5000, rank: 10, updatedAt: '', dogcity: { status: 'in_snapshot', identity: null, genesis: false, areaM2: 100, lotId: 'A1', district: 'Satoshi Heights', typology: 'Tower', mapUrl: null } },
    launches: [{ id: 'l1', route: { id: 'low-orbit', name: 'Low Orbit' }, score: 80, stardustEarned: 20, stardustCost: 10, success: true, timestamp: new Date(2026, 8, 23, 12).toISOString() }],
  });

  it('prêmio só para quem é do distrito campeão e voou na semana, uma vez', () => {
    const real = realProfile();
    expect(playerDistrict(real)).toBe('Satoshi Heights');
    expect(playerDistrict(profile)).toBeNull();
    const won = applyDistrictPrize(real, week, 'Satoshi Heights')!;
    expect(won.stardust).toBe(real.stardust + DISTRICT_PRIZE.stardust);
    expect(applyDistrictPrize(won, week, 'Satoshi Heights')).toBeNull();
    expect(applyDistrictPrize(real, week, 'Outro Distrito')).toBeNull();
    expect(applyDistrictPrize({ ...real, launches: [] }, week, 'Satoshi Heights')).toBeNull();
  });
});

describe('baús pagos com DOG', () => {
  it('configuração: tesouraria, limite 1/dia e 5/semana e chances que somam 100%', () => {
    expect(CHEST_TREASURY).toBe('bc1qv4q4j8mjxhjxwjuc7vy6sq7c57z6rdvteql4xy');
    expect(CHEST_LIMITS).toEqual({ perDay: 1, perWeek: 5 });
    for (const chest of CHESTS) {
      expect(chest.priceDog).toBeGreaterThan(0);
      expect(chest.outcomes.every(o => o.weight > 0 && o.stardust >= 0 && o.lunarDust >= 0)).toBe(true);
      expect(chestOdds(chest).reduce((sum, o) => sum + o.percent, 0)).toBeCloseTo(100, 6);
    }
    // Baú mais caro nunca vale menos, em média, que um mais barato.
    const ev = (c: (typeof CHESTS)[number]) => chestOdds(c).reduce((sum, o) => sum + (o.percent / 100) * o.stardust, 0);
    const byPrice = [...CHESTS].sort((a, b) => a.priceDog - b.priceDog);
    for (let i = 1; i < byPrice.length; i++) expect(ev(byPrice[i])).toBeGreaterThan(ev(byPrice[i - 1]));
  });

  it('o prêmio de um pedido entra uma vez só e fecha o pedido pendente', () => {
    const withPending = { ...profile, chestPending: { orderId: 'o1', chestId: 'supply', priceDog: 1500, txid: 'ab'.repeat(32), createdAt: '' } };
    const credited = applyChestReward(withPending, 'o1', { stardust: 200, lunarDust: 1 })!;
    expect(credited.stardust).toBe(profile.stardust + 200);
    expect(credited.lunarDust).toBe(profile.lunarDust + 1);
    expect(credited.chestPending).toBeUndefined();
    expect(applyChestReward(credited, 'o1', { stardust: 200, lunarDust: 1 })).toBeNull();
    expect(applyChestReward(profile, 'o2', { stardust: -50, lunarDust: 0 })!.stardust).toBe(profile.stardust);
  });

  it('só aceita txid no formato de Bitcoin', () => {
    expect(isTxid('AB'.repeat(32))).toBe(true);
    expect(isTxid('xyz')).toBe(false);
  });
});

describe('regras do servidor dos baús', () => {
  const T = 'bc1qv4q4j8mjxhjxwjuc7vy6sq7c57z6rdvteql4xy';
  const ME = 'bc1pqa7wallettest0000000000000000000000000000000000000000000';
  const order = { address: ME, price_dog: 1500, created_at: '2026-09-25T12:00:00Z' };
  const tx = (over: Record<string, unknown> = {}) => ({
    block_height: 915000,
    timestamp: '2026-09-25T12:05:00Z',
    senders: [{ address: ME, amount_dog: 5000 }],
    receivers: [
      { address: T, amount_dog: 1500, is_change: false },
      { address: ME, amount_dog: 3500, is_change: true },
    ],
    ...over,
  });

  it('aceita o pagamento certo e recusa o errado', () => {
    expect(checkPayment(tx(), order, T)).toBeNull();
    expect(checkPayment(tx({ block_height: 0 }), order, T)).toBe('aguardando confirmação');
    expect(checkPayment(tx({ senders: [{ address: 'bc1qoutra00000000000000000000000000000' }] }), order, T)).toMatch(/carteira do pedido/);
    expect(checkPayment(tx({ receivers: [{ address: T, amount_dog: 1000, is_change: false }] }), order, T)).toMatch(/abaixo do preço/);
    expect(checkPayment(tx({ receivers: [{ address: T, amount_dog: 1500, is_change: true }] }), order, T)).toMatch(/abaixo do preço/);
    expect(checkPayment(tx({ timestamp: '2026-09-20T12:00:00Z' }), order, T)).toMatch(/anterior ao pedido/);
    expect(checkPayment(tx({ timestamp: 1790337900 }), order, T)).toBeNull();
    expect(checkPayment(null, order, T)).toBe('transação inválida');
  });

  it('dia e semana do limite viram à meia-noite de Brasília (segunda-feira)', () => {
    // 25/09/2026 é sexta. 02:00 UTC ainda é quinta (23:00) em Brasília.
    const { dayStart, weekStart } = windowStarts(Date.parse('2026-09-25T02:00:00Z'));
    expect(new Date(dayStart).toISOString()).toBe('2026-09-24T03:00:00.000Z');
    expect(new Date(weekStart).toISOString()).toBe('2026-09-21T03:00:00.000Z');
  });

  it('pedido aberto segura a vaga por 24 h; pago sempre conta', () => {
    const now = Date.parse('2026-09-25T12:00:00Z');
    expect(countsForLimit({ status: 'pending', created_at: '2026-09-25T00:00:00Z' }, now)).toBe(true);
    expect(countsForLimit({ status: 'pending', created_at: '2026-09-23T00:00:00Z' }, now)).toBe(false);
    expect(countsForLimit({ status: 'paid', created_at: '2026-09-01T00:00:00Z' }, now)).toBe(true);
    expect(countsForLimit({ status: 'cancelled', created_at: '2026-09-25T00:00:00Z' }, now)).toBe(false);
  });

  it('o sorteio segue os pesos publicados', () => {
    const supply = CHESTS.find(c => c.id === 'supply')!;
    expect(roll(supply, () => 0)).toEqual({ stardust: 120, lunarDust: 0 });
    expect(roll(supply, () => 0.95)).toEqual({ stardust: 320, lunarDust: 2 });
    expect(roll(supply, () => 0.999)).toEqual({ stardust: 600, lunarDust: 5 });
  });
});


describe('sessão assinada e progresso na nuvem', () => {
  const A = 'bc1ppv609nr0vr25u07u95waq5lucwfm6tde4nydujnu8npg4q75mr5sxq8lt3';
  const now = Date.parse('2026-09-24T12:00:00.000Z');

  it('mensagem de login: texto exato, do endereço certo e recente', () => {
    const msg = signInMessage(A, '2026-09-24T11:58:00.000Z');
    expect(msg).toMatch(/^DogCity Lunar Launch - sign in\n/);
    expect(checkSignInMessage(msg, A, now)).toBeNull();
    expect(checkSignInMessage(msg, 'bc1qother000000000000000000000000000000000', now)).toBe('mensagem inválida');
    expect(checkSignInMessage(msg + ' ', A, now)).toBe('mensagem inválida');
    expect(checkSignInMessage(signInMessage(A, '2026-09-24T11:40:00.000Z'), A, now)).toBe('mensagem vencida');
    expect(checkSignInMessage(signInMessage(A, '2026-09-24T12:10:00.000Z'), A, now)).toBe('mensagem inválida');
    expect(checkSignInMessage('Issued: 2026-09-24T11:58:00.000Z', A, now)).toBe('mensagem inválida');
  });

  it('endereço de convidado tem o formato esperado', async () => {
    const { connectGuest } = await import('./wallet');
    const g = await connectGuest();
    expect(GUEST_ADDRESS_RE.test(g.address)).toBe(true);
  });

  it('sessão vencida ou com token estranho é ignorada', () => {
    localStorage.setItem('dogcity_sessions', JSON.stringify({ [A]: { token: 'x'.repeat(43), kind: 'wallet', expiresAt: '2000-01-01T00:00:00Z' } }));
    expect(getSession(A)).toBeNull();
    localStorage.setItem('dogcity_sessions', JSON.stringify({ [A]: { token: 'bad token', kind: 'wallet', expiresAt: '2999-01-01T00:00:00Z' } }));
    expect(getSession(A)).toBeNull();
    localStorage.setItem('dogcity_sessions', JSON.stringify({ [A]: { token: 'a'.repeat(43), kind: 'wallet', expiresAt: '2999-01-01T00:00:00Z' } }));
    expect(getSession(A)?.kind).toBe('wallet');
  });

  it('cada gravação sobe a revisão do perfil', () => {
    const p = createProfile(A, 'Xverse', 0);
    const r1 = storedProfile(A)!.revision;
    saveProfile(p); // cópia antiga em memória não volta a revisão
    saveProfile({ ...p, stardust: 5 });
    expect(storedProfile(A)!.revision).toBe(r1 + 2);
    expect(migrateProfile({ ...p, revision: undefined } as never).revision).toBe(0);
  });
});

describe('DOG no voo (prêmio acumulado)', () => {
  const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length]; };

  it('sem prêmio mínimo acumulado não sai moeda', () => {
    expect(rollDrop(DROPS.minPoolDog - 1, DROPS, () => 0)).toBeNull();
  });

  it('a chance é baixa e o valor é uma fatia do prêmio, com teto', () => {
    expect(rollDrop(10000, DROPS, seq(DROPS.dropChance + 0.001))).toBeNull();
    expect(rollDrop(10000, DROPS, seq(0, 0))).toBe(Math.floor(10000 * DROPS.minPct));
    expect(rollDrop(10000, DROPS, seq(0, 0.999999))).toBe(Math.floor(10000 * (DROPS.minPct + 0.999999 * (DROPS.maxPct - DROPS.minPct))));
    expect(rollDrop(10_000_000, DROPS, seq(0, 1))).toBe(DROPS.maxDropDog);
    expect(rollDrop(DROPS.minPoolDog, DROPS, seq(0, 0))).toBeGreaterThanOrEqual(DROPS.minDropDog);
  });

  it('metade dos baús vai para o prêmio e a moeda aparece no meio do voo', () => {
    expect(DROPS.poolShare).toBe(0.5);
    for (const r of [0, 0.5, 0.999]) {
      const at = dropPoint(() => r);
      expect(at).toBeGreaterThanOrEqual(0.3);
      expect(at).toBeLessThan(0.76);
    }
  });
});
