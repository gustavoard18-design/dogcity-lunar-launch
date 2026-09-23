# 🐕‍🦺🚀 DogCity Lunar Launch

**Da Base Lunar DogCity, mire, lance e pilote um cão astronauta por órbitas, luas e cinturões de asteroides.**

🎮 **Jogue agora:** https://gustavoard18-design.github.io/dogcity-lunar-launch/
Jogo 3D no navegador, feito com React + Three.js, integrado ao ecossistema DogCity.

![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react)
![Three.js](https://img.shields.io/badge/Three.js-0.160-green?style=flat-square&logo=three.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)

---

## 🎮 Como jogar

Cada missão tem três etapas:

1. **Mira**: um ponteiro oscila entre 15° e 80°. Trave-o dentro da faixa verde, que aponta para o planeta de destino no céu (faixa amarela = perfeito).
2. **Força**: uma barra sobe e desce. Trave na zona dourada.
3. **Voo**: pilote com **mouse / toque** ou **WASD / setas**:
   - ✨ **orbes** dão pontos, e sequências sem perder nenhum aumentam o multiplicador (até x5);
   - 💫 **anéis** dão pontos extras e um *boost*;
   - 🛡️ **escudos** absorvem um impacto;
   - ☄️ **asteroides** tiram um ❤️ do casco. Com o casco zerado, a nave é perdida.

Mira e força **perfeitas** começam o voo com escudo. **Espaço/Enter** também travam os medidores; **Esc** cancela antes da decolagem (com reembolso).

### Score

`score = máx da rota × (30% lançamento + 50% coleta + 20% casco restante)`.
Se a nave for perdida, o voo vale no máximo 60% do que foi feito até ali. Recordes e ranking só contam voos concluídos.

### Rotas

| Rota | Custo (Stardust) | Desbloqueio | Duração | Máx |
|------|------:|:-----------:|--------:|----:|
| Órbita da Terra (Órbita Baixa) | 10 | nível 1 | 24 s | 100 |
| Mar da Tranquilidade | 25 | nível 2 | 30 s | 250 |
| Cinturão de Asteroides | 50 | nível 4 | 36 s | 500 |
| Colônia de Marte | 100 | nível 7 | 42 s | 1000 |

O custo é debitado na entrada da missão e só volta se você cancelar **antes** da decolagem. Quem fica sem Stardust ganha **treino gratuito** na Órbita Baixa, então nunca trava.

### Progressão

- **Oficina**: 4 atributos com 10 níveis cada (custo crescente).
  - 🔥 Potência: medidores mais lentos e casco extra nos níveis 4 e 8
  - 🎯 Precisão: zonas ideais mais largas
  - 🍀 Sorte: mais orbes e escudos, e ímã de coleta
  - 💨 Manobra: nave mais responsiva
- **Missões diárias**: 3 por dia, sorteadas entre 13 conforme o seu nível. Renovam à meia-noite, e dá para trocar uma vez por dia por 25 ✨.
- **Loja**: pelagens, capacetes e rastros do motor. Itens mais raros evoluem a arte do astronauta; o rastro muda a cor da chama; pelagem e capacete aparecem no piloto do foguete em voo.
- **Ranking semanal**: seu melhor voo concluído da semana.
- **Evolução visual**: o astronauta tem 5 fases (Início → Exploração → Avançado → Especial → Lendário) conforme a raridade dos itens equipados na Loja (comum 1, raro 2, épico 3, lendário 4 pts). O foguete tem 5 fases (Básico → Aprimorado → Avançado → Especial → Lendário) conforme a soma dos níveis da Oficina.

---

## 🚀 Rodando

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testes das regras do jogo (Vitest)
npm run build      # typecheck + build de produção em dist/
npm run preview    # serve o build
```

Requer Node 20+ e um navegador com WebGL 2.

## 🌐 Publicação

Cada push na branch `main` roda typecheck, testes e build no GitHub Actions e publica o jogo no GitHub Pages (branch `gh-pages`) em cerca de um minuto.

## 🔗 Carteira

- **Jogar agora** cria um piloto convidado com endereço único, salvo no navegador.
- **UniSat**: se a extensão estiver instalada, conecta de verdade (`requestAccounts`).
- O saldo **DOG é simulado** a partir do endereço (ainda não há leitura on-chain de Runes). Nenhuma transação é feita.

## 📁 Estrutura

```
src/
├── App.tsx               # telas (conexão, hangar, missão) e ações do jogador
├── game/                 # a missão jogável
│   ├── LaunchGame.tsx    # orquestra fases, HUD e entrada
│   ├── PadScene.tsx      # plataforma, mira, contagem e decolagem (3D)
│   ├── FlightWorld.tsx   # simulação do voo: asteroides, orbes, anéis, câmera
│   └── ResultScreen.tsx
├── three/                # peças 3D reutilizáveis
│   ├── Rocket.tsx        # foguete em 3D no estilo das artes, com o cão na escotilha
│   ├── DogAstronaut.tsx  # mascote DOG em 3D: Shiba de traje espacial, no estilo das artes oficiais
│   ├── Planet.tsx        # planeta com atmosfera (shader)
│   ├── Particles.tsx     # partículas em GPU (exaustão, fumaça, explosões)
│   ├── textures.ts       # texturas procedurais de planetas
│   ├── SpaceBits.tsx     # nebulosas, traços de velocidade, iluminação
│   └── (o céu do login/hangar é components/SpaceBackdrop.tsx, sem WebGL)
├── components/           # painéis do hangar
└── lib/                  # regras puras (testadas)
    ├── economy.ts        # rotas, recompensas, XP, datas
    ├── stats.ts          # atributos → parâmetros do jogo
    ├── scoring.ts        # voo → score
    ├── progress.ts       # aplicar resultado, compras
    ├── missions.ts       # missões diárias
    ├── shop.ts           # upgrades e cosméticos
    ├── evolution.ts      # fases visuais do astronauta e do foguete
    ├── storage.ts        # localStorage + migração de perfis v1
    ├── wallet.ts         # convidado / UniSat
    └── audio.ts          # efeitos sonoros sintetizados (WebAudio)
```

As artes (personagens recortados, avatares, itens da Loja, ícones e logo) ficam em `public/art/` e `public/dog-face.png`; a plataforma de lançamento usa os recortes como sprites. Texturas 3D, modelos e sons são gerados em código.

Mais detalhes de design e fórmulas em [WIKI.md](./WIKI.md).

## 📝 Licença

MIT
