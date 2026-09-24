// Regras dos baús usadas pela Edge Function `chests` (e testadas no jogo).
import config from './chests.json' with { type: 'json' };

export type Chest = (typeof config.chests)[number];

// Pedido não pago segura a vaga por 24 h.
export const PENDING_HOLD_MS = 24 * 60 * 60 * 1000;
// A transação pode ter sido feita até 1 h antes do pedido (relógios, pedido refeito).
export const TX_GRACE_MS = 60 * 60 * 1000;
// Brasília (UTC-3, sem horário de verão): o dia e a semana do limite viram no horário local de lá.
export const TZ_MS = 3 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;


export function windowStarts(now = Date.now()) {
  const local = now - TZ_MS;
  const dayStart = Math.floor(local / DAY_MS) * DAY_MS + TZ_MS;
  const weekday = (new Date(local).getUTCDay() + 6) % 7; // segunda = 0
  const weekStart = dayStart - weekday * DAY_MS;
  return { dayStart, weekStart };
}

/** Pedidos que ocupam vaga: pagos, ou abertos há menos de 24 h. */
export const countsForLimit = (o: { status: string; created_at: string }, now = Date.now()) =>
  o.status === 'paid' || (o.status === 'pending' && now - new Date(o.created_at).getTime() < PENDING_HOLD_MS);

/** Sorteio com pesos, com números aleatórios criptográficos. */
export function roll(chest: Chest, random: () => number = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32) {
  const total = chest.outcomes.reduce((s, o) => s + o.weight, 0);
  const r = random() * total;
  let acc = 0;
  for (const o of chest.outcomes) {
    acc += o.weight;
    if (r < acc) return { stardust: o.stardust, lunarDust: o.lunarDust };
  }
  const last = chest.outcomes[chest.outcomes.length - 1];
  return { stardust: last.stardust, lunarDust: last.lunarDust };
}

/** Confere se a transação paga o pedido. Devolve o motivo quando não paga. */
export function checkPayment(tx: any, order: { address: string; price_dog: number; created_at: string }, treasury: string = config.treasury): string | null {
  if (!tx || typeof tx !== 'object') return 'transação inválida';
  if (!(Number(tx.block_height) > 0)) return 'aguardando confirmação';
  const senders: any[] = Array.isArray(tx.senders) ? tx.senders : [];
  const receivers: any[] = Array.isArray(tx.receivers) ? tx.receivers : [];
  const from = order.address.toLowerCase();
  if (!senders.some(s => String(s?.address ?? '').toLowerCase() === from)) return 'a transação não saiu da carteira do pedido';
  const paid = receivers
    .filter(r => String(r?.address ?? '').toLowerCase() === treasury.toLowerCase() && !r?.is_change)
    .reduce((sum, r) => sum + Number(r?.amount_dog ?? 0), 0);
  if (paid + 1e-9 < Number(order.price_dog)) return `valor abaixo do preço (${paid} de ${order.price_dog} DOG)`;
  const when = tx.timestamp ? new Date(typeof tx.timestamp === 'number' && tx.timestamp < 1e12 ? tx.timestamp * 1000 : tx.timestamp).getTime() : NaN;
  if (Number.isFinite(when) && when < new Date(order.created_at).getTime() - TX_GRACE_MS) return 'transação anterior ao pedido';
  return null;
}

