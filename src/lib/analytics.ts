import { lang } from './i18n';
import { rpc, submitEnabled } from './online';

/**
 * Métricas anônimas de uso: um id aleatório por navegador (nunca o endereço da
 * carteira) e o nome do evento. Só o jogo publicado envia; em `npm run dev` os
 * eventos aparecem no console. Falhas são ignoradas: métrica nunca atrapalha o jogo.
 */

export type AnalyticsEvent =
  | 'app_open'
  | 'wallet_verified'
  | 'first_flight'
  | 'flight_start'
  | 'flight_complete'
  | 'flight_lost'
  | 'flight_aborted'
  | 'tutorial_skip'
  | 'share'
  | 'challenge_created'
  | 'challenge_opened'
  | 'challenge_accepted'
  | 'challenge_result'
  | 'wallet_connect'
  | 'streak_claim'
  | 'season_tier'
  | 'chest_open';

const KEY = 'dogcity_install_id';

function installId(): string | null {
  try {
    let id = localStorage.getItem(KEY);
    if (!id || !/^[a-z0-9]{16,40}$/.test(id)) {
      const bytes = crypto.getRandomValues(new Uint8Array(12));
      id = Array.from(bytes, b => b.toString(36).padStart(2, '0')).join('').slice(0, 24);
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

type Props = Record<string, string | number | boolean | null>;

export function track(event: AnalyticsEvent, props: Props = {}): void {
  const payload = { lang, ...props };
  if (!submitEnabled) {
    if (import.meta.env.DEV) console.debug('[métrica]', event, payload);
    return;
  }
  const id = installId();
  if (!id) return;
  void rpc('track_event', { p_install: id, p_event: event, p_props: payload }, 5000).catch(() => {});
}
