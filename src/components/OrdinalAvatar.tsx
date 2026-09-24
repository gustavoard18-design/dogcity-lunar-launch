import { useState } from 'react';
import { inscriptionImageUrls } from '../lib/dogdata';
import { L } from '../lib/i18n';

/**
 * Avatar Ordinal (foto escolhida no perfil DogData). Tenta ordinals.com e depois
 * a cópia da UniSat; se nenhuma carregar, não mostra nada. Dentro de <img> uma
 * inscrição não executa código, mesmo sendo SVG.
 */
export default function OrdinalAvatar({ id, size = 32, className = '' }: { id: string; size?: number; className?: string }) {
  const urls = inscriptionImageUrls(id);
  const [attempt, setAttempt] = useState(0);
  if (attempt >= urls.length) return null;
  return (
    <img
      src={urls[attempt]}
      alt={L({ en: 'DogData avatar (Ordinal)', pt: 'Avatar DogData (Ordinal)', es: 'Avatar DogData (Ordinal)' })}
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      draggable={false}
      onError={() => setAttempt(a => a + 1)}
      className={`shrink-0 rounded-full object-cover bg-black/40 [image-rendering:pixelated] ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
