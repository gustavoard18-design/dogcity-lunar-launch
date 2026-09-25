import { useEffect, useState } from 'react';
import { DROP_RULES, type JackpotInfo, fetchJackpot } from '../lib/drops';
import { L, fmtNumber } from '../lib/i18n';

const statusText = (s: string) =>
  s === 'paid'
    ? L({ en: 'paid', pt: 'pago', es: 'pagado' })
    : s === 'cancelled'
      ? L({ en: 'cancelled', pt: 'cancelado', es: 'cancelado' })
      : L({ en: 'to be sent', pt: 'a enviar', es: 'por enviar' });

/**
 * Prêmio acumulado: metade do valor dos baús pagos volta para os jogadores
 * como moedas de DOG que aparecem raramente durante o voo.
 */
export default function JackpotPanel({ address, verified, refreshKey }: { address: string; verified: boolean; refreshKey: number }) {
  const [info, setInfo] = useState<JackpotInfo | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchJackpot(verified ? address : undefined).then(r => {
      if (!alive) return;
      setInfo(r);
      setFailed(!r);
    });
    return () => {
      alive = false;
    };
  }, [address, verified, refreshKey]);

  const share = Math.round(DROP_RULES.poolShare * 100);
  const odds = Math.round(1 / DROP_RULES.dropChance);

  return (
    <div className="panel mb-4 border-amber-300/40">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-lg text-white">💰 {L({ en: 'DOG Jackpot', pt: 'Prêmio acumulado', es: 'Bote DOG' })}</h3>
        <span className="font-display text-2xl text-amber-300">{info ? `${fmtNumber(Math.floor(info.poolDog))} DOG` : failed ? '—' : '…'}</span>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">
        {L({
          en: `${share}% of every chest sold goes into the jackpot. During flights, a DOG coin can show up (about 1 in ${odds} flights, verified wallets only). Grab it and the DOG is yours: it is sent from the treasury to your wallet.`,
          pt: `${share}% de cada baú vendido vai para o prêmio acumulado. Durante o voo pode aparecer uma moeda de DOG (cerca de 1 em ${odds} voos, só carteiras verificadas). Pegue a moeda e o DOG é seu: ele é enviado da tesouraria para a sua carteira.`,
          es: `El ${share}% de cada cofre vendido va al bote. Durante el vuelo puede aparecer una moneda de DOG (cerca de 1 de cada ${odds} vuelos, solo billeteras verificadas). Atrápala y el DOG es tuyo: se envía desde la tesorería a tu billetera.`,
        })}{' '}
        {L({
          en: `Max ${DROP_RULES.dropsPerWalletPerWeek} coin per wallet per week; only the first ${DROP_RULES.eligibleFlightsPerDay} flights of the day count. No purchase needed.`,
          pt: `Máximo de ${DROP_RULES.dropsPerWalletPerWeek} moeda por carteira por semana; só os primeiros ${DROP_RULES.eligibleFlightsPerDay} voos do dia concorrem. Não precisa comprar nada.`,
          es: `Máximo ${DROP_RULES.dropsPerWalletPerWeek} moneda por billetera por semana; solo cuentan los primeros ${DROP_RULES.eligibleFlightsPerDay} vuelos del día. No hace falta comprar nada.`,
        })}
      </p>

      {info && info.mine.length > 0 && (
        <div className="mt-3 rounded-xl border border-amber-300/40 bg-amber-400/10 px-3 py-2 text-xs text-slate-200">
          <div className="font-semibold text-white mb-1">{L({ en: 'Your DOG coins', pt: 'Suas moedas de DOG', es: 'Tus monedas de DOG' })}</div>
          {info.mine.map(d => (
            <div key={d.id} className="flex items-center justify-between gap-2 py-0.5">
              <span className="text-amber-300 font-semibold">+{fmtNumber(Number(d.amount_dog))} DOG</span>
              <span className="text-slate-400">
                {d.status === 'paid' && d.txid ? (
                  <a href={`https://mempool.space/tx/${d.txid}`} target="_blank" rel="noreferrer" className="underline text-emerald-300">
                    {statusText(d.status)} ↗
                  </a>
                ) : (
                  statusText(d.status)
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {info && info.recent.length > 0 && (
        <div className="mt-3 text-[11px] text-slate-400">
          <div className="text-slate-300 mb-1">{L({ en: 'Latest winners', pt: 'Últimos ganhadores', es: 'Últimos ganadores' })}</div>
          {info.recent.slice(0, 5).map((r, i) => (
            <div key={i} className="flex justify-between gap-2">
              <span className="font-mono">{r.address}</span>
              <span>
                <span className="text-amber-300">{fmtNumber(Number(r.amount_dog))} DOG</span> · {statusText(r.status)}
              </span>
            </div>
          ))}
        </div>
      )}
      {info && info.paidDog > 0 && (
        <div className="mt-2 text-[10px] text-slate-500">
          {L({ en: 'Already paid to players', pt: 'Já pago aos jogadores', es: 'Ya pagado a los jugadores' })}: {fmtNumber(Math.floor(info.paidDog))} DOG
        </div>
      )}
    </div>
  );
}
