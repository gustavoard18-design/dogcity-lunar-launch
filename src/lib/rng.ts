/**
 * Números pseudoaleatórios com semente (mulberry32): a mesma semente dá a mesma
 * sequência. O voo usa um gerador por tipo de objeto, então a ordem em que
 * asteroides, orbes, anéis e escudos aparecem não depende da taxa de quadros.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface FlightRandom {
  hazard: () => number;
  orb: () => number;
  ring: () => number;
  shield: () => number;
}

/** Geradores do voo a partir de uma semente (um por tipo de objeto). */
export function flightRandom(seed: number): FlightRandom {
  return {
    hazard: mulberry32(seed ^ 0x9e3779b9),
    orb: mulberry32(seed ^ 0x85ebca6b),
    ring: mulberry32(seed ^ 0xc2b2ae35),
    shield: mulberry32(seed ^ 0x27d4eb2f),
  };
}

/** Semente nova para um voo (inteiro de 32 bits sem sinal). */
export function newSeed(): number {
  try {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  } catch {
    return Math.floor(Math.random() * 2 ** 32) >>> 0;
  }
}
