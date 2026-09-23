import type { LaunchOutcome, Route } from '../types';

/** Estatísticas brutas de um voo, produzidas pela simulação 3D. */
export interface FlightResult {
  crashed: boolean;
  orbs: number;
  rings: number;
  hits: number;
  hullLeft: number;
  hullMax: number;
  points: number;
  spawnedPoints: number;
  progress: number;
}

/**
 * Score final: 30% qualidade do lançamento, 50% coleta (pontos com combo sobre
 * o total gerado) e 20% casco preservado. Nave perdida vale no máximo 60% do
 * que foi feito até ali, proporcional à distância percorrida.
 */
export function computeOutcome(route: Route, launchQuality: number, perfectLaunch: boolean, r: FlightResult, aborted: boolean): LaunchOutcome {
  const flightQ = Math.min(1, r.points / Math.max(1, r.spawnedPoints * 1.6));
  const hullRatio = r.hullLeft / r.hullMax;
  let q = 0.3 * launchQuality + 0.5 * flightQ + 0.2 * hullRatio;
  if (r.crashed) q = (0.3 * launchQuality + 0.5 * flightQ) * Math.min(1, r.progress) * 0.6;
  return {
    score: Math.round(route.maxScore * Math.max(0, Math.min(1, q))),
    success: !r.crashed,
    aborted,
    launchQuality,
    perfectLaunch,
    orbs: r.orbs,
    rings: r.rings,
    hits: r.hits,
    hullLeft: r.hullLeft,
    hullMax: r.hullMax,
  };
}
