# Backend (Supabase)

Projeto `dogcity-lunar-launch` (ref `uknupldacjxbuoiaucfc`). O jogo chama tudo só com a chave publicável (`src/lib/online.ts`).

## O que está publicado

| Parte | Onde | Estado |
|---|---|---|
| Migrações até `20260925010000_chest_orders.sql` | `migrations/` | aplicadas (25/09/2026) |
| Função `dog-balance` (saldo DOG, lote DogCity, identidade DogData) | `functions/dog-balance/` | publicada (25/09/2026) |
| Função `chests` (baús pagos em DOG) | `functions/chests/` + `functions/_shared/` | publicada; versão 2.5.0 (exige sessão) publicada em 26/09/2026 |
| Migração `20260926000000_wallet_sessions.sql` (sessões, `submit_score_v3`, progresso na nuvem) | `migrations/` | aplicada (26/09/2026) |
| Migração `20260927000000_dog_drops.sql` (prêmio acumulado e moedas de DOG no voo) | `migrations/` | **falta aplicar** |
| Função `dog-drops` (sorteio da moeda de DOG na decolagem) | `functions/dog-drops/` + `_shared/drops.json`, `drop-rules.ts`, `auth-rules.ts`, `chest-rules.ts` | **falta publicar** |
| Função `auth` (login com assinatura da carteira) | `functions/auth/` + `functions/_shared/auth-rules.ts` | publicada (26/09/2026) |

Consultas de métricas prontas em `queries/metrics.sql` (rodar no SQL editor).

## Como publicar

**Pelo terminal** (precisa do login da conta):

```bash
npx supabase login
npx supabase link --project-ref uknupldacjxbuoiaucfc
npx supabase db push
npx supabase functions deploy dog-balance --no-verify-jwt
npx supabase functions deploy chests --no-verify-jwt
npx supabase functions deploy auth --no-verify-jwt
npx supabase functions deploy dog-drops --no-verify-jwt
```

**Pelo GitHub Actions**: com os segredos `SUPABASE_ACCESS_TOKEN` e `SUPABASE_DB_PASSWORD` no repositório, o workflow **Supabase deploy** faz os passos acima sozinho a cada push em `supabase/` na `main` (ou em Actions → Supabase deploy → Run workflow).

**Pelo painel** (como foi feito até agora):

- Migrações: SQL Editor → colar o arquivo → Run. Preferir funções novas (`_v2`) a apagar e recriar: `drop function` faz o painel pedir confirmação de operação destrutiva e derruba quem estiver com a versão antiga do jogo aberta.
- Funções: Edge Functions → editor. O painel guarda os arquivos de `_shared/` **dentro da própria função**, então no `index.ts` de `chests` os imports ficam `./chests.json` e `./chest-rules.ts` (no repositório são `../_shared/...`). O resto do código é idêntico.
- `auth` e `chests` (2.5.0) importam `../_shared/auth-rules.ts`: no painel, copie `auth-rules.ts` para dentro de cada função e troque o import por `./auth-rules.ts`. A `auth` usa os pacotes `npm:bip322-js@4` e `npm:bitcoinjs-lib@7` (o painel baixa sozinho).
- As funções precisam aceitar chamadas sem JWT de usuário (o jogo manda só a chave publicável).
- Ordem na 2.5.0: aplicar a migração **antes** de publicar a nova `chests` (ela usa a função `session_of`). O site pode ir antes ou depois: sem a migração, o jogo volta ao envio antigo de voos.
- Conferir depois: `node scripts/health-check.mjs` (tudo ✅).

## Atenção

- `functions/_shared/chests.json` define preços, chances e a **tesouraria** que recebe o DOG dos baús (`bc1qv4q4j8mjxhjxwjuc7vy6sq7c57z6rdvteql4xy`, confirmada pelo dono do projeto em 25/09/2026). Mudou preço, chance ou tesouraria: publicar a função `chests` de novo, senão o servidor confere com os valores antigos.
- As tabelas `scores`, `chest_orders`, `analytics_events`, `dog_balances`, `dogdata_identities`, `wallet_sessions` e `player_saves` não são acessíveis pela API pública; só as funções (service role) e as RPCs leem/escrevem.

## Prêmio acumulado (moedas de DOG no voo)

- `drops.json` define a regra: 50% dos baús pagos vão para o prêmio (`poolShare`), chance por voo (`dropChance`, ~1 em 150), fatia do prêmio por moeda (`minPct`–`maxPct`, entre `minDropDog` e `maxDropDog`), limites por carteira. Mudou a regra: publicar `dog-drops` de novo (o jogo lê o mesmo arquivo).
- No painel, a função `dog-drops` precisa de `drops.json`, `drop-rules.ts`, `auth-rules.ts` e `chest-rules.ts` (com `chests.json`) dentro dela, com os imports trocados para `./`.
- **Pagar um ganhador**: Table editor → `dog_drops` → linhas com `status = 'pending'`. Envie `amount_dog` DOG da tesouraria para `address` e depois edite a linha: `status = 'paid'`, `txid` = id da transação, `paid_at` = agora. O jogador vê "pago" com o link da transação. Para cancelar (trapaça comprovada), `status = 'cancelled'`: o valor volta para o prêmio.
- Consultar o prêmio: `select * from jackpot_state(0.5, 15);`
