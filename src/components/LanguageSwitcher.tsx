import { LANGUAGES, L, lang, setLang, type Lang } from '../lib/i18n';

const RESUME_KEY = 'dogcity_resume';

/** Piloto a reabrir depois de recarregar para trocar o idioma (uma vez só). */
export function takeResume(): { address: string; provider: string } | null {
  try {
    const raw = sessionStorage.getItem(RESUME_KEY);
    sessionStorage.removeItem(RESUME_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Seletor de idioma (EN / PT / ES). Trocar recarrega o jogo no idioma escolhido;
 * com `resume`, o hangar reabre no mesmo piloto.
 */
export default function LanguageSwitcher({ className = '', resume }: { className?: string; resume?: { address: string; provider: string } }) {
  const change = (next: Lang) => {
    try {
      if (resume) sessionStorage.setItem(RESUME_KEY, JSON.stringify(resume));
    } catch {
      // sem sessionStorage: volta para a tela inicial
    }
    setLang(next);
  };
  return (
    <label className={`btn-ghost relative inline-flex items-center gap-1 px-2.5 py-1.5 text-xs cursor-pointer ${className}`}>
      <GlobeIcon />
      <span className="font-semibold">{LANGUAGES.find(l => l.id === lang)?.short}</span>
      <select
        value={lang}
        onChange={e => change(e.target.value as Lang)}
        aria-label={L({ en: 'Language', pt: 'Idioma', es: 'Idioma' })}
        title={L({ en: 'Language', pt: 'Idioma', es: 'Idioma' })}
        className="absolute inset-0 opacity-0 cursor-pointer"
      >
        {LANGUAGES.map(l => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
    </svg>
  );
}
