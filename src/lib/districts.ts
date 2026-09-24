import type { PlayerProfile } from '../types';

/**
 * Guerra de distritos: cada voo concluído soma para o distrito do lote do
 * piloto no DogCity. O servidor apura por semana a soma do melhor voo de cada
 * piloto em cada rota (então vence o distrito com mais pilotos ativos, não quem
 * repete o mesmo voo). O distrito campeão da semana passada rende um prêmio a
 * quem voou por ele, uma vez por semana, e a moldura "Distrito Campeão".
 */

export const DISTRICT_PRIZE = { stardust: 250, lunarDust: 10 };

/** Distrito do lote do piloto (só carteira real que estava no snapshot do DogCity). */
export function playerDistrict(profile: PlayerProfile): string | null {
  const city = profile.dogBalanceSource === 'real' ? profile.dogOnchain?.dogcity : null;
  return city?.status === 'in_snapshot' && city.district ? city.district : null;
}

/** O piloto concluiu algum voo na semana que começa em `weekStart`? */
export function flewInWeek(profile: PlayerProfile, weekStart: string): boolean {
  const start = new Date(weekStart).getTime();
  const end = start + 7 * 24 * 60 * 60 * 1000;
  return profile.launches.some(l => {
    const t = new Date(l.timestamp).getTime();
    return l.success && t >= start && t < end;
  });
}

/**
 * Prêmio do distrito campeão da semana `weekStart`. `null` se o piloto não é
 * desse distrito, não voou naquela semana ou já recebeu.
 */
export function applyDistrictPrize(profile: PlayerProfile, weekStart: string, champion: string): PlayerProfile | null {
  const district = playerDistrict(profile);
  if (!district || district !== champion) return null;
  if (profile.districtWins.includes(weekStart) || !flewInWeek(profile, weekStart)) return null;
  return {
    ...profile,
    stardust: profile.stardust + DISTRICT_PRIZE.stardust,
    lunarDust: profile.lunarDust + DISTRICT_PRIZE.lunarDust,
    districtWins: [weekStart, ...profile.districtWins].slice(0, 52),
  };
}
