/**
 * Endereço principal do jogo (Vercel). O GitHub Pages continua no ar só para a
 * mudança: quem chega lá sem progresso salvo vai direto para a Vercel; quem já
 * jogava lá vê um aviso (o progresso de convidado fica preso ao endereço, e o
 * de carteira verificada volta pela nuvem no endereço novo).
 */
export const PRIMARY_SITE_URL = 'https://dogcity-lunar-launch.vercel.app/';

export const isOldHost = () => typeof location !== 'undefined' && location.hostname.endsWith('github.io');

function hasLocalProgress(): boolean {
  try {
    const all = JSON.parse(localStorage.getItem('dogcity_game_state') ?? '{}');
    return !!all && typeof all === 'object' && Object.keys(all).length > 0;
  } catch {
    return false;
  }
}

/** Endereço novo, mantendo o link de desafio (?c=…). */
export const primaryUrlHere = () => `${PRIMARY_SITE_URL}${location.search}${location.hash}`;

/** No GitHub Pages, sem progresso salvo: vai para a Vercel. Devolve true se redirecionou. */
export function redirectNewVisitors(): boolean {
  if (!isOldHost() || hasLocalProgress()) return false;
  location.replace(primaryUrlHere());
  return true;
}
