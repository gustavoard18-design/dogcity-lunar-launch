// Fila de posts do X: regras puras (testadas em x-queue.test.mjs).
//
// social/x-posts.json  lista de posts { id, at, text, approved }
// social/x-posted.json o que o robô já publicou (ou que falhou), por id
//
// O robô só publica post aprovado (approved: true), com o horário já passado,
// dentro do limite de 280 caracteres do X, e nunca o mesmo id duas vezes.

/** Limite de um post do X numa conta sem Premium. */
export const X_LIMIT = 280;
/** O X conta todo link como 23 caracteres. */
const URL_RE = /https?:\/\/\S+/g;
/** Faixas que o X conta como 1 caractere; o resto (emoji, CJK…) conta 2. */
const LIGHT = [
  [0x0000, 0x10ff],
  [0x2000, 0x200d],
  [0x2010, 0x201f],
  [0x2032, 0x2037],
];

/** Tamanho do texto como o X conta (links = 23, emoji = 2). */
export function xLength(text) {
  const withoutLinks = text.replace(URL_RE, '');
  const links = (text.match(URL_RE) ?? []).length;
  let n = links * 23;
  for (const ch of withoutLinks) {
    const cp = ch.codePointAt(0);
    if (cp === 0xfe0f || cp === 0x200d) continue; // seletor de variação e junção de emoji não somam
    n += LIGHT.some(([a, b]) => cp >= a && cp <= b) ? 1 : 2;
  }
  return n;
}

/** Problemas de um post da fila (lista vazia = ok). */
export function validatePost(p) {
  const errors = [];
  if (!p || typeof p.id !== 'string' || !/^[a-z0-9-]{3,60}$/.test(p.id)) errors.push('id inválido');
  if (!p || typeof p.text !== 'string' || !p.text.trim()) errors.push('texto vazio');
  else if (xLength(p.text) > X_LIMIT) errors.push(`texto com ${xLength(p.text)} caracteres (máximo ${X_LIMIT})`);
  if (!p || Number.isNaN(Date.parse(p.at))) errors.push('horário inválido');
  return errors;
}

/** O próximo post a publicar agora, ou null. Um por vez, o mais antigo primeiro. */
export function nextPost(posts, posted, now = new Date()) {
  const due = posts
    .filter(p => p.approved === true && !posted[p.id] && Date.parse(p.at) <= now.getTime() && validatePost(p).length === 0)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return due[0] ?? null;
}
