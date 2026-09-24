// Edge Function: sessão do jogador.
//
// POST { kind: 'wallet', address, message, signature }
//   Confere a assinatura BIP-322 (ou BIP-137, carteiras antigas) da mensagem de
//   login e devolve um token de sessão de 30 dias para aquela carteira.
// POST { kind: 'guest', address }
//   Convidado: o endereço é gerado no navegador e não é um endereço Bitcoin
//   válido, então ninguém consegue se passar por uma carteira real com ele.
//
// O banco guarda só o hash SHA-256 do token (tabela wallet_sessions).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { Verifier } from 'npm:bip322-js@4';
import { address as btcAddress, networks } from 'npm:bitcoinjs-lib@7';
import {
  ADDRESS_RE,
  GUEST_ADDRESS_RE,
  GUEST_SESSION_MS,
  WALLET_SESSION_MS,
  checkSignInMessage,
} from '../_shared/auth-rules.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// Sessões novas por IP por hora (evita encher o banco com convidados falsos).
const PER_IP_HOUR = { wallet: 30, guest: 20 };

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
}

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function isBitcoinAddress(a: string): boolean {
  try {
    btcAddress.toOutputScript(a, networks.bitcoin);
    return true;
  } catch {
    return false;
  }
}

function verifySignature(address: string, message: string, signature: string): boolean {
  try {
    return Verifier.verifySignature(address, message, signature);
  } catch {
    return false;
  }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'método não aceito' }, 405);
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    const body = await req.json().catch(() => ({}));
    const kind = body.kind === 'guest' ? 'guest' : body.kind === 'wallet' ? 'wallet' : null;
    const address = String(body.address ?? '').trim();
    if (!kind || !ADDRESS_RE.test(address)) return json({ error: 'pedido inválido' }, 400);

    if (kind === 'wallet') {
      const message = String(body.message ?? '');
      const signature = String(body.signature ?? '').trim();
      const problem = checkSignInMessage(message, address);
      if (problem) return json({ error: problem }, 400);
      if (!signature || signature.length > 2000 || !verifySignature(address, message, signature)) {
        return json({ error: 'assinatura inválida' }, 401);
      }
    } else if (!GUEST_ADDRESS_RE.test(address) || isBitcoinAddress(address)) {
      return json({ error: 'endereço de convidado inválido' }, 400);
    }

    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
    const ipHash = ip ? await sha256Hex(`dogcity:${ip}`) : null;
    if (ipHash) {
      const { count } = await db
        .from('wallet_sessions')
        .select('token_hash', { count: 'exact', head: true })
        .eq('ip_hash', ipHash)
        .eq('kind', kind)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());
      if ((count ?? 0) >= PER_IP_HOUR[kind]) return json({ error: 'muitas sessões, tente mais tarde' }, 429);
    }

    const token = newToken();
    const expiresAt = new Date(Date.now() + (kind === 'wallet' ? WALLET_SESSION_MS : GUEST_SESSION_MS)).toISOString();
    const { error } = await db.from('wallet_sessions').insert({ token_hash: await sha256Hex(token), address, kind, ip_hash: ipHash, expires_at: expiresAt });
    if (error) throw error;
    // Limpeza oportunista: sessões vencidas saem; o hash do IP só fica 24 h (limite por hora).
    await db.from('wallet_sessions').delete().lt('expires_at', new Date().toISOString());
    await db.from('wallet_sessions').update({ ip_hash: null }).not('ip_hash', 'is', null).lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    return json({ token, kind, address, expiresAt });
  } catch (e) {
    console.error('[auth]', e);
    return json({ error: 'erro interno' }, 500);
  }
});
