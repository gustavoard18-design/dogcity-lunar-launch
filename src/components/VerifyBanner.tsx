import { L } from '../lib/i18n';

/** Carteira conectada sem assinatura: sem ranking, baús nem progresso na nuvem até verificar. */
export default function VerifyBanner({ busy, onVerify }: { busy: boolean; onVerify(): void }) {
  return (
    <div className="mb-4 rounded-2xl border border-amber-300/50 bg-amber-400/10 px-4 py-3 flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[14rem] text-xs text-slate-200">
        <div className="font-semibold text-white text-sm mb-0.5">🔏 {L({ en: 'Verify your wallet', pt: 'Verifique sua carteira', es: 'Verifica tu billetera' })}</div>
        {L({
          en: 'Sign a free message (it moves no funds) to enter the rankings, buy chests and save your progress in the cloud.',
          pt: 'Assine uma mensagem grátis (não move fundos) para entrar no ranking, comprar baús e salvar seu progresso na nuvem.',
          es: 'Firma un mensaje gratis (no mueve fondos) para entrar al ranking, comprar cofres y guardar tu progreso en la nube.',
        })}
      </div>
      <button onClick={onVerify} disabled={busy} className="btn-primary px-4 py-2 text-xs disabled:opacity-50">
        {busy ? L({ en: 'Waiting for the wallet…', pt: 'Aguardando a carteira…', es: 'Esperando la billetera…' }) : L({ en: 'Sign message', pt: 'Assinar mensagem', es: 'Firmar mensaje' })}
      </button>
    </div>
  );
}
