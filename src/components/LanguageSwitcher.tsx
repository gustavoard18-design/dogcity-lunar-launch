import { useEffect, useRef, useState } from 'react';
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
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora ou com Esc.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const change = (next: Lang) => {
    setOpen(false);
    if (next === lang) return;
    try {
      if (resume) sessionStorage.setItem(RESUME_KEY, JSON.stringify(resume));
    } catch {
      // sem sessionStorage: volta para a tela inicial
    }
    setLang(next);
  };

  const label = L({ en: 'Language', pt: 'Idioma', es: 'Idioma' });
  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        title={label}
        className="btn-ghost inline-flex items-center gap-1 px-2.5 py-1.5 text-xs"
      >
        <GlobeIcon />
        <span className="font-semibold">{LANGUAGES.find(l => l.id === lang)?.short}</span>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={label}
          className="absolute right-0 top-full mt-2 z-50 min-w-[10rem] overflow-hidden rounded-xl border border-sky-300/40 bg-[#0b1733] shadow-[0_12px_32px_rgba(0,0,0,0.6)] py-1"
        >
          {LANGUAGES.map(l => {
            const active = l.id === lang;
            return (
              <li key={l.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => change(l.id)}
                  className={`w-full flex items-center justify-between gap-3 px-3.5 py-2 text-sm text-left transition-colors ${
                    active ? 'bg-sky-500/25 text-white font-semibold' : 'text-slate-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{l.label}</span>
                  <span className={`text-[11px] font-bold ${active ? 'text-sky-200' : 'text-slate-400'}`}>{active ? '✓' : l.short}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
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
