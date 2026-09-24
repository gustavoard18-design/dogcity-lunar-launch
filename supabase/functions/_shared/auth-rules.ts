// Regras da sessão assinada, usadas pela Edge Function `auth` e pelo jogo.

/** Carteira verificada: 30 dias. Convidado: 1 ano (o endereço só existe neste navegador). */
export const WALLET_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
export const GUEST_SESSION_MS = 365 * 24 * 60 * 60 * 1000;
/** A mensagem assinada vale por 10 minutos (e até 2 minutos no futuro, por causa de relógios). */
export const MESSAGE_MAX_AGE_MS = 10 * 60 * 1000;
export const MESSAGE_MAX_SKEW_MS = 2 * 60 * 1000;

const HEADER = 'DogCity Lunar Launch - sign in';
const NOTE = 'This proves you own this wallet. It does not move funds or cost any fee.';

/** Mensagem que a carteira assina (sempre em inglês e ASCII: o servidor confere o texto exato). */
export function signInMessage(address: string, issuedAt: string): string {
  return `${HEADER}\n${NOTE}\nAddress: ${address}\nIssued: ${issuedAt}`;
}

/** Confere o formato e a validade da mensagem. Devolve o problema ou null se estiver ok. */
export function checkSignInMessage(message: string, address: string, now = Date.now()): string | null {
  const m = /^Issued: (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)$/m.exec(message);
  if (!m) return 'mensagem inválida';
  if (message !== signInMessage(address, m[1])) return 'mensagem inválida';
  const issued = Date.parse(m[1]);
  if (!Number.isFinite(issued) || issued > now + MESSAGE_MAX_SKEW_MS) return 'mensagem inválida';
  if (now - issued > MESSAGE_MAX_AGE_MS) return 'mensagem vencida';
  return null;
}

/** Endereço gerado para convidado: formato de bc1q, sem ser um endereço Bitcoin válido. */
export const GUEST_ADDRESS_RE = /^bc1q[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{38}$/;
export const ADDRESS_RE = /^(bc1[a-z0-9]{25,90}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/;
export const TOKEN_RE = /^[A-Za-z0-9_-]{32,128}$/;
