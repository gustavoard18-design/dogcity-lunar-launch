// Regras do DOG que aparece no voo, usadas pela Edge Function `dog-drops` (e testadas no jogo).
import config from './drops.json' with { type: 'json' };

export type DropConfig = typeof config;
export const DROPS: DropConfig = config;

type Rand = () => number;
const cryptoRandom: Rand = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

/**
 * Sorteia se o voo terá DOG e quanto. `null` = sem DOG neste voo.
 * O valor é uma fatia do prêmio acumulado (minPct a maxPct), entre minDropDog e
 * maxDropDog e nunca acima do que há no prêmio.
 */
export function rollDrop(poolDog: number, c: DropConfig = DROPS, random: Rand = cryptoRandom): number | null {
  if (!(poolDog >= c.minPoolDog)) return null;
  if (random() >= c.dropChance) return null;
  const pct = c.minPct + random() * (c.maxPct - c.minPct);
  const amount = Math.floor(Math.min(c.maxDropDog, poolDog, Math.max(c.minDropDog, poolDog * pct)));
  return amount >= c.minDropDog ? amount : null;
}

/** Ponto do voo (fração do percurso) em que a moeda de DOG aparece. */
export const dropPoint = (random: Rand = cryptoRandom) => 0.3 + random() * 0.45;
