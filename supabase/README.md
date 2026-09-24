# Backend (Supabase)

Projeto `dogcity-lunar-launch` (ref `uknupldacjxbuoiaucfc`). O jogo chama tudo só com a chave publicável (`src/lib/online.ts`).

## O que está publicado

| Parte | Onde | Estado |
|---|---|---|
| Migrações até `20260925010000_chest_orders.sql` | `migrations/` | aplicadas (25/09/2026) |
| Função `dog-balance` (saldo DOG, lote DogCity, identidade DogData) | `functions/dog-balance/` | publicada (25/09/2026) |
| Função `chests` (baús pagos em DOG) | `functions/chests/` + `functions/_shared/` | publicada (25/09/2026) |

Consultas de métricas prontas em `queries/metrics.sql` (rodar no SQL editor).

## Como publicar

**Pelo terminal** (precisa do login da conta):

```bash
npx supabase login
npx supabase link --project-ref uknupldacjxbuoiaucfc
npx supabase db push
npx supabase functions deploy dog-balance --no-verify-jwt
npx supabase functions deploy chests --no-verify-jwt
```

**Pelo painel** (como foi feito até agora):

- Migrações: SQL Editor → colar o arquivo → Run. Preferir funções novas (`_v2`) a apagar e recriar: `drop function` faz o painel pedir confirmação de operação destrutiva e derruba quem estiver com a versão antiga do jogo aberta.
- Funções: Edge Functions → editor. O painel guarda os arquivos de `_shared/` **dentro da própria função**, então no `index.ts` de `chests` os imports ficam `./chests.json` e `./chest-rules.ts` (no repositório são `../_shared/...`). O resto do código é idêntico.
- As funções precisam aceitar chamadas sem JWT de usuário (o jogo manda só a chave publicável).

## Atenção

- `functions/_shared/chests.json` define preços, chances e a **tesouraria** que recebe o DOG dos baús (`bc1qv4q4j8mjxhjxwjuc7vy6sq7c57z6rdvteql4xy`, confirmada pelo dono do projeto em 25/09/2026). Mudou preço, chance ou tesouraria: publicar a função `chests` de novo, senão o servidor confere com os valores antigos.
- As tabelas `scores`, `chest_orders`, `analytics_events`, `dog_balances` e `dogdata_identities` não são acessíveis pela API pública; só as funções (service role) e as RPCs leem/escrevem.
