// Posts do X para publicar à mão: gera social/POSTAR.md com a data (horário de
// Brasília), o texto e um link que abre o X com o texto já preenchido.
// Uso: node scripts/social/manual-posts.mjs   (depois de editar social/x-posts.json)
import fs from 'node:fs';
import { validatePost, xLength } from './x-queue.mjs';

const posts = JSON.parse(fs.readFileSync('social/x-posts.json', 'utf8'));
const when = iso =>
  new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

let md = `# Posts do X para publicar à mão

Clique em **Abrir no X**: o X abre com o texto pronto, é só conferir e publicar.
Gerado de \`social/x-posts.json\` por \`node scripts/social/manual-posts.mjs\`.
A prévia com imagem aparece sozinha por causa do link do jogo.

`;
for (const p of [...posts].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))) {
  if (!p.approved) continue;
  const errors = validatePost(p);
  md += `## ${when(p.at)}\n\n`;
  md += `[Abrir no X](https://x.com/intent/post?text=${encodeURIComponent(p.text)}) · ${xLength(p.text)}/280 caracteres${errors.length ? ` · ⚠️ ${errors.join(', ')}` : ''}\n\n`;
  md += '```text\n' + p.text + '\n```\n\n';
}
fs.writeFileSync('social/POSTAR.md', md);
console.log(`social/POSTAR.md: ${posts.filter(p => p.approved).length} posts`);
