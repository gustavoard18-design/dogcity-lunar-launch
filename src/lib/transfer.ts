/**
 * Mudança de endereço (GitHub Pages → Vercel): a página antiga manda os dados
 * do navegador (chaves dogcity_*) no fragmento do link, `#import=z.<base64url>`
 * (gzip) ou `#import=p.<base64url>` (sem compressão). Aqui eles entram no
 * localStorage sem apagar nada: pilotos que já existem neste endereço ficam
 * como estão, e cada outra chave só é gravada se ainda não existir.
 */

const PREFIX = '#import=';
const PROFILES = 'dogcity_game_state';

function fromBase64Url(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

async function decode(payload: string): Promise<Record<string, string> | null> {
  const [kind, data] = [payload.slice(0, 1), payload.slice(2)];
  let bytes: Uint8Array<ArrayBuffer> = fromBase64Url(data);
  if (kind === 'z') {
    if (typeof DecompressionStream === 'undefined') return null;
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  } else if (kind !== 'p') return null;
  const parsed = JSON.parse(new TextDecoder().decode(bytes));
  if (!parsed || parsed.v !== 1 || typeof parsed.items !== 'object') return null;
  const items: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed.items)) if (/^dogcity_[a-z0-9_]{1,40}$/.test(k) && typeof v === 'string') items[k] = v;
  return items;
}

/** Junta os pilotos: os deste endereço ganham dos que vieram de fora. */
function mergeProfiles(current: string | null, incoming: string): string {
  let here: Record<string, unknown> = {};
  let there: Record<string, unknown> = {};
  try {
    here = JSON.parse(current ?? '{}') ?? {};
  } catch {
    here = {};
  }
  try {
    there = JSON.parse(incoming) ?? {};
  } catch {
    there = {};
  }
  return JSON.stringify({ ...there, ...here });
}

/** Importa o progresso vindo do endereço antigo, se o link trouxer. Devolve quantos pilotos chegaram. */
export async function importTransferFromLocation(): Promise<number> {
  if (typeof location === 'undefined' || !location.hash.startsWith(PREFIX)) return 0;
  const payload = location.hash.slice(PREFIX.length);
  // Tira o fragmento do endereço antes de tudo (não fica no histórico nem é compartilhado).
  history.replaceState(null, '', location.pathname + location.search);
  try {
    const items = await decode(payload);
    if (!items) return 0;
    let pilots = 0;
    for (const [key, value] of Object.entries(items)) {
      if (key === PROFILES) {
        try {
          pilots = Object.keys(JSON.parse(value) ?? {}).length;
        } catch {
          continue;
        }
        localStorage.setItem(PROFILES, mergeProfiles(localStorage.getItem(PROFILES), value));
      } else if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, value);
      }
    }
    return pilots;
  } catch (e) {
    console.warn('[mudança] não deu para importar o progresso', e);
    return 0;
  }
}
