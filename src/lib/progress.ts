import { LaunchOutcome, LaunchSummary, PlayerProfile, Route, Stat, WeeklyScore } from '../types';
import {
  applyXp,
  calculateReward,
  calculateXpGain,
  getLunarDustGain,
  getQuality,
  getReputationGain,
  getWeekStart,
} from './economy';
import { applyLaunchToMissions, ensureDailyMissions } from './missions';
import { COSMETICS, UPGRADES } from './shop';

/** Só voos concluídos contam como melhor da semana. */
function updateWeekly(weekly: WeeklyScore[], score: number, success: boolean, now: Date): WeeklyScore[] {
  const weekStart = getWeekStart(now);
  const best = success ? score : 0;
  const current = weekly[0];
  if (current && current.weekStart === weekStart) {
    return [
      {
        ...current,
        bestScore: Math.max(current.bestScore, best),
        totalLaunches: current.totalLaunches + 1,
        totalScore: current.totalScore + score,
      },
      ...weekly.slice(1),
    ];
  }
  return [{ weekStart, bestScore: best, totalLaunches: 1, totalScore: score }, ...weekly].slice(0, 12);
}

/**
 * Aplica o resultado de um voo. O custo já foi debitado ao iniciar a missão
 * (`paidCost`), então abandonar ou fechar a aba não devolve nada.
 */
export function applyLaunchResult(
  profile: PlayerProfile,
  route: Route,
  outcome: LaunchOutcome,
  paidCost: number,
  now: Date = new Date()
): { profile: PlayerProfile; summary: LaunchSummary } {
  const base = ensureDailyMissions(profile, now);
  const { score, success } = outcome;
  const stardustEarned = calculateReward(score, route, success);
  const xpGained = calculateXpGain(score, route, success);
  const reputationGained = getReputationGain(score, route, success);
  const lunarDustGained = getLunarDustGain(score, route, success);
  const { dog, levelsGained } = applyXp(base.dog, xpGained);

  const next: PlayerProfile = {
    ...base,
    stardust: base.stardust + stardustEarned,
    lunarDust: base.lunarDust + lunarDustGained,
    totalScore: base.totalScore + score,
    bestScore: success ? Math.max(base.bestScore, score) : base.bestScore,
    dog: {
      ...dog,
      reputation: Math.max(0, dog.reputation + reputationGained),
      missions: dog.missions + 1,
    },
    launches: [
      {
        id: `launch_${now.getTime()}`,
        route: { id: route.id, name: route.name },
        score,
        stardustEarned,
        stardustCost: paidCost,
        success,
        timestamp: now.toISOString(),
      },
      ...base.launches,
    ].slice(0, 50),
    weeklyScores: updateWeekly(base.weeklyScores, score, success, now),
    dailyMissions: applyLaunchToMissions(base.dailyMissions, outcome, route, stardustEarned),
  };

  return {
    profile: next,
    summary: {
      outcome,
      quality: getQuality(score, route),
      stardustEarned,
      xpGained,
      lunarDustGained,
      reputationGained,
      levelsGained,
      newLevel: next.dog.level,
      newBest: success && score > base.bestScore,
    },
  };
}

export function purchaseUpgrade(profile: PlayerProfile, upgradeId: string): PlayerProfile | null {
  const upgrade = UPGRADES.find(u => u.id === upgradeId);
  if (!upgrade) return null;
  const stat: Stat = upgrade.stat;
  if (profile.dog[stat] + 1 !== upgrade.level || profile.stardust < upgrade.cost) return null;
  return {
    ...profile,
    stardust: profile.stardust - upgrade.cost,
    purchasedUpgrades: [...profile.purchasedUpgrades, upgradeId],
    dog: { ...profile.dog, [stat]: upgrade.level },
  };
}

export function purchaseCosmetic(profile: PlayerProfile, cosmeticId: string): PlayerProfile | null {
  const item = COSMETICS.find(c => c.id === cosmeticId);
  if (!item || profile.ownedCosmetics.includes(cosmeticId)) return null;
  const balance = item.currency === 'stardust' ? profile.stardust : profile.lunarDust;
  if (balance < item.cost) return null;
  return {
    ...profile,
    stardust: item.currency === 'stardust' ? profile.stardust - item.cost : profile.stardust,
    lunarDust: item.currency === 'lunarDust' ? profile.lunarDust - item.cost : profile.lunarDust,
    ownedCosmetics: [...profile.ownedCosmetics, cosmeticId],
  };
}

export function equipCosmetic(profile: PlayerProfile, cosmeticId: string): PlayerProfile | null {
  const item = COSMETICS.find(c => c.id === cosmeticId);
  if (!item || !profile.ownedCosmetics.includes(cosmeticId)) return null;
  const current = profile.dog[item.type];
  // Clicar em um item já equipado remove (volta ao padrão).
  const defaults = { skin: 'default', helmet: 'none', trail: 'orange' } as const;
  return { ...profile, dog: { ...profile.dog, [item.type]: current === cosmeticId ? defaults[item.type] : cosmeticId } };
}
