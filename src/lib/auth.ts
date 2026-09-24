import { MessageSigningProtocols, RpcErrorCode, getProviders, request } from '@sats-connect/core';
import { GUEST_SESSION_MS, TOKEN_RE, signInMessage } from '../../supabase/functions/_shared/auth-rules.ts';
import { GUEST_PROVIDER } from './storage';
import { L } from './i18n';

/**
 * Sessão do jogador no servidor. A carteira assina uma mensagem de login
 * (BIP-322, não move fundos nem cobra taxa) e a Edge Function `auth` devolve um
 * token: com ele o servidor sabe que a pontuação, os pedidos de baú e o
 * progresso salvo são do dono da carteira. Convidados recebem um token sem
 * assinatura, preso ao endereço de convidado deste navegador.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://uknupldacjxbuoiaucfc.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_Mf-IQjrI81gzUgBZsodOyg_TmnTaWDR';
const KEY = 'dogcity_sessions';

export interface WalletSession {
  token: string;
  kind: 'wallet' | 'guest';
  expiresAt: string;
}

type Store = Record<string, WalletSession>;

function readStore(): Store {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // sem armazenamento: a sessão vale só enquanto a página estiver aberta
  }
}

const memory: Store = {};

/** Sessão válida guardada para o endereço (ou null). */
export function getSession(address: string): WalletSession | null {
  const s = memory[address] ?? readStore()[address];
  if (!s || !TOKEN_RE.test(s.token) || Date.parse(s.expiresAt) <= Date.now()) return null;
  return s;
}

function storeSession(address: string, session: WalletSession) {
  memory[address] = session;
  const store = readStore();
  store[address] = session;
  writeStore(store);
  window.dispatchEvent(new CustomEvent('dogcity:session', { detail: { address } }));
}

/** Esquece a sessão (o servidor disse que ela não vale mais). */
export function dropSession(address: string) {
  delete memory[address];
  const store = readStore();
  if (store[address]) {
    delete store[address];
    writeStore(store);
  }
  window.dispatchEvent(new CustomEvent('dogcity:session', { detail: { address } }));
}

/** O servidor recusou o token (vencido, apagado ou de outra carteira). */
export const isSessionError = (e: unknown) => /sessão inválida|sess.o inv.lida/i.test(String(e));

export type AuthResult = { ok: true; session: WalletSession } | { ok: false; reason: 'rejected' | 'unsupported' | 'offline' | 'invalid' };

async function callAuth(body: Record<string, unknown>): Promise<AuthResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/auth`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const data = (await res.json().catch(() => ({}))) as { token?: string; kind?: 'wallet' | 'guest'; expiresAt?: string };
    if (res.ok && data.token && TOKEN_RE.test(data.token) && data.expiresAt) {
      return { ok: true, session: { token: data.token, kind: data.kind === 'guest' ? 'guest' : 'wallet', expiresAt: data.expiresAt } };
    }
    return { ok: false, reason: res.status === 401 || res.status === 400 ? 'invalid' : 'offline' };
  } catch {
    return { ok: false, reason: 'offline' };
  } finally {
    clearTimeout(timer);
  }
}

// ── Assinatura por carteira ──────────────────────────────────────────────────

interface KraySigner {
  signMessage?(message: string, type?: string): Promise<unknown>;
}
interface OkxSigner {
  signMessage?(message: string, type?: string): Promise<unknown>;
}

class SignError extends Error {
  constructor(public reason: 'rejected' | 'unsupported') {
    super(reason);
  }
}

const signatureOf = (r: unknown): string => {
  if (typeof r === 'string') return r;
  if (r && typeof r === 'object') {
    const o = r as { signature?: unknown; result?: { signature?: unknown }; data?: unknown };
    if (typeof o.signature === 'string') return o.signature;
    if (typeof o.result?.signature === 'string') return o.result.signature;
    if (typeof o.data === 'string') return o.data;
  }
  return '';
};

const isUserRejection = (e: unknown) => {
  const o = e as { code?: number; message?: string };
  return o?.code === 4001 || o?.code === RpcErrorCode.USER_REJECTION || /reject|denied|cancel|declin/i.test(String(o?.message ?? e));
};

function satsProviderId(keyword: string) {
  try {
    return getProviders().find(p => `${p.id} ${p.name}`.toLowerCase().includes(keyword))?.id;
  } catch {
    return undefined;
  }
}

async function signSatsConnect(keyword: string, address: string, message: string): Promise<string> {
  const res = await request('signMessage', { address, message, protocol: MessageSigningProtocols.BIP322 }, satsProviderId(keyword));
  if (res.status === 'success') return res.result.signature;
  if (res.error.code === RpcErrorCode.USER_REJECTION) throw new SignError('rejected');
  throw new SignError('unsupported');
}

async function signWith(provider: string, address: string, message: string): Promise<string> {
  const p = provider.toLowerCase();
  try {
    if (p.includes('xverse')) return await signSatsConnect('xverse', address, message);
    if (p.includes('okx')) {
      const own = (window.okxwallet?.bitcoin ?? {}) as OkxSigner;
      if (own.signMessage) return signatureOf(await own.signMessage(message, 'bip322-simple'));
      return await signSatsConnect('okx', address, message);
    }
    if (p.includes('kray')) {
      const kray = (window.krayWallet ?? {}) as KraySigner;
      if (!kray.signMessage) throw new SignError('unsupported');
      return signatureOf(await kray.signMessage(message, 'bip322-simple'));
    }
  } catch (e) {
    if (e instanceof SignError) throw e;
    throw new SignError(isUserRejection(e) ? 'rejected' : 'unsupported');
  }
  throw new SignError('unsupported');
}

/** Pede a assinatura de login na carteira e abre a sessão no servidor. */
export async function verifyWallet(address: string, provider: string): Promise<AuthResult> {
  const message = signInMessage(address, new Date().toISOString());
  let signature = '';
  try {
    signature = (await signWith(provider, address, message)).trim();
  } catch (e) {
    return { ok: false, reason: e instanceof SignError ? e.reason : 'unsupported' };
  }
  if (!signature) return { ok: false, reason: 'unsupported' };
  const r = await callAuth({ kind: 'wallet', address, message, signature });
  if (r.ok) storeSession(address, r.session);
  return r;
}

/** Sessão de convidado (sem assinatura). Reaproveita a guardada enquanto valer. */
export async function ensureGuestSession(address: string): Promise<WalletSession | null> {
  const current = getSession(address);
  if (current && Date.parse(current.expiresAt) - Date.now() > GUEST_SESSION_MS / 12) return current;
  const r = await callAuth({ kind: 'guest', address });
  if (!r.ok) return current;
  storeSession(address, r.session);
  return r.session;
}

/** Token para enviar ao servidor: convidado cria na hora; carteira precisa estar verificada. */
export async function sessionToken(address: string, provider: string): Promise<string | null> {
  if (provider === GUEST_PROVIDER) return (await ensureGuestSession(address))?.token ?? null;
  return getSession(address)?.token ?? null;
}

export function authErrorText(reason: Exclude<AuthResult, { ok: true }>['reason']): string {
  switch (reason) {
    case 'rejected':
      return L({ en: 'Signature cancelled in the wallet.', pt: 'Assinatura cancelada na carteira.', es: 'Firma cancelada en la billetera.' });
    case 'unsupported':
      return L({
        en: 'This wallet could not sign the message. Update it or try Xverse / OKX.',
        pt: 'Esta carteira não conseguiu assinar a mensagem. Atualize-a ou tente a Xverse / OKX.',
        es: 'Esta billetera no pudo firmar el mensaje. Actualízala o prueba Xverse / OKX.',
      });
    case 'invalid':
      return L({ en: 'The signature was not accepted. Try again.', pt: 'A assinatura não foi aceita. Tente de novo.', es: 'La firma no fue aceptada. Inténtalo de nuevo.' });
    default:
      return L({ en: 'Could not reach the server. Try again soon.', pt: 'Não deu para falar com o servidor. Tente de novo em instantes.', es: 'No se pudo contactar el servidor. Inténtalo en un momento.' });
  }
}
