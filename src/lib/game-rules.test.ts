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
  getXpForLevel,
} from './economy';
import { MISSION_POOL, REROLL_COST, applyLaunchToMissions, claimMission, ensureDailyMissions, pickDailyMissions, rerollMissions } from './missions';
import { applyLaunchResult, equipCosmetic, purchaseCosmetic, purchaseUpgrade } from './progress';
import { computeOutcome, FlightResult } from './scoring';
import { UPGRADES, getNextUpgrade } from './shop';
import { gaugeQuality, getGameTuning } from './stats';
import { createProfile, getEventLeaderboard, loadProfile, migrateProfile, saveProfile } from './storage';
import { astronautTier, rocketTier } from './evolution';
import { EVENTS, getCurrentEvent, getEventBonus, getWeekIndex, msUntilNextEvent } from './events';
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

  it('getWeekStart não altera a data recebida e cai numa segunda-feira', () => {
    const sunday = new Date(2026, 8, 20, 15, 0);
    const copy = sunday.getTime();
    const monday = new Date(getWeekStart(sunday));
    expect(sunday.getTime()).toBe(copy);
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(14);
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
    expect(astronautTier(d).tier.name).toBe('Início');
    expect(astronautTier({ ...d, helmet: 'helmet_classic', trail: 'trail_blue' }).tier.name).toBe('Exploração');
    expect(astronautTier({ ...d, skin: 'skin_golden', helmet: 'helmet_neon', trail: 'trail_blue' }).tier.name).toBe('Avançado');
    expect(astronautTier({ ...d, skin: 'skin_nebula', helmet: 'helmet_gold', trail: 'trail_green' }).tier.name).toBe('Avançado');
    // Rastro Azul é raro (2 pts): a mesma combinação sobe de fase.
    expect(astronautTier({ ...d, skin: 'skin_nebula', helmet: 'helmet_gold', trail: 'trail_blue' }).tier.name).toBe('Especial');
    expect(astronautTier({ ...d, skin: 'skin_nebula', helmet: 'helmet_gold', trail: 'trail_plasma' }).tier.name).toBe('Especial');
    const max = astronautTier({ ...d, skin: 'skin_cosmic', helmet: 'helmet_gold', trail: 'trail_rainbow' });
    expect(max.tier.name).toBe('Lendário');
    expect(max.next).toBeUndefined();
  });

  it('foguete evolui com a soma dos níveis da Oficina', () => {
    const lv = (n: number) => ({ power: n, accuracy: n, luck: n, speed: n });
    expect(rocketTier(lv(1)).tier.name).toBe('Básico');
    expect(rocketTier({ ...lv(1), power: 7 }).tier.name).toBe('Aprimorado');
    expect(rocketTier(lv(5)).tier.name).toBe('Avançado');
    expect(rocketTier(lv(7)).tier.name).toBe('Especial');
    expect(rocketTier(lv(10)).tier.name).toBe('Lendário');
    expect(rocketTier(lv(1)).next?.min).toBe(10);
  });
});

describe('evento semanal', () => {
  it('troca toda segunda-feira em rodízio e é o mesmo durante a semana', () => {
    const mon = new Date(2026, 8, 21, 0, 30);
    const sun = new Date(2026, 8, 27, 23, 30);
    const nextMon = new Date(2026, 8, 28, 0, 30);
    expect(getCurrentEvent(mon).id).toBe(getCurrentEvent(sun).id);
    expect(getWeekIndex(nextMon)).toBe(getWeekIndex(mon) + 1);
    expect(getCurrentEvent(nextMon).id).not.toBe(getCurrentEvent(mon).id);
    const ids = new Set(Array.from({ length: EVENTS.length }, (_, i) => getCurrentEvent(new Date(2026, 8, 21 + 7 * i)).id));
    expect(ids.size).toBe(EVENTS.length);
    expect(msUntilNextEvent(sun)).toBe(30 * 60 * 1000);
  });

  it('dá o bônus uma vez por semana, só na rota do evento e com qualidade mínima', () => {
    const now = new Date(2026, 8, 23, 12);
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
    expect(titleText(titled.title)).toBe('Primeiro Salto');
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
    expect(getCurrentEvent(new Date(2026, 8, 23)).id).toBe('solar-storm');
  });

  it('ranking local do evento só conta voos concluídos na rota, nesta semana', () => {
    const now = new Date(2026, 8, 23, 12);
    const event = getCurrentEvent(now);
    const { profile: a } = applyLaunchResult(profile, event.route, outcome({ score: 120 }), event.route.cost, now);
    const { profile: b } = applyLaunchResult(a, LOW, outcome({ score: 90 }), LOW.cost, now);
    saveProfile(b);
    const board = getEventLeaderboard(event.route.id, now);
    expect(board).toHaveLength(1);
    expect(board[0]).toMatchObject({ weekScore: 120, totalLaunches: 1 });
    expect(getEventLeaderboard(event.route.id, new Date(2026, 8, 30, 12))).toHaveLength(0);
  });
});
