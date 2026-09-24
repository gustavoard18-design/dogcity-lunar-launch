# DogCity Lunar Launch: Wiki técnica

Referência de design e implementação da v2. Para instalar e jogar, veja o [README](./README.md).

## 1. Fluxo de telas

```
Conexão ──► Hangar ──► Missão (brief → mira → força → contagem → decolagem → voo → resultado)
              ▲                                                                   │
              └───────────────────────── Hangar / Voar de novo ◄─────────────────┘
```

- O login e o hangar usam `SpaceBackdrop`: a arte `public/art/space-bg.webp` com deriva e parallax, mais estrelas cintilando, estrelas cadentes e poeira em canvas 2D (sem WebGL). A missão (`LaunchGame`) é carregada sob demanda (`React.lazy`), então o Three.js só baixa ao lançar.
- Nas cenas 3D, `SkyBackground` usa a mesma arte como fundo (enquadramento "cover", escurecida para não competir com os objetos jogáveis); no voo ela se aproxima conforme o progresso.
- Só existe **um** canvas WebGL por vez.

## 2. Economia

| Evento | Fórmula (`q = score / máx da rota`) |
|---|---|
| Recompensa, sucesso | `round(custo × (0.6 + 1.8q)) + 5` |
| Recompensa, falha | `round(custo × 0.25q)` |
| XP | `(10 + 40q) × multiplicador da rota`, e 30% disso na falha |
| Pó Lunar | `dificuldade` se q ≥ 0.7, `2 × dificuldade` se q ≥ 0.85 (só no sucesso) |
| Reputação | `2 + round(8q × dificuldade)`, ou −1 na falha (mínimo 0) |
| XP por nível | `floor(50 × 1.5^(nível−1))` |

Um voo mediano (q = 0.5) com sucesso sempre dá lucro. Jogador novo começa com **150 ✨**.

**Custo:** debitado ao entrar na missão (`App.startRoute`). Cancelar antes da decolagem reembolsa. Abortar ou fechar a aba depois disso não reembolsa. Isso elimina o exploit da v1, em que dava para ver "Falha" e cancelar sem pagar.

## 3. Atributos → jogo (`lib/stats.ts`)

`lv = nível − 1` (0 a 9)

| Parâmetro | Fórmula |
|---|---|
| Meia-zona do ângulo | `5 + 1.0·lv(precisão)` graus |
| Meia-zona da força | `6 + 1.1·lv(precisão)` % |
| Velocidade dos medidores | `(0.45 + 0.12·(dif−1)) / (1 + 0.09·lv(potência))` ciclos/s |
| Casco | `3` (+1 com potência ≥ 4, +1 com potência ≥ 8) |
| Resposta do controle | `4.5 + 1.0·lv(manobra)` |
| Orbes/s | `2.4 × (1 + 0.06·lv(sorte))` |
| Escudos/s | `0.035 + 0.012·lv(sorte)` |
| Ímã | `1 + 0.07·lv(sorte)` |

Upgrades custam `base × 1.45^(nível−2)` (bases: potência 40, precisão 45, sorte 55, manobra 40).

## 4. Pontuação (`lib/scoring.ts`)

- **Lançamento**: média da qualidade dos dois medidores. Cada medidor vale 1 no centro, ~0.85 na borda da zona e cai a 0 em três meias-zonas. É *perfeito* dentro de 40% da meia-zona.
- **Coleta**: `min(1, pontos / (pontos gerados × 1.6))`. Orbe = 1 × multiplicador, anel = 3 × multiplicador. O multiplicador sobe 1 a cada 6 orbes seguidos (máx. x5) e zera ao perder um orbe ou levar dano.
- **Total**: `0.3·lançamento + 0.5·coleta + 0.2·(casco/casco máx)`.
- **Nave perdida**: `(0.3·lançamento + 0.5·coleta) × progresso × 0.6`.

## 5. Voo (`game/FlightWorld.tsx`)

- Toda a simulação roda em um único `useFrame`, com *pools* de objetos e `InstancedMesh` (até 110 asteroides e 180 orbes em 2 draw calls). O HUD React é atualizado a ~12 Hz.
- Os asteroides aumentam ao longo do voo (`ramp = 0.6 + 0.8·progresso`). Uma fração deles mira a posição atual da nave (15% a 39% conforme a dificuldade).
- Em telas em pé, a área jogável encolhe na horizontal, a densidade de asteroides é compensada e o FOV aumenta.
- Efeitos: bloom, vinheta, aberração cromática pulsando ao levar dano, tremor de câmera, FOV kick no boost, traços de velocidade e partículas de exaustão com a cor do rastro equipado.
- Fundo do voo (`three/DeepSpace.tsx`): rochas gigantes e um satélite fora da área jogável, com parallax. Objetos distantes surgem crescendo em vez de usar névoa (que deixava silhuetas pretas).
- Modelos 3D gerados no 3D AI Studio (`public/models`): o DOG astronauta (`three/DogModel.tsx`, na plataforma, embarca com um pulo na contagem) e o foguete Bitcoin (`three/RocketModel.tsx`). O rosto do DOG na escotilha e o símbolo ₿ são malhas projetadas na superfície do casco por raycast. O casco procedural antigo só aparece enquanto o modelo carrega.
- Base Lunar (`game/LaunchSite.tsx`): relevo com crateras, pedras instanciadas, cordilheiras com a Terra nascendo, torre de serviço, holofotes e construções.

## 6. Missões diárias (`lib/missions.ts`)

- São 13 missões no total, e 3 são sorteadas por dia com semente `dia|endereço`, filtradas por `minLevel`.
- `ensureDailyMissions` renova quando o dia local muda. Roda ao carregar o perfil, a cada minuto e em cada resultado de voo.
- Tipos: `launches`, `success`, `quality`, `orbs`, `rings`, `perfect`, `flawless`, `route`, `stardust`.
- A troca custa 25 ✨, pode ser usada 1× por dia e só substitui missões não resgatadas.
- O XP das missões passa por `applyXp`, então também sobe de nível.

## 7. Evento semanal (`lib/events.ts`)

- Uma rota especial por semana, em rodízio fixo de 5 eventos. Troca na segunda-feira às 00:00 (horário local), contando a partir da semana de 05/01/2026.
- Os eventos mudam o ritmo com `hazardRate`, `flightSeconds`, `orbRateMult` (multiplica a taxa de orbes em `getGameTuning`) e `ringRateMult` (anéis de impulso mais frequentes no `FlightWorld`). Saturno usa o planeta `gas` com anéis e o ícone `public/art/ui/planet-saturn.webp` (render do próprio jogo).
- Ao incluir um evento, a posição na lista deve manter o evento da semana em curso (`índice da semana % tamanho da lista`), senão o evento troca no meio da semana.

| Evento | Destino | Nível | Custo | Voo | Orbes | Bônus (qualidade mínima) |
|---|---|---|---|---|---|---|
| Chuva de Meteoros | Terra | 2 | 30 | 30 s | x2 | +120 ✨ +6 Pó Lunar (60%) |
| Anéis de Saturno | Saturno | 4 | 45 | 44 s | x1.6, anéis x2.5 | +170 ✨ +8 Pó Lunar (60%) |
| Tempestade Solar | Lua | 2 | 25 | 26 s | x2.4 | +100 ✨ +5 Pó Lunar (60%) |
| Caçada ao Cometa | Ceres | 3 | 40 | 40 s | x1.5 | +150 ✨ +7 Pó Lunar (60%) |
| Maratona Marciana | Marte | 5 | 60 | 50 s | x1.4 | +200 ✨ +9 Pó Lunar (55%) |

- O bônus sai uma vez por semana, só na rota do evento *daquela* semana, com sucesso e qualidade mínima. A semana ganha fica em `profile.eventWins`.
- O card do evento aparece no topo da aba Lançar, com o tempo restante e o status do bônus.
- O Ranking tem as abas **Geral** e **Evento**: a segunda mostra o melhor voo concluído de cada piloto na rota do evento, só na semana (`event_leaderboard` no servidor, `getEventLeaderboard` no modo local).
- Ranking online: as migrações `20260924000000_event_routes.sql`, `20260924010000_event_ranking_titles.sql` e `20260924020000_name_styles_podium.sql` adicionam as rotas de evento, títulos, molduras e as funções v2 (`submit_score_v2`, `weekly_leaderboard_v2`, `event_leaderboard_v2`). O cliente tenta a função mais nova e cai para as antigas se o servidor não tiver a migração (`firstAvailable` em `lib/online.ts`).

## 8. Conquistas (`lib/achievements.ts`)

- 24 conquistas permanentes (incluindo "No Pódio" e "Campeão Semanal") e 4 secretas (nome e objetivo ocultos até desbloquear), medidas sobre `profile.stats` (voos, sucessos, orbes, anéis, lançamentos perfeitos, voos sem dano, Stardust ganho e sucessos por rota), `eventWins` e o próprio perfil (nível, atributo máximo, itens da Loja).
- `unlockAchievements` roda no resultado de cada voo e em todo `commit` do App, então compras e level ups também desbloqueiam. A recompensa (Stardust e Pó Lunar) é resgatada no painel de Conquistas da aba Missões, que ganha o selo verde quando há algo para resgatar.
- Perfis antigos sem contadores recebem uma estimativa pelo histórico (`statsFromHistory`: total de missões do piloto e sucessos dos últimos 50 voos) e já carregam as conquistas cumpridas.
- A tela de resultado lista as conquistas desbloqueadas no voo e o bônus do evento.
- **Títulos:** toda conquista resgatada pode virar o título do piloto (`profile.title`, escolhido no painel). Ele aparece no perfil e no ranking. O servidor guarda só o id da conquista (validado por padrão `^[a-z0-9_]{1,24}$`), nunca texto livre.
- A aba Diário mostra a carreira do piloto: contadores de vida, rotas concluídas e eventos vencidos.
- **Molduras de nome** (`lib/frames.ts`, `components/PilotName.tsx`): 7 estilos (Poeira Vermelha, Anéis Cósmicos, Veterano, Nebulosa, Ouro Estelar, Pódio, Campeão do Evento) desbloqueados por conquistas raras e pelo pódio. Escolhidas no painel da aba Missões; aparecem no perfil e no ranking (servidor guarda só o id, validado por padrão).
- **Pódio do evento** (`lib/podium.ts`): ao entrar, o jogo pede ao servidor o top 3 da rota do evento das últimas 4 semanas encerradas (`event_leaderboard_v2` com `p_weeks_ago`). Se o piloto estiver no pódio e ainda não recebeu, ganha 1º 500 ✨ + 30 Pó Lunar, 2º 300 + 20, 3º 200 + 12 (registro em `profile.podiums`, uma vez por semana). Desempate: quem chegou primeiro à rota na semana. Semanas contadas no horário de Brasília.

## 9. Tutorial e compartilhamento

- **Tutorial do primeiro voo** (`lib/tutorial.ts`): só para quem nunca voou (`stats.launches === 0`). Mostra balões "Dica do DOG" no briefing, ao lado de cada medidor (com seta), na contagem e em sequência durante o voo (pilotar, orbes, anéis, asteroides), além de dicas por evento (primeira batida, combo de 6). Os medidores oscilam 30% mais devagar. "Pular dicas" ou o fim do primeiro voo gravam `dogcity_tutorial_done_<endereço>`.
- **Compartilhar resultado** (`lib/shareCard.ts`): a tela de resultado gera um cartão 1080×1080 em canvas com a arte do céu, o DOG, o planeta, a pontuação, estrelas, orbes/anéis/casco, o piloto e o título, e o link do jogo. No celular abre o menu de compartilhar do sistema (`navigator.share` com arquivo); no computador baixa o JPEG.

## 10. Lançamento: robustez e divulgação

- Sem WebGL, o jogo não cobra a missão e explica o motivo (`lib/webgl.ts`). Se a cena 3D quebrar no meio, um `ErrorBoundary` mostra uma tela amigável e devolve o custo se o voo ainda não tinha resultado.
- Prévia do link (Open Graph e Twitter) com `public/og-image.jpg` (1200×630, desenhado com as fontes e artes do jogo).
- Versões e novidades em `CHANGELOG.md`.

## 10.1 Persistência (`lib/storage.ts`)

- `localStorage['dogcity_game_state']`: perfis por endereço (`version: 2`).
- `migrateProfile` aceita perfis da v1 ou corrompidos: completa campos, limita atributos a 1–10, recalcula `xpToNext` e troca missões inexistentes.
- Ranking: `dogcity_leaderboard_v2` guarda os jogadores locais e é complementado por 5 pilotos simulados (marcados como "bot"). Com o backend no ar, o ranking semanal vem do Supabase (`lib/online.ts`). Só o jogo publicado envia voos: em `npm run dev` e nos testes o envio fica desligado para não poluir o ranking real (use `VITE_SUBMIT_IN_DEV=1` para testar o envio).
- `migrateProfile` também completa `stats`, `achievements` e `eventWins` em perfis que não têm esses campos.
- Toda leitura e escrita é protegida por `try/catch`. Com armazenamento bloqueado, o jogo continua em memória.

## 11. Áudio (`lib/audio.ts`)

Todo o som é sintetizado com WebAudio: osciladores e ruído marrom filtrado. O `AudioContext` nasce no primeiro clique. O botão 🔊 no topo silencia tudo, e a preferência fica salva.

**Trilha sonora** (`lib/music.ts`): gerada em tempo real, sem arquivos. Um agendador marca semicolcheias 0,25 s à frente, com pad (tríade + sétima desafinada), arpejo com eco, baixo e bateria sintetizados. Três climas, com crossfade:

| Clima | Onde | Andamento | Camadas |
|---|---|---|---|
| `hangar` | login, hangar e resultado | 72 bpm, maior | pad e arpejo rarefeito |
| `pad` | base de lançamento (briefing, mira, força, contagem) | 84 bpm, menor | pad, arpejo lento e batida de coração |
| `flight` | decolagem e voo | 104 + 8 × dificuldade, menor; tom pelo planeta | pad, arpejo, baixo e bateria |

A música usa a mesma saída dos efeitos (o 🔊 silencia tudo), tem botão próprio (🎵, preferência `dogcity_music`), só começa depois do primeiro toque e para com a aba escondida.

## 12. App instalável (PWA)

- `public/manifest.webmanifest` com ícones feitos da arte oficial (`icon-192/512.png`, `icon-maskable-512.png` com zona segura, `apple-touch-icon.png`, `favicon-64.png`).
- `public/sw.js` (só no build publicado): páginas pela rede primeiro (versão nova quando online), arquivos do mesmo site e as fontes com cache primeiro e atualização por trás. O Supabase nunca passa pelo cache. Trocar `CACHE` no arquivo limpa o cache antigo.
- Botão "Instalar app" no cabeçalho (`lib/pwa.ts`): usa o pedido de instalação do Chrome/Edge/Android (`beforeinstallprompt`); no iPhone/iPad mostra o passo a passo do Safari. Some quando o jogo já está instalado.
- Sem internet, o jogo abre com o que já foi visitado; uma rota só roda offline depois de ter sido jogada uma vez online (modelos 3D e o código da missão entram no cache nesse momento).

## 13. Evolução visual (`lib/evolution.ts`)

| Fase | Astronauta (pts de raridade equipados, máx 12) | Foguete (soma dos 4 atributos, 4–40) |
|---|---|---|
| 1 | Início (0) | Básico (4) |
| 2 | Exploração (2) | Aprimorado (10) |
| 3 | Avançado (5) | Avançado (17) |
| 4 | Especial (8) | Especial (25) |
| 5 | Lendário (11) | Lendário (33) |

As artes ficam em `public/art/astro-N.webp`, `public/art/rocket-N.webp` e `public/art/icons/*.webp`. A Loja funciona como provador (mostra a fase que o item daria) e a Oficina mostra a prévia do próximo nível.

## 14. Testes

`npm test` roda `src/lib/game-rules.test.ts` (Vitest + jsdom). Ele cobre economia, pontuação, efeitos dos atributos, aplicação de resultados, missões (renovação, progresso, troca e level up ao resgatar), loja, migração de perfis v1, rodízio e bônus do evento semanal, e conquistas (contadores, desbloqueio, resgate e migração).

Também cobre tutorial, molduras de nome (inclusive o visual no cartão de compartilhamento) pódio do evento, idiomas e nome do astronauta e identidade DogData (50 testes). O CI (`.github/workflows/ci.yml`) roda typecheck, testes e build em Node 22 e 24, e publica no GitHub Pages a cada push em `main`/`master` (o build usa `base: './'`).

## 15. Próximos passos sugeridos

- Xverse testada com a carteira real (setembro de 2026). Falta testar a OKX e a Kray com as extensões reais e o "Abrir no app" no celular (o código segue a documentação de cada uma e passa em `scripts/qa/wallets.mjs` com provedores simulados).
