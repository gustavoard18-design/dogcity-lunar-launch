# Scripts de apoio

Ferramentas usadas no desenvolvimento. Não entram no build do jogo.

## `3d/`: modelos 3D (3D AI Studio)

A chave da API fica em `.env.local` (`THREEDAI_API_KEY=...`, fora do git). Gerar um modelo **gasta créditos** da conta.

| Script | Uso |
|---|---|
| `gen-trellis.mjs` | Gera um GLB com TRELLIS.2 (1024 + texturas 2048 = 30 créditos) a partir de `rocket-btc.png` na pasta atual. Guarda o `task_id` para retomar sem cobrar de novo. |
| `gen-dog.mjs` | Mesmo fluxo com Tripo 3.2 (Image to 3D + textura + low-poly = 80 créditos) a partir de `dog.png`. |
| `cut_disc.py entrada.glb saida.glb` | Remove o disco de base que o TRELLIS cria sob o objeto. |
| `orange_glb.py entrada.glb saida.glb` | Puxa os vermelhos da textura de cor para o laranja Bitcoin. |
| `shrink_glb.py` / `shrink_webp.py` | Reduzem as texturas do GLB (JPEG ou WebP, até 1024 px). |

Depois de gerar: conferir o modelo de vários ângulos, corrigir orientação/inclinação no componente (`src/three/RocketModel.tsx`, `DogModel.tsx`) e medir posições (escotilha, símbolos) com um render ortográfico.

## `art/`: artes 2D do foguete

`rocket-art.mjs` fotografa o foguete 3D do jogo (componente `Rocket`, com as peças da Oficina) e grava em `public/art`:

- `rocket-1..5.webp`: vitrine de cada fase da Oficina, com cenário;
- `cutout-rocket.webp` e `sprite-rocket.webp`: recorte e ícone com fundo transparente.

Rodar com `npm run dev` ativo e Playwright instalado (`npm i --no-save playwright`): `node scripts/art/rocket-art.mjs`. As peças e cores de cada fase ficam em `rocket-art.tsx` (página servida pelo Vite em `/scripts/art/rocket-art.html`, fora do build). No Chrome headless (SwiftShader) leva uns 2 minutos.

## `qa/`: testes automáticos no navegador

Usam `puppeteer-core` com o Chrome instalado (`npm i --no-save puppeteer-core`) e o jogo rodando em `http://localhost:5173` (`npm run dev`). O Chrome headless com `--use-angle=swiftshader` roda a ~6 fps, então os voos demoram bem mais que no jogo real.

| Script | O que faz |
|---|---|
| `qa.mjs` | Fluxos do jogador de ponta a ponta (compra, missões, voo). |
| `play.mjs [pasta] [rota]` | Joga uma partida inteira e salva prints de cada fase. |
| `padshot.mjs [pasta] [mobile] [launch]` | Prints da base de lançamento (e da decolagem). |
| `hangar-tabs.mjs [pasta] [mobile]` | Prints de todas as abas do hangar. |
| `card.mjs` | Gera cartões de compartilhamento de exemplo. |
| `musiccheck.mjs` | Mede o volume da trilha em cada clima (intercepta a saída de áudio). |
| `pwacheck.mjs` | Confere manifesto, instalabilidade, service worker e modo offline (rodar com `npm run preview -- --port 4173`). |

Em `npm run dev` o jogo não envia scores ao ranking online, então esses testes não sujam o ranking real.
