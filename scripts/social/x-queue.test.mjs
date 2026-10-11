import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { X_LIMIT, nextPost, validatePost, xLength } from './x-queue.mjs';

describe('fila de posts do X', () => {
  it('conta como o X: link vale 23 e emoji vale 2', () => {
    expect(xLength('abc')).toBe(3);
    expect(xLength('veja https://dogcity-lunar-launch.vercel.app/')).toBe(5 + 23);
    expect(xLength('🚀')).toBe(2);
    expect(xLength('⚔️')).toBe(2); // o seletor de variação não soma
    expect(xLength('x'.repeat(X_LIMIT + 1))).toBe(X_LIMIT + 1);
  });

  it('só publica aprovado, vencido, válido e uma vez, o mais antigo primeiro', () => {
    const now = new Date('2026-10-13T12:00:00Z');
    const posts = [
      { id: 'futuro', at: '2026-10-14T22:00:00Z', approved: true, text: 'a' },
      { id: 'segundo', at: '2026-10-12T23:00:00Z', approved: true, text: 'b' },
      { id: 'primeiro', at: '2026-10-12T22:00:00Z', approved: true, text: 'c' },
      { id: 'rascunho', at: '2026-10-01T00:00:00Z', approved: false, text: 'd' },
      { id: 'longo', at: '2026-10-01T00:00:00Z', approved: true, text: 'x'.repeat(300) },
    ];
    expect(nextPost(posts, {}, now)?.id).toBe('primeiro');
    expect(nextPost(posts, { primeiro: { postedAt: 'x' } }, now)?.id).toBe('segundo');
    expect(nextPost(posts, { primeiro: {}, segundo: { failedAt: 'x' } }, now)).toBeNull();
    expect(validatePost(posts[4])).toEqual([expect.stringContaining('máximo 280')]);
  });

  it('a fila do repositório é válida', () => {
    const posts = JSON.parse(fs.readFileSync('social/x-posts.json', 'utf8'));
    for (const p of posts) expect(validatePost(p), p.id).toEqual([]);
    expect(new Set(posts.map(p => p.id)).size).toBe(posts.length);
  });
});
