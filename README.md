# 🐕‍🦺🚀 DogCity Lunar Launch

<div align="center">

![DogCity Logo](https://img.shields.io/badge/DogCity-Lunar%20Launch-purple?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.3-blue?style=flat-square&logo=react)
![Three.js](https://img.shields.io/badge/Three.js-0.160-green?style=flat-square&logo=three.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**Um jogo 3D de lançamento espacial integrado ao ecossistema DogCity**

[Documentação Completa](./WIKI.md) • [Demo](#-demo) • [Instalação](#-instalação) • [Como Jogar](#-como-jogar)

</div>

---

## 🎮 Sobre o Jogo

DogCity Lunar Launch é um jogo 3D onde você controla cães astronautas em missões de lançamento espacial. Ganhe Stardust, evolua seu cão, compre upgrades e cosméticos, e compita no leaderboard semanal!

### ✨ Features

- 🎨 **Gráficos 3D AAAA** com Three.js e React Three Fiber
- 🐕 **Sistema de pets** com 4 stats evolutivos
- 🚀 **4 rotas de lançamento** com dificuldades variadas
- 💎 **Economia dual** (Stardust + Pó Lunar)
- 🎯 **Missões diárias** renováveis
- 🏆 **Leaderboard semanal** competitivo
- 🔧 **Sistema de upgrades** com 10 níveis por stat
- 🎨 **Cosméticos** com 4 raridades
- 🔗 **Integração Bitcoin** (preparado para UniSat/Xverse)

---

## 🚀 Instalação

### Pré-requisitos

- Node.js 18+ e npm
- Navegador moderno com WebGL 2.0

### Passos

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/dogcity-game.git
cd dogcity-game

# 2. Instale as dependências
npm install

# 3. Rode em desenvolvimento
npm run dev

# 4. Abra no navegador
# http://localhost:5173
```

### Build para Produção

```bash
# Buildar
npm run build

# Preview da build
npm run preview
```

---

## 🎯 Como Jogar

### 1. Conectar Wallet

Ao iniciar o jogo, clique em **"🔗 Conectar Wallet"**. O jogo gerará uma wallet mockada automaticamente com:
- 100 Stardust iniciais
- Um cão astronauta aleatório
- Saldo de DOG baseado no endereço

### 2. Escolher uma Rota

Na aba **"🚀 Lançar"**, escolha uma das 4 rotas:

| Rota | Custo | Dificuldade | Recompensa |
|------|-------|-------------|------------|
| 🌍 Órbita Baixa | 10 ✨ | ★☆☆☆ | 1x |
| 🌙 Mar da Tranquilidade | 25 ✨ | ★★☆☆ | 1.8x |
| ☄️ Cinturão de Asteroides | 50 ✨ | ★★★☆ | 3x |
| 🔴 Colônia de Marte | 100 ✨ | ★★★★ | 5x |

### 3. Lançar o Foguete

1. Clique em **"🎯 Mirar"**
2. Ajuste o **ângulo** (15° a 80°)
3. Aguarde a barra de **power** carregar
4. Clique em **"🚀 LANÇAR!"**
5. Veja o foguete 3D voando!

### 4. Ganhar Recompensas

- **Sucesso**: Ganha Stardust + XP + possível Pó Lunar
- **Falha**: Ganha apenas 10% do score em Stardust
- **Level Up**: Ganhe XP para subir de nível e desbloquear rotas

### 5. Evoluir seu Cão

Na aba **"🔧 Upgrades"**, melhore os stats:
- 🔥 **Power**: Carrega mais rápido
- 🎯 **Accuracy**: Zona de acerto maior
- 🍀 **Luck**: Mais chance de sucesso
- 💨 **Speed**: Foguete mais rápido

### 6. Completar Missões

Na aba **"📋 Missões"**, complete missões diárias para ganhar recompensas extras!

### 7. Comprar Cosméticos

Na aba **"🎨 Loja"**, compre skins, capacetes e rastros para customizar seu cão!

---

## 📁 Estrutura do Projeto

```
dogcity-game/
├── src/
│   ├── components/          # Componentes React
│   │   ├── ConnectWallet.tsx
│   │   ├── PlayerProfile.tsx
│   │   ├── Game3D.tsx
│   │   ├── SpaceScene3D.tsx
│   │   └── ...
│   ├── lib/                 # Lógica de negócio
│   │   ├── economy.ts       # Rotas, tiers, cálculos
│   │   ├── missions.ts      # Sistema de missões
│   │   ├── shop.ts          # Upgrades e cosméticos
│   │   ├── storage.ts       # Persistência
│   │   └── wallet.ts        # Mock de carteira
│   ├── types.ts             # Definições de tipos
│   ├── App.tsx              # Componente principal
│   └── main.tsx             # Entry point
├── public/                  # Assets estáticos
├── WIKI.md                  # Documentação completa
├── README.md                # Este arquivo
└── package.json             # Dependências
```

---

## 🛠️ Tecnologias

### Core
- **React 18** - UI Framework
- **TypeScript** - Type Safety
- **Vite** - Build Tool
- **Tailwind CSS** - Styling

### 3D e Gráficos
- **Three.js** - 3D Rendering
- **React Three Fiber** - React for Three.js
- **React Three Drei** - Helpers 3D
- **Postprocessing** - Efeitos visuais

### Animações
- **Framer Motion** - Animações declarativas
- **Canvas Confetti** - Efeitos de celebração

---

## 📚 Documentação

- [**WIKI.md**](./WIKI.md) - Documentação completa do projeto
- [**3D_GAME_DOCUMENTATION.md**](./3D_GAME_DOCUMENTATION.md) - Detalhes dos gráficos 3D
- [**VISUAL_IMPROVEMENTS.md**](./VISUAL_IMPROVEMENTS.md) - Melhorias visuais implementadas
- [**COMO_GERAR_ZIP.md**](./COMO_GERAR_ZIP.md) - Como gerar ZIP do projeto

---

## 🔗 Integração com DogCity

Este jogo é um módulo independente que pode ser integrado ao DogCity de várias formas:

### Como Iframe
```html
<iframe src="https://game.dogcity.xyz" width="100%" height="800px" />
```

### Como Componente
```typescript
import { DogCityGame } from '@dogcity/game-module'

function App() {
  return <DogCityGame />
}
```

### Como Microfrontend
Via Module Federation ou similar (configuração futura)

---

## 🗺️ Roadmap

### ✅ Fase 1: MVP (Atual)
- [x] Sistema básico de jogo
- [x] Gráficos 3D com Three.js
- [x] Economia dual
- [x] Sistema de upgrades
- [x] Cosméticos
- [x] Missões diárias
- [x] Leaderboard semanal

### 🔄 Fase 2: Integração Bitcoin
- [ ] Conectar carteira real (UniSat/Xverse)
- [ ] Consultar saldo DOG via indexer
- [ ] Calcular tier baseado em saldo real

### 📋 Fase 3: Backend
- [ ] API REST com Next.js
- [ ] Banco de dados (PostgreSQL)
- [ ] Autenticação com wallet
- [ ] Leaderboard global

### 🏆 Fase 4: Torneios
- [ ] Sistema de torneios com DOG
- [ ] Escrow de DOG
- [ ] Premiação automática

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Veja como contribuir:

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto é parte do ecossistema DogCity e segue as diretrizes da comunidade DOG.

---

## 📞 Contato

- **DogCity**: [dogdata.xyz/dogcity](https://www.dogdata.xyz/dogcity)
- **DOG Token**: [dogdata.xyz](https://www.dogdata.xyz/)
- **Comunidade**: [Telegram](https://t.me/dogcommunity)

---

<div align="center">

**Desenvolvido com ❤️ para a comunidade DogCity**

[⭐ Star this repo](https://github.com/seu-usuario/dogcity-game) • [🐛 Report Bug](https://github.com/seu-usuario/dogcity-game/issues) • [💡 Request Feature](https://github.com/seu-usuario/dogcity-game/issues)

</div>
