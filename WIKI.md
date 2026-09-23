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

## 6. Missões diárias (`lib/missions.ts`)

- São 13 missões no total, e 3 são sorteadas por dia com semente `dia|endereço`, filtradas por `minLevel`.
- `ensureDailyMissions` renova quando o dia local muda. Roda ao carregar o perfil, a cada minuto e em cada resultado de voo.
- Tipos: `launches`, `success`, `quality`, `orbs`, `rings`, `perfect`, `flawless`, `route`, `stardust`.
- A troca custa 25 ✨, pode ser usada 1× por dia e só substitui missões não resgatadas.
- O XP das missões passa por `applyXp`, então também sobe de nível.

## 7. Persistência (`lib/storage.ts`)

- `localStorage['dogcity_game_state']`: perfis por endereço (`version: 2`).
- `migrateProfile` aceita perfis da v1 ou corrompidos: completa campos, limita atributos a 1–10, recalcula `xpToNext` e troca missões inexistentes.
- Ranking: `dogcity_leaderboard_v2` guarda os jogadores locais e é complementado por 5 pilotos simulados (marcados como "bot").
- Toda leitura e escrita é protegida por `try/catch`. Com armazenamento bloqueado, o jogo continua em memória.

## 8. Áudio (`lib/audio.ts`)

Todo o som é sintetizado com WebAudio: osciladores e ruído marrom filtrado. O `AudioContext` nasce no primeiro clique. O botão 🔊 no topo silencia, e a preferência fica salva.

## 9. Evolução visual (`lib/evolution.ts`)

| Fase | Astronauta (raridade de pelagem + capacete, 0–7) | Foguete (4 atributos + raridade do rastro, 4–44) |
|---|---|---|
| 1 | Início (0) | Básico (4) |
| 2 | Exploração (1) | Aprimorado (10) |
| 3 | Avançado (3) | Avançado (17) |
| 4 | Especial (5) | Especial (25) |
| 5 | Lendário (7) | Lendário (34) |

As artes ficam em `public/art/astro-N.webp`, `public/art/rocket-N.webp` e `public/art/icons/*.webp`. A Loja funciona como provador (mostra a fase que o item daria) e a Oficina mostra a prévia do próximo nível.

## 10. Testes

`npm test` roda `src/lib/game-rules.test.ts` (Vitest + jsdom). Ele cobre economia, pontuação, efeitos dos atributos, aplicação de resultados, missões (renovação, progresso, troca e level up ao resgatar), loja e migração de perfis v1.

O CI (`.github/workflows/ci.yml`) roda typecheck, testes e build em Node 20 e 22, e publica no GitHub Pages a cada push em `main`/`master` (o build usa `base: './'`).

## 11. Próximos passos sugeridos

- Ranking online (servidor ou Supabase) com validação do score no servidor.
- Leitura real do saldo DOG (Runes) via indexador. Suporte a Xverse.
- Conquistas permanentes e eventos semanais com rotas especiais.
