import { useState } from 'react';
import type { PlayerProfile } from '../types';
import { CHESTS, CHEST_LIMITS, CHEST_TREASURY, type ChestStatus, chestName, chestOdds, getChest, isTxid } from '../lib/chests';
import { GUEST_PROVIDER } from '../lib/storage';
import { L, fmtNumber } from '../lib/i18n';
import { LunarDust, Stardust } from './GameIcon';
import LegalLinks, { supportUrl } from './LegalLinks';

interface ChestShopProps {
  profile: PlayerProfile;
  status: ChestStatus | null;
  busy: boolean;
  /** Carteira assinada (sessão no servidor): exigida para comprar. */
  verified: boolean;
  verifying: boolean;
  onVerify(): void;
  onOrder(chestId: string): void;
  onPayXverse(): void;
  onSubmitTxid(txid: string): void;
  onCancel(): void;
}

const CHEST_ICON: Record<string, string> = { supply: '📦', orbital: '🛰️', legendary: '👑' };

/** Loja de baús pagos com DOG: chances publicadas, limite por carteira e o passo a passo do pagamento. */
export default function ChestShop({ profile, status, busy, verified, verifying, onVerify, onOrder, onPayXverse, onSubmitTxid, onCancel }: ChestShopProps) {
  const guest = profile.provider === GUEST_PROVIDER;
  const pending = profile.chestPending;
  const usedToday = status?.limits.usedToday ?? 0;
  const usedWeek = status?.limits.usedThisWeek ?? 0;
  const limitReached = usedToday >= CHEST_LIMITS.perDay || usedWeek >= CHEST_LIMITS.perWeek;

  return (
    <div className="panel mb-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h3 className="font-display text-lg text-white">🎁 {L({ en: 'DOG Chests', pt: 'Baús DOG', es: 'Cofres DOG' })}</h3>
        <span className="text-[11px] text-slate-400">
          {L({ en: 'Limit', pt: 'Limite', es: 'Límite' })}: {usedToday}/{CHEST_LIMITS.perDay} {L({ en: 'today', pt: 'hoje', es: 'hoy' })} · {usedWeek}/{CHEST_LIMITS.perWeek}{' '}
          {L({ en: 'this week', pt: 'na semana', es: 'esta semana' })}
        </span>
      </div>
      <p className="text-[11px] text-slate-500 mb-3">
        {L({
          en: 'Paid in DOG. Each chest gives Stardust and Lunar Dust for Workshop upgrades, drawn with the odds shown below. The limit keeps flying the main way to progress.',
          pt: 'Pagos em DOG. Cada baú dá Stardust e Pó Lunar para os upgrades da Oficina, sorteados com as chances abaixo. O limite mantém o voo como o caminho principal para evoluir.',
          es: 'Se pagan en DOG. Cada cofre da Stardust y Polvo Lunar para las mejoras del Taller, sorteados con las probabilidades de abajo. El límite mantiene el vuelo como el camino principal para progresar.',
        })}
      </p>

      {guest ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-xs text-slate-300">
          {L({
            en: 'Connect a Bitcoin wallet (Xverse, OKX or Kray) to buy chests with DOG.',
            pt: 'Conecte uma carteira Bitcoin (Xverse, OKX ou Kray) para comprar baús com DOG.',
            es: 'Conecta una billetera Bitcoin (Xverse, OKX o Kray) para comprar cofres con DOG.',
          })}
        </div>
      ) : !verified ? (
        <div className="rounded-xl border border-amber-300/40 bg-amber-400/10 px-3 py-3 text-xs text-slate-200 flex flex-wrap items-center gap-2">
          <span className="flex-1 min-w-[12rem]">
            {L({
              en: 'Sign a free message with your wallet to buy chests (only you can order for your address).',
              pt: 'Assine uma mensagem grátis com a carteira para comprar baús (só você faz pedidos para o seu endereço).',
              es: 'Firma un mensaje gratis con tu billetera para comprar cofres (solo tú haces pedidos para tu dirección).',
            })}
          </span>
          <button onClick={onVerify} disabled={verifying} className="btn-primary px-3 py-1.5 text-[11px] disabled:opacity-50">
            {verifying ? L({ en: 'Waiting…', pt: 'Aguardando…', es: 'Esperando…' }) : L({ en: 'Sign message', pt: 'Assinar mensagem', es: 'Firmar mensaje' })}
          </button>
        </div>
      ) : pending ? (
        <PendingOrder profile={profile} busy={busy} onPayXverse={onPayXverse} onSubmitTxid={onSubmitTxid} onCancel={onCancel} />
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
        {CHESTS.map(chest => (
          <div key={chest.id} className="rounded-2xl border border-amber-300/25 bg-gradient-to-b from-amber-500/10 to-transparent p-3 flex flex-col">
            <div className="text-3xl text-center">{CHEST_ICON[chest.id] ?? '🎁'}</div>
            <div className="text-center text-white text-sm font-semibold mt-1">{chestName(chest.id)}</div>
            <div className="text-center font-display text-amber-300 mt-0.5">{fmtNumber(chest.priceDog)} DOG</div>
            <table className="mt-2 w-full text-[10px] text-slate-300">
              <tbody>
                {chestOdds(chest).map((o, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="py-0.5 text-amber-200">
                      <Stardust value={o.stardust} size="1em" />
                    </td>
                    <td className="py-0.5 text-violet-300">{o.lunarDust > 0 && <LunarDust value={o.lunarDust} size="1em" sign="+" />}</td>
                    <td className="py-0.5 text-right text-slate-400">{fmtNumber(o.percent, { maximumFractionDigits: 1 })}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={() => onOrder(chest.id)}
              disabled={guest || !verified || busy || !!pending || limitReached}
              className="btn-primary mt-auto pt-2 py-2 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {L({ en: 'Buy', pt: 'Comprar', es: 'Comprar' })}
            </button>
          </div>
        ))}
      </div>

      {limitReached && !guest && (
        <p className="mt-2 text-[11px] text-amber-200/80">
          {L({
            en: 'Chest limit reached. Come back tomorrow (or next week).',
            pt: 'Limite de baús atingido. Volte amanhã (ou na próxima semana).',
            es: 'Límite de cofres alcanzado. Vuelve mañana (o la próxima semana).',
          })}
        </p>
      )}
      <p className="mt-2 text-[10px] text-slate-600">
        {L({
          en: 'Payments go to the game treasury and are checked on-chain (DogData). The chest opens after the transaction is confirmed in a block. Buying is optional: everything in the game can also be earned by flying.',
          pt: 'Os pagamentos vão para a tesouraria do jogo e são conferidos on-chain (DogData). O baú abre depois que a transação é confirmada num bloco. Comprar é opcional: tudo no jogo também pode ser conquistado voando.',
          es: 'Los pagos van a la tesorería del juego y se verifican on-chain (DogData). El cofre se abre cuando la transacción se confirma en un bloque. Comprar es opcional: todo en el juego también se puede ganar volando.',
        })}{' '}
        <span className="font-mono break-all">{CHEST_TREASURY}</span>
      </p>
      <p className="mt-1 text-[10px] text-slate-500">
        {L({ en: 'Chest did not open after 2 hours?', pt: 'O baú não abriu depois de 2 horas?', es: '¿El cofre no se abrió después de 2 horas?' })}{' '}
        <a href={supportUrl(pending ? `Chest ${pending.orderId} txid ${pending.txid ?? '-'}` : undefined)} target="_blank" rel="noreferrer" className="underline hover:text-slate-300">
          {L({ en: 'Contact support', pt: 'Fale com o suporte', es: 'Contacta al soporte' })}
        </a>
        {' · '}
        <LegalLinks inline />
      </p>
    </div>
  );
}

/** Pedido aberto: pagar (Xverse ou manual com txid), aguardar a confirmação ou cancelar. */
function PendingOrder({ profile, busy, onPayXverse, onSubmitTxid, onCancel }: Pick<ChestShopProps, 'profile' | 'busy' | 'onPayXverse' | 'onSubmitTxid' | 'onCancel'>) {
  const pending = profile.chestPending!;
  const [txid, setTxid] = useState('');
  const [copied, setCopied] = useState(false);
  const chest = getChest(pending.chestId);
  const xverse = profile.provider === 'Xverse';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CHEST_TREASURY);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  if (pending.txid) {
    return (
      <div className="rounded-xl border border-sky-300/40 bg-sky-500/10 px-3 py-3 text-xs text-slate-200">
        <div className="font-semibold text-white mb-1">
          ⏳ {chestName(pending.chestId)} · {L({ en: 'waiting for confirmation', pt: 'aguardando confirmação', es: 'esperando confirmación' })}
        </div>
        {L({
          en: 'Payment sent. The chest opens once the transaction is confirmed in a block (usually 10 to 30 minutes). You can keep playing: the game checks every minute.',
          pt: 'Pagamento enviado. O baú abre quando a transação for confirmada num bloco (em geral de 10 a 30 minutos). Pode continuar jogando: o jogo confere a cada minuto.',
          es: 'Pago enviado. El cofre se abre cuando la transacción se confirme en un bloque (normalmente de 10 a 30 minutos). Puedes seguir jugando: el juego revisa cada minuto.',
        })}
        <div className="mt-1 font-mono text-[10px] text-slate-400 break-all">txid {pending.txid}</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-300/50 bg-amber-400/10 px-3 py-3 text-xs text-slate-200 space-y-2">
      <div className="font-semibold text-white">
        {chestName(pending.chestId)} · {fmtNumber(pending.priceDog)} DOG
      </div>
      {xverse && (
        <button onClick={onPayXverse} disabled={busy} className="btn-primary w-full py-2.5 text-sm disabled:opacity-50">
          {busy ? L({ en: 'Waiting for the wallet…', pt: 'Aguardando a carteira…', es: 'Esperando la billetera…' }) : L({ en: `Pay ${fmtNumber(pending.priceDog)} DOG with Xverse`, pt: `Pagar ${fmtNumber(pending.priceDog)} DOG com a Xverse`, es: `Pagar ${fmtNumber(pending.priceDog)} DOG con Xverse` })}
        </button>
      )}
      <div className="text-[11px] text-slate-300">
        {xverse
          ? L({ en: 'Or send manually from this wallet:', pt: 'Ou envie manualmente desta carteira:', es: 'O envía manualmente desde esta billetera:' })
          : L({ en: 'Send from this wallet:', pt: 'Envie desta carteira:', es: 'Envía desde esta billetera:' })}{' '}
        <b className="text-amber-200">
          {fmtNumber(chest?.priceDog ?? pending.priceDog)} DOG
        </b>{' '}
        {L({ en: 'to', pt: 'para', es: 'a' })}
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 truncate rounded-lg bg-black/30 px-2 py-1 text-[10px]">{CHEST_TREASURY}</code>
        <button onClick={copy} className="btn-ghost shrink-0 px-2 py-1 text-[11px]">
          {copied ? L({ en: 'Copied', pt: 'Copiado', es: 'Copiado' }) : L({ en: 'Copy', pt: 'Copiar', es: 'Copiar' })}
        </button>
      </div>
      <form
        onSubmit={e => {
          e.preventDefault();
          if (isTxid(txid)) onSubmitTxid(txid.trim().toLowerCase());
        }}
        className="flex items-center gap-2"
      >
        <input
          value={txid}
          onChange={e => setTxid(e.target.value)}
          placeholder={L({ en: 'Paste the transaction id (txid)', pt: 'Cole o id da transação (txid)', es: 'Pega el id de la transacción (txid)' })}
          className="min-w-0 flex-1 rounded-lg bg-[#081229] border border-white/15 px-2 py-1.5 text-[11px] text-white outline-none focus:border-sky-300/60"
        />
        <button type="submit" disabled={busy || !isTxid(txid)} className="btn-primary shrink-0 px-3 py-1.5 text-[11px] disabled:opacity-40">
          {L({ en: 'Confirm', pt: 'Confirmar', es: 'Confirmar' })}
        </button>
      </form>
      <button onClick={onCancel} disabled={busy} className="text-[11px] text-slate-400 hover:text-white underline underline-offset-2">
        {L({ en: 'Cancel order (only if you have not paid)', pt: 'Cancelar pedido (só se ainda não pagou)', es: 'Cancelar pedido (solo si aún no pagaste)' })}
      </button>
    </div>
  );
}
