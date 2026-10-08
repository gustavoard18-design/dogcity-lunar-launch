import { useState } from 'react';
import { isOldHost, primaryUrlHere } from '../lib/hosting';
import { L } from '../lib/i18n';

/** Aviso no endereço antigo (GitHub Pages) para quem já tem progresso salvo aqui. */
export default function MovedBanner() {
  const [hidden, setHidden] = useState(false);
  if (!isOldHost() || hidden) return null;
  return (
    <div className="relative z-40 bg-amber-400/95 text-[#1a1203] px-4 py-2 text-xs sm:text-sm">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="flex-1 min-w-[14rem]">
          <b>{L({ en: 'DogCity moved!', pt: 'O DogCity mudou de endereço!', es: '¡DogCity cambió de dirección!' })}</b>{' '}
          {L({
            en: 'With a verified wallet your progress comes along (cloud save). Guest progress stays only in this address.',
            pt: 'Com carteira verificada, seu progresso vai junto (nuvem). O progresso de convidado fica só neste endereço.',
            es: 'Con billetera verificada, tu progreso te acompaña (nube). El progreso de invitado queda solo en esta dirección.',
          })}
        </span>
        <a href={primaryUrlHere()} className="rounded-lg bg-[#1a1203] text-amber-200 font-semibold px-3 py-1.5 whitespace-nowrap">
          {L({ en: 'Go to the new address', pt: 'Ir para o novo endereço', es: 'Ir a la nueva dirección' })} →
        </a>
        <button onClick={() => setHidden(true)} className="underline underline-offset-2 opacity-70 hover:opacity-100">
          {L({ en: 'Stay here', pt: 'Ficar aqui', es: 'Quedarme aquí' })}
        </button>
      </div>
    </div>
  );
}
