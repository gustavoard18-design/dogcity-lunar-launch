# Guia de lançamento

## 1. Publicar o backend (uma vez)

Opção automática (recomendada): em **GitHub → Settings → Secrets and variables → Actions → New repository secret**, crie:

| Segredo | Onde pegar |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | supabase.com → Account → Access Tokens → Generate new token |
| `SUPABASE_DB_PASSWORD` | Supabase → Project Settings → Database → senha do banco (ou "Reset database password") |

Depois, em **Actions → Supabase deploy → Run workflow**. A partir daí, todo push em `supabase/` na `main` publica sozinho.

Opção manual: pelo terminal (abaixo) ou pelo painel, como descrito em [supabase/README.md](../supabase/README.md).

```bash
supabase link --project-ref uknupldacjxbuoiaucfc
supabase db push
supabase functions deploy auth --no-verify-jwt
supabase functions deploy chests --no-verify-jwt
supabase functions deploy dog-balance --no-verify-jwt
supabase functions deploy dog-drops --no-verify-jwt
```

Conferir: `node scripts/health-check.mjs` deve mostrar só ✅.

> Ordem: pode publicar o site antes ou depois do backend. Até a migração
> `20260926000000_wallet_sessions.sql` entrar, o jogo segue enviando voos no
> formato antigo; depois dela, só voos com sessão (carteira assinada ou convidado) entram no ranking.

## 2. Checklist do dia do lançamento

- [ ] `node scripts/health-check.mjs`: tudo ✅ (o workflow **Health check** também roda a cada hora).
- [ ] Conectar com Xverse, OKX e Kray: a carteira pede a assinatura e o aviso "Verifique sua carteira" some.
- [ ] Comprar 1 baú de verdade e conferir na carteira o valor de **1.500 DOG** antes de assinar.
- [ ] Abrir o jogo em outro navegador com a mesma carteira: aparece "Progresso recuperado da nuvem".
- [ ] Celular: botão "Abrir no app" da Xverse e da OKX.
- [ ] Em **Settings → Notifications** do GitHub, deixar ligados os e-mails de Actions e de Issues (é por eles que chegam os alertas e os chamados de suporte).
- [ ] Depois de 24 h: rodar `supabase/queries/metrics.sql` (jogadores, funil, onde perdem a nave).

## 3. Suporte

O link **Suporte** do jogo abre um chamado em GitHub Issues (precisa de conta no GitHub). Para usar outro canal (Telegram, Discord, X), troque `SUPPORT_URL` em `src/components/LegalLinks.tsx`.

Baú pago que não abriu: o chamado já vem com o id do pedido e o txid. Confira em `chest_orders` (Supabase → Table editor) e no DogData (`/api/dog-rune/search-tx?txid=...`). Se o pagamento estiver certo, mude o pedido para `status = 'paid'`, com o `txid` e o prêmio em `reward` (ex.: `{"stardust": 250, "lunarDust": 2}`): o jogo credita na próxima entrada do jogador. Pedido cancelado sem txid: crie um novo com esses campos (o `txid` não pode repetir).

Pedido de apagar dados (Política de Privacidade): apague as linhas do endereço em `scores`, `player_saves` e `wallet_sessions`. Mantenha `chest_orders`, que é o registro de pagamento.

## 3b. Pagar as moedas de DOG

Uma vez por semana (ou quando chegar o aviso de ganhador), abra `dog_drops` no Supabase, envie o DOG de cada linha `pending` para o endereço e marque `paid` com o txid (passo a passo em `supabase/README.md`). Os Termos prometem o envio em até 7 dias.

## 4. Posts de divulgação

Link: https://gustavoard18-design.github.io/dogcity-lunar-launch/
Imagem: `public/og-image.jpg` (já aparece sozinha na prévia do link).

**EN**
> 🚀 DogCity Lunar Launch is live!
> Pilot your astronaut $DOG from the DogCity Lunar Base to Earth orbit, the Moon, Ceres and Mars.
> • Free to play in the browser, no download
> • Connect Xverse, OKX or Kray: your real DOG balance sets your rank
> • Weekly events, monthly seasons and the DogCity district war
> • Challenge a friend with the exact same flight
> Play: https://gustavoard18-design.github.io/dogcity-lunar-launch/

**PT**
> 🚀 O DogCity Lunar Launch está no ar!
> Pilote seu $DOG astronauta da Base Lunar do DogCity até a órbita da Terra, a Lua, Ceres e Marte.
> • Grátis, direto no navegador
> • Conecte a Xverse, a OKX ou a Kray: seu saldo real de DOG define sua patente
> • Eventos semanais, temporadas mensais e a guerra de distritos do DogCity
> • Desafie um amigo no mesmo voo, com os mesmos asteroides
> Jogue: https://gustavoard18-design.github.io/dogcity-lunar-launch/

**ES**
> 🚀 ¡DogCity Lunar Launch ya está en vivo!
> Pilotea tu $DOG astronauta desde la Base Lunar de DogCity hasta la órbita de la Tierra, la Luna, Ceres y Marte.
> • Gratis, en el navegador
> • Conecta Xverse, OKX o Kray: tu saldo real de DOG define tu rango
> • Eventos semanales, temporadas mensuales y la guerra de distritos de DogCity
> • Desafía a un amigo en el mismo vuelo
> Juega: https://gustavoard18-design.github.io/dogcity-lunar-launch/

Onde postar: X (marcando o DogData e a comunidade $DOG), grupos de Telegram/Discord do DOG, e um pedido ao DogData para colocar o jogo no site. Nos primeiros dias, repostar os melhores voos: o cartão de compartilhamento e o link de desafio foram feitos para isso.

## 5. Domínio próprio (opcional)

1. Compre o domínio (ex.: `play.dogcity.xyz`) e crie um registro **CNAME** apontando para `gustavoard18-design.github.io`.
2. Crie `public/CNAME` com uma linha: o domínio (ex.: `play.dogcity.xyz`).
3. Troque o endereço antigo pelo novo em `index.html` (canonical, og:url, og:image, twitter:image) e em `GAME_URL` (`src/lib/shareCard.ts`), e no `SITE_URL` de `scripts/health-check.mjs`.
4. Faça push. Em **Settings → Pages**, confirme o domínio e marque **Enforce HTTPS**.

O jogo usa caminhos relativos, então funciona no domínio novo sem outra mudança. O progresso salvo só no navegador fica preso ao endereço antigo: por isso vale fazer a troca **antes** do lançamento. Quem tiver carteira verificada recupera o progresso pela nuvem.
