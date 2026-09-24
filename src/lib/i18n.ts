/**
 * Idiomas do jogo: inglês (padrão), português e espanhol.
 *
 * O idioma é lido uma vez ao carregar a página, então os dados do jogo (rotas,
 * conquistas, loja…) podem ser traduzidos já na definição. Trocar de idioma
 * salva a escolha e recarrega a página.
 *
 * Os textos ficam junto do código: `L({ en: 'Launch', pt: 'Lançar', es: 'Lanzar' })`.
 * O tipo exige as três línguas, então nenhuma tradução fica faltando.
 */

export type Lang = 'en' | 'pt' | 'es';

export const LANGUAGES: { id: Lang; label: string; short: string }[] = [
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'pt', label: 'Português', short: 'PT' },
  { id: 'es', label: 'Español', short: 'ES' },
];

const KEY = 'dogcity_lang';
const isLang = (v: unknown): v is Lang => v === 'en' || v === 'pt' || v === 'es';

function readLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (isLang(saved)) return saved;
  } catch {
    // navegador sem localStorage: fica no padrão
  }
  return 'en';
}

export const lang: Lang = readLang();

/** Locale para datas e números. */
export const locale = { en: 'en-US', pt: 'pt-BR', es: 'es-ES' }[lang];

export type Tr = Record<Lang, string>;

/** Texto no idioma atual. */
export const L = (t: Tr): string => t[lang];

/** Número formatado no idioma atual (1,234 / 1.234). */
export const fmtNumber = (n: number, opts?: Intl.NumberFormatOptions) => n.toLocaleString(locale, opts);

/** Salva o idioma e recarrega o jogo nele. */
export function setLang(next: Lang) {
  if (next === lang) return;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    return;
  }
  location.reload();
}

if (typeof document !== 'undefined') document.documentElement.lang = { en: 'en', pt: 'pt-BR', es: 'es' }[lang];
