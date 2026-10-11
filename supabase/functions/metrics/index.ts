// Edge Function: métricas do jogo para o painel privado (public/metrics.html).
//
// GET ?days=30   com o cabeçalho  x-metrics-key: <senha>
//
// A senha é o segredo METRICS_KEY do projeto (Supabase → Edge Functions →
// Secrets). Sem ele configurado, a função recusa tudo. O relatório vem da
// função SQL metrics_report (só o service role executa).
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-metrics-key',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/** Comparação em tempo constante (não vaza o tamanho do acerto). */
async function sameSecret(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'GET') return json({ error: 'método não aceito' }, 405);

  const secret = Deno.env.get('METRICS_KEY') ?? '';
  if (secret.length < 12) return json({ error: 'METRICS_KEY não configurada no Supabase' }, 503);
  const given = req.headers.get('x-metrics-key') ?? '';
  if (!given || !(await sameSecret(given, secret))) {
    await new Promise(r => setTimeout(r, 400)); // freia tentativas
    return json({ error: 'senha inválida' }, 401);
  }

  const days = Math.min(180, Math.max(1, Number(new URL(req.url).searchParams.get('days')) || 30));
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await db.rpc('metrics_report', { p_days: days });
  if (error) {
    console.error('[metrics]', error);
    return json({ error: 'erro ao montar o relatório' }, 500);
  }
  return json(data);
});
