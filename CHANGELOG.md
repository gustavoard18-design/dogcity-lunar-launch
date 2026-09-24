# Novidades

## 2.5.1 (setembro de 2026): ajustes no celular
- **Voo estável no celular**: durante o voo a página do hangar fica travada, então arrastar o dedo não rola mais a tela nem faz a barra do navegador (Xverse, Safari) aparecer e sumir.
- **Painéis sem falhas no iPhone**: no celular os painéis não usam mais o desfoque de fundo, que no Safari e nos navegadores das carteiras cortava títulos (como "Loja") e os cantos luminosos.
- **Abas do hangar cabem na tela do celular** (ícone em cima, nome embaixo), sem ficarem cortadas nas pontas.
- Botões do fim do voo com o texto centralizado no celular.

## 2.5.0 (setembro de 2026): pronto para o lançamento
- **Login com assinatura da carteira**: ao conectar, a carteira assina uma mensagem grátis (não move fundos). Só o dono da carteira entra no ranking, faz pedidos de baú e salva progresso com aquele endereço. Quem recusar continua jogando, com um aviso para assinar depois.
- **Progresso na nuvem** para carteiras verificadas: o piloto volta num aparelho novo ou depois de limpar o navegador. Baús pagos são recreditados em qualquer aparelho.
- **Termos de Uso e Política de Privacidade** (EN, PT e ES) na tela inicial, no rodapé e na loja de baús, com as chances de cada baú.
- **Suporte**: link para abrir um chamado, já com o pedido de baú preenchido quando há um.
- **Monitoramento**: checagem do site e do backend a cada hora, com chamado aberto automaticamente quando algo cai. Publicação automática do Supabase pelo GitHub Actions.

## 2.4.0 (setembro de 2026): engajamento e baús
- **Desafio entre amigos**: "Desafiar um amigo" gera um link com a mesma rota e os mesmos asteroides, orbes e anéis (semente do voo). Quem abre vê o desafio no hangar (vale até em rota ainda bloqueada) e o resultado compara os dois scores.
- **Sequência de dias**: recompensa diária num ciclo de 7 dias e a moldura 🔥 Chama Eterna aos 30 dias seguidos.
- **Temporadas mensais**: passe de 10 níveis (10 + score/10 pontos por voo concluído), ranking do mês e uma moldura exclusiva por temporada.
- **Guerra de distritos do DogCity**: cada piloto soma o melhor voo de cada rota para o seu distrito; o distrito campeão da semana ganha Stardust, Pó Lunar e a moldura 🏙️ Distrito Campeão.
- **Baús DOG**: três baús pagos em DOG (Suprimentos, Orbital e Lendário) com Stardust e Pó Lunar sorteados com chances publicadas, limite de 1 por dia e 5 por semana por carteira, pagamento conferido on-chain antes de abrir.
- **Métricas anônimas de uso** (sem endereço de carteira) para acompanhar retenção e funil.

## 2.3.0 (setembro de 2026)
- **Editar o nome do astronauta**: lápis ao lado do nome no perfil (2 a 20 caracteres; letras com acento, números, espaço e - _ ' .). O ranking online mostra o nome novo a partir do próximo voo concluído.
- Seletor de idioma com menu próprio, escuro e legível (o menu nativo ficava cinza claro sobre branco).
- A vitrine da Loja e da Oficina volta às artes 2D originais do foguete, com o formato mudando a cada fase.
- **Identidade DogData**: quem tem perfil no DogData aparece com o **avatar Ordinal** e o **@handle** escolhidos lá, no perfil do jogo e no ranking (com link para a página da carteira no DogData).
- **Lote no DogCity completo**: rua, número, zona e prestígio (estrelas) no cartão do lote.

## 2.2.0 (setembro de 2026): três idiomas
- **Inglês como idioma padrão**, com **português** e **espanhol** no seletor 🌐 (tela inicial e topo do hangar). A escolha fica salva no navegador; trocar recarrega o jogo e volta ao hangar do mesmo piloto.
- Tudo traduzido: telas, missão e tutorial, rotas, eventos, conquistas, títulos, missões, Loja, Oficina, molduras, ranking, Diário, cartão e texto de compartilhamento, mensagens de carteira.
- Voos antigos, raças e o piloto convidado (guardados em português) aparecem no idioma escolhido.
- Prévia do link (imagem e textos), manifesto do app e descrição da página em inglês.

## 2.1.1 (setembro de 2026): ajustes para o lançamento
- **Foguete Bitcoin também nas artes 2D**: tela inicial e ícones agora mostram o mesmo foguete do 3D.
- **Moldura de nome no cartão de compartilhamento**: o nome sai com a mesma moldura escolhida no perfil.
- **Carteiras no celular**: Xverse e OKX ganham o botão "Abrir no app", que abre o jogo no navegador interno da carteira.
- Quem instalou o app recebe as artes novas: cada publicação usa um cache novo no aparelho.

## 2.1.0 (setembro de 2026): lançamento

### Jogo
- **Evento semanal**: uma rota especial por semana, em rodízio de 5 (Chuva de Meteoros, Anéis de Saturno, Tempestade Solar, Caçada ao Cometa e Maratona Marciana), com bônus por qualidade mínima.
- **Pódio do evento**: o top 3 da semana ganha Stardust, Pó Lunar e moldura de nome exclusiva, entregues ao entrar no jogo.
- **Conquistas**: 28 metas permanentes (4 secretas); cada uma vira um **título** do piloto.
- **Molduras de nome**: 7 estilos para o nome no perfil e no ranking.
- **Ranking** com abas Geral e Evento, títulos e molduras.
- **Tutorial do primeiro voo** com dicas passo a passo e medidores mais lentos.
- **Compartilhar resultado**: imagem do voo para mandar nas redes.
- **Diário**: carreira do piloto com os números de toda a vida.

### Visual e som
- Foguete **Bitcoin** e **DOG astronauta** em 3D, gerados a partir das artes (3D AI Studio); o DOG embarca com um pulo e aparece na escotilha.
- Base Lunar nova: crateras, pedras, cordilheiras com a Terra nascendo, torre de serviço, holofotes, jipe, painéis solares.
- Fundo do voo com rochas gigantes, satélite e asteroides variados por rota.
- Suavização de bordas, sombras de contato e mais nitidez em telas de alta densidade.
- **Trilha sonora** gerada em tempo real (hangar, base e voo), com botão próprio.

### Plataforma
- **Instalável como app** (PWA) e funcionando offline com o que já foi carregado.
- Ranking online e dados DOG reais (saldo, holder, Genesis, lote no DogCity) via Supabase e DogData; carteiras Kray, Xverse e OKX.
- Prévia do link com imagem (WhatsApp, X, Discord).
- Se o 3D falhar no aparelho, o jogo avisa e devolve o custo da missão.
- O modo de desenvolvimento não envia scores ao ranking real.
- CI em Node 22 e 24; 40 testes das regras do jogo.

## 2.0.0 (setembro de 2026)
- Jogo 3D completo com as artes oficiais: mira e força por timing, voo pilotável, 4 rotas, Oficina, Loja, missões diárias, evolução visual e ranking local.
