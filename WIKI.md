# 🐕‍🦺🚀 DogCity Lunar Launch - Documentação Wiki

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Tecnologias](#tecnologias)
4. [Estrutura do Projeto](#estrutura-do-projeto)
5. [Instalação e Configuração](#instalação-e-configuração)
6. [Componentes](#componentes)
7. [Sistema de Jogo](#sistema-de-jogo)
8. [Economia e Mecânicas](#economia-e-mecânicas)
9. [APIs e Integrações](#apis-e-integrações)
10. [Desenvolvimento](#desenvolvimento)
11. [Deploy](#deploy)
12. [Roadmap](#roadmap)

---

## 🎯 Visão Geral

**DogCity Lunar Launch** é um jogo 3D baseado em blockchain Bitcoin, integrado ao ecossistema DogCity. Os jogadores controlam cães astronautas em missões de lançamento espacial, ganhando recompensas em Stardust e Pó Lunar.

### Características Principais

- 🎮 **Gráficos 3D profissionais** com Three.js e React Three Fiber
- 🔗 **Integração Bitcoin** via carteiras (UniSat, Xverse, Leather)
- 🐕 **Sistema de pets** com evolução e customização
- 🏆 **Competição semanal** com leaderboards
- 💎 **Economia dual** (Stardust + Pó Lunar)
- 🎨 **Cosméticos** com sistema de raridade
- 📋 **Missões diárias** renováveis
- 🔧 **Sistema de upgrades** com 4 stats

### Conceito

O jogo é um módulo independente que pode ser integrado ao DogCity como:
- Página interna
- Iframe embeddable
- Microfrontend
- Componente standalone

---

## 🏗️ Arquitetura

### Camadas

```
┌─────────────────────────────────────┐
│         Frontend (React)            │
│  - UI Components                    │
│  - 3D Rendering (Three.js)          │
│  - State Management (React Hooks)   │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│         Business Logic              │
│  - Game Mechanics                   │
│  - Economy System                   │
│  - Mission System                   │
│  - Upgrade System                   │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│         Data Layer                  │
│  - LocalStorage (MVP)               │
│  - Future: Backend API              │
│  - Future: Blockchain Indexer       │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│         External Services           │
│  - Bitcoin Wallets                  │
│  - DOG Token Indexer                │
│  - DogCity Platform                 │
└─────────────────────────────────────┘
```

### Fluxo de Dados

1. **Conexão de Wallet**
   - Usuário conecta carteira Bitcoin
   - Sistema obtém endereço público
   - Consulta saldo de DOG via indexer (mock no MVP)
   - Calcula tier baseado no saldo

2. **Criação de Perfil**
   - Gera cão astronauta aleatório
   - Define stats iniciais
   - Atribui 100 Stardust iniciais
   - Salva no localStorage

3. **Gameplay Loop**
   - Jogador seleciona rota
   - Deduz custo em Stardust
   - Executa minigame de lançamento
   - Calcula score baseado em stats
   - Determina sucesso/falha
   - Atribui recompensas
   - Atualiza perfil e missões

---

## 🛠️ Tecnologias

### Core

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| React | 18.3.1 | UI Framework |
| TypeScript | 5.x | Type Safety |
| Vite | 6.x | Build Tool |
| Tailwind CSS | 4.x | Styling |

### 3D e Gráficos

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| Three.js | 0.160.0 | 3D Rendering Engine |
| React Three Fiber | 8.15.0 | React Renderer for Three.js |
| React Three Drei | 9.92.0 | Helpers e componentes 3D |
| React Three Postprocessing | 2.16.0 | Efeitos visuais avançados |
| Postprocessing | 6.35.0 | Biblioteca de efeitos |

### Animações e UI

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| Framer Motion | 11.x | Animações declarativas |
| Canvas Confetti | 1.9.x | Efeitos de celebração |

### Estado e Persistência

| Tecnologia | Propósito |
|------------|-----------|
| React Hooks | State management |
| LocalStorage | Persistência local (MVP) |

### Futuras Integrações

- **Prisma** - ORM para backend
- **SQLite/PostgreSQL** - Banco de dados
- **Next.js** - Framework fullstack
- **Bitcoin Indexer** - Consulta de saldo DOG
- **Wallet Connectors** - UniSat, Xverse, Leather

---

## 📁 Estrutura do Projeto

```
dogcity-game/
├── public/                    # Assets estáticos
├── src/
│   ├── components/           # Componentes React
│   │   ├── ConnectWallet.tsx
│   │   ├── PlayerProfile.tsx
│   │   ├── RouteSelector.tsx
│   │   ├── Game3D.tsx
│   │   ├── SpaceScene3D.tsx
│   │   ├── MissionsPanel.tsx
│   │   ├── UpgradeShop.tsx
│   │   ├── CosmeticShop.tsx
│   │   └── WeeklyLeaderboard.tsx
│   ├── lib/                  # Lógica de negócio
│   │   ├── economy.ts        # Rotas, tiers, cálculos
│   │   ├── missions.ts       # Sistema de missões
│   │   ├── shop.ts           # Upgrades e cosméticos
│   │   ├── storage.ts        # Persistência
│   │   └── wallet.ts         # Mock de carteira
│   ├── types.ts              # Definições de tipos
│   ├── App.tsx               # Componente principal
│   ├── main.tsx              # Entry point
│   └── index.css             # Estilos globais
├── index.html                # HTML template
├── package.json              # Dependências
├── tsconfig.json             # Config TypeScript
├── vite.config.ts            # Config Vite
└── tailwind.config.js        # Config Tailwind
```

### Descrição dos Arquivos

#### Componentes

- **ConnectWallet.tsx** - Tela de conexão de carteira com background 3D
- **PlayerProfile.tsx** - Card do perfil do jogador e cão astronauta
- **RouteSelector.tsx** - Seletor de rotas de lançamento
- **Game3D.tsx** - Interface do jogo com controles
- **SpaceScene3D.tsx** - Cena 3D com foguete, lua, alvo e partículas
- **MissionsPanel.tsx** - Painel de missões diárias
- **UpgradeShop.tsx** - Loja de upgrades de stats
- **CosmeticShop.tsx** - Loja de cosméticos
- **WeeklyLeaderboard.tsx** - Ranking semanal

#### Bibliotecas

- **economy.ts** - Definição de rotas, cálculo de tiers, recompensas, XP
- **missions.ts** - Lógica de missões diárias, progresso, recompensas
- **shop.ts** - Definição de upgrades e cosméticos, disponibilidade
- **storage.ts** - Persistência em localStorage, leaderboard
- **wallet.ts** - Mock de conexão de carteira e saldo DOG

---

## 🚀 Instalação e Configuração

### Pré-requisitos

- Node.js 18+ e npm
- Navegador moderno com suporte a WebGL 2.0

### Instalação

```bash
# Clonar o repositório
git clone <repo-url>
cd dogcity-game

# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview
```

### Variáveis de Ambiente (Futuro)

```env
# Backend API
VITE_API_URL=http://localhost:3000

# Bitcoin Indexer
VITE_INDEXER_URL=https://api.dogdata.xyz

# Wallet Connect
VITE_WALLET_CONNECT_PROJECT_ID=xxx
```

---

## 🎮 Componentes

### ConnectWallet

Tela inicial de conexão de carteira.

**Props:**
```typescript
interface ConnectWalletProps {
  onConnect: (wallet: WalletConnection) => void;
}
```

**Features:**
- Background 3D animado
- Animações de entrada com Framer Motion
- Botão com gradiente animado
- Glass morphism no card

### PlayerProfile

Card do perfil do jogador.

**Props:**
```typescript
interface PlayerProfileProps {
  profile: PlayerProfile;
}
```

**Features:**
- Exibe tier e badge
- Stats do cão (power, accuracy, luck, speed)
- Barra de XP animada
- Recursos (Stardust, Pó Lunar)
- Saldo de DOG

### Game3D

Interface principal do jogo.

**Props:**
```typescript
interface Game3DProps {
  route: Route;
  onComplete: (score: number, success: boolean) => void;
  onCancel: () => void;
  dogStats?: {
    power: number;
    accuracy: number;
    luck: number;
    speed: number;
  };
}
```

**Features:**
- Cena 3D imersiva
- Controles de power e ângulo
- HUD overlay com informações
- Animações de lançamento
- Feedback visual rico

### SpaceScene3D

Cena 3D com Three.js.

**Props:**
```typescript
interface SpaceScene3DProps {
  phase?: string;
  power?: number;
}
```

**Features:**
- Foguete 3D detalhado com materiais PBR
- Lua com rotação
- Alvo animado com glow
- 3000+ partículas
- 5000+ estrelas
- Iluminação volumétrica
- Bloom post-processing

---

## 🎯 Sistema de Jogo

### Rotas de Lançamento

| Rota | Custo | Dificuldade | Max Score | Multiplicador |
|------|-------|-------------|-----------|---------------|
| 🌍 Órbita Baixa | 10 | ★☆☆☆ | 100 | 1x |
| 🌙 Mar da Tranquilidade | 25 | ★★☆☆ | 250 | 1.8x |
| ☄️ Cinturão de Asteroides | 50 | ★★★☆ | 500 | 3x |
| 🔴 Colônia de Marte | 100 | ★★★★ | 1000 | 5x |

### Mecânica de Lançamento

1. **Fase Idle** - Foguete flutua suavemente
2. **Fase Aiming** - Power carrega automaticamente
   - Velocidade baseada no stat Power
   - Máximo baseado no stat Power
3. **Fase Flying** - Foguete voa com física
   - Gravidade aplicada
   - Trail de partículas
   - Rotação baseada em velocidade
4. **Fase Landed** - Resultado calculado
   - Score baseado em distância ao alvo
   - Sucesso baseado em chance calculada

### Cálculo de Score

```typescript
// Score baseado em power e accuracy
baseScore = (power / 100) * route.maxScore * (accuracy / 5)
score = min(baseScore, route.maxScore)
```

### Cálculo de Sucesso

```typescript
// Chance baseada em score e luck
threshold = route.maxScore * 0.5
luckBonus = (luck - 1) * 0.03

if (score >= threshold) return min(0.85 + luckBonus, 0.98)
if (score >= threshold * 0.7) return min(0.6 + luckBonus, 0.85)
if (score >= threshold * 0.4) return min(0.35 + luckBonus, 0.6)
return min(0.1 + luckBonus, 0.3)
```

### Recompensas

```typescript
// Stardust ganho
if (success) {
  reward = score * route.rewardMultiplier
} else {
  reward = score * 0.1
}

// XP ganho
xp = score * 0.5 * (success ? 1 : 0.3)

// Pó Lunar (apenas sucesso com score > 200)
if (success && score > 200) {
  lunarDust = floor(score / 100)
}
```

---

## 💎 Economia e Mecânicas

### Tiers

Baseado no saldo de DOG:

| Tier | DOG Mínimo | Badge |
|------|------------|-------|
| Stray | 0 | 🐕 |
| Explorer | 100 | 🔭 |
| Pioneer | 1,000 | 🚀 |
| Commander | 5,000 | ⭐ |
| Legend | 10,000 | 🏆 |

### Stats do Cão Astronauta

| Stat | Efeito | Upgrade |
|------|--------|---------|
| 🔥 Power | Velocidade de carga do power | Propulsor |
| 🎯 Accuracy | Zona de acerto no alvo | Mira |
| 🍀 Luck | Chance de sucesso | Amuleto |
| 💨 Speed | Velocidade do foguete | Aerodinâmica |

### Upgrades

- 10 níveis por stat
- Custo crescente
- Efeitos cumulativos
- Desbloqueados por nível do cão

### Cosméticos

**Tipos:**
- Skin (pele)
- Helmet (capacete)
- Trail (rastro)

**Raridades:**
- Common (comum) - Stardust
- Rare (raro) - Stardust
- Epic (épico) - Stardust
- Legendary (lendário) - Pó Lunar

### Missões Diárias

3 missões renováveis diariamente:

**Tipos:**
- Lançamentos (ex: 3 lançamentos)
- Score (ex: alcançar 200 pontos)
- Sucessos (ex: 2 missões bem-sucedidas)
- Rota específica (ex: lançar no Mar da Tranquilidade)
- Stardust ganho (ex: ganhar 100 Stardust)

**Recompensas:**
- Stardust (20-80)
- XP (15-50)
- Pó Lunar (0-5)

### Sistema de Níveis

```typescript
// XP necessário por nível
xpForLevel = floor(50 * pow(1.5, level - 1))

// Level 1: 50 XP
// Level 2: 75 XP
// Level 3: 112 XP
// Level 4: 168 XP
// ...
```

### Leaderboard Semanal

- Reset toda segunda-feira
- Ranking por melhor score da semana
- Top 3 com medalhas (👑🥈🥉)
- Destaque para o jogador atual

---

## 🔌 APIs e Integrações

### APIs do DogData (DOG Token)

```typescript
// Stats globais
GET https://www.dogdata.xyz/api/dog-rune/stats

// Lista de holders
GET https://www.dogdata.xyz/api/dog-rune/holders?limit=100&page=1

// Top holders
GET https://www.dogdata.xyz/api/dog-rune/top-holders

// Resumo do airdrop
GET https://www.dogdata.xyz/api/airdrop/summary

// Análise forense
GET https://www.dogdata.xyz/api/forensic/summary
```

### Integração com Wallets (Futuro)

```typescript
// UniSat
window.unisat.requestAccounts()
window.unisat.getAccounts()

// Xverse
window.XverseProviders.BitcoinProvider.request('getAccounts', {})

// Leather
window.LeatherProvider.request('getAddresses')
```

### Integração com DogCity (Futuro)

```typescript
// Como iframe
<iframe src="https://game.dogcity.xyz" />

// Como componente
import { DogCityGame } from '@dogcity/game-module'

// Como microfrontend
// Via Module Federation ou similar
```

---

## 👨‍💻 Desenvolvimento

### Padrões de Código

- **TypeScript** para type safety
- **Functional Components** com hooks
- **Tailwind CSS** para estilização
- **Framer Motion** para animações
- **Three.js** para 3D

### Estrutura de Componentes

```typescript
// Componente típico
export default function ComponentName({ prop1, prop2 }: Props) {
  const [state, setState] = useState(initialValue)
  
  useEffect(() => {
    // Side effects
  }, [dependencies])
  
  const handleClick = () => {
    // Event handler
  }
  
  return (
    <div className="...">
      {/* JSX */}
    </div>
  )
}
```

### Animações com Framer Motion

```typescript
// Animação de entrada
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>

// Hover effect
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
  Click me
</motion.button>
```

### 3D com Three.js

```typescript
// Mesh básico
<mesh position={[0, 0, 0]}>
  <boxGeometry args={[1, 1, 1]} />
  <meshStandardMaterial color="red" />
</mesh>

// Animação com useFrame
useFrame((state) => {
  meshRef.current.rotation.y += 0.01
})

// Post-processing
<EffectComposer>
  <Bloom intensity={1.5} />
</EffectComposer>
```

### Testes (Futuro)

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

---

## 🚢 Deploy

### Vercel (Recomendado)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production
vercel --prod
```

### Netlify

```bash
# Build
npm run build

# Deploy dist/ folder
# Via Netlify dashboard ou CLI
```

### Docker (Futuro)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM nginx:alpine
COPY --from=0 /app/dist /usr/share/nginx/html
```

### Integração com DogCity

**Opção 1: Iframe**
```html
<iframe 
  src="https://game.dogcity.xyz" 
  width="100%" 
  height="800px"
  frameborder="0"
/>
```

**Opção 2: Subdomínio**
```
game.dogcity.xyz → Deploy separado
```

**Opção 3: Subpath**
```
dogcity.xyz/game → Mesmo deploy
```

---

## 🗺️ Roadmap

### Fase 1: MVP (Atual) ✅

- [x] Sistema básico de jogo
- [x] Gráficos 3D com Three.js
- [x] Economia dual (Stardust/Pó Lunar)
- [x] Sistema de upgrades
- [x] Cosméticos
- [x] Missões diárias
- [x] Leaderboard semanal
- [x] Persistência local

### Fase 2: Integração Bitcoin

- [ ] Conectar carteira real (UniSat/Xverse)
- [ ] Consultar saldo DOG via indexer
- [ ] Calcular tier baseado em saldo real
- [ ] Salvar progresso em backend

### Fase 3: Backend

- [ ] API REST com Next.js
- [ ] Banco de dados (PostgreSQL)
- [ ] Autenticação com wallet
- [ ] Leaderboard global
- [ ] Histórico de transações

### Fase 4: Torneios

- [ ] Sistema de torneios com DOG
- [ ] Escrow de DOG
- [ ] Entry receipts
- [ ] Premiação automática
- [ ] Dashboard administrativo

### Fase 5: Expansão

- [ ] Novas rotas e missões
- [ ] Sistema de conquistas
- [ ] Multiplayer
- [ ] NFTs de cosméticos
- [ ] Marketplace

### Fase 6: DogCity Integration

- [ ] Integrar como módulo do DogCity
- [ ] Usar lore e assets do DogCity
- [ ] Conectar com sistema de terrenos
- [ ] Integração com Founders Program

---

## 📚 Recursos

### Documentação

- [React Docs](https://react.dev/)
- [Three.js Docs](https://threejs.org/docs/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [Framer Motion](https://www.framer.com/motion/)
- [Tailwind CSS](https://tailwindcss.com/docs)

### DogCity

- [DogCity Website](https://www.dogdata.xyz/dogcity)
- [DogCity Docs](https://www.dogdata.xyz/dogcity/docs)
- [DOG Token Info](https://www.dogdata.xyz/)

### Comunidade

- [DOG Telegram](https://t.me/dogcommunity)
- [DOG Twitter](https://twitter.com/dog_token)

---

## 🤝 Contribuindo

### Como Contribuir

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Estilo de Código

- Use TypeScript
- Siga os padrões existentes
- Comente código complexo
- Teste suas mudanças

---

## 📄 Licença

Este projeto é parte do ecossistema DogCity e segue as diretrizes da comunidade DOG.

---

## 📞 Contato

Para dúvidas ou sugestões:
- Abra uma issue no GitHub
- Entre em contato com a equipe DogCity
- Participe da comunidade DOG

---

**Desenvolvido com ❤️ para a comunidade DogCity**

*Última atualização: Setembro 2026*
