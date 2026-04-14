# Gaps Arquiteturais — Score Cripto

Análise do que está faltando ou incompleto na arquitetura atual, com base na leitura completa da codebase. Itens ordenados por prioridade.

---

## 🔴 Crítico — Afeta produção

### 1. Dead Letter Queue (DLQ) no RabbitMQ

**Status:** ✅ IMPLEMENTED
**Solução implementada:**
- DLX `score-cripto.events.dlx` (direct, durable) declarado por cada consumer antes das filas de origem
- Uma DLQ por fila de origem (`<queue>.dlq`), vinculada ao DLX com routing key própria
- Todos os `nack(false, true)` convertidos para `nack(false, false)` — mensagens com falha vão para a DLQ em vez de loop infinito
- Helpers de topologia: `dlq-topology.ts` (Node), `dlq_topology.go` (Go), `dlq_topology.ex` (Elixir)

**DLQs criadas:**
- `api-gateway.wallet.score.calculated.dlq`
- `api-gateway.wallet.score.failed.dlq`
- `process-data-ia.wallet.data.cached.dlq`
- `users.user.analysis.consumed.dlq`
- `data-search.wallet.data.requested.dlq`
- `data-indexing.wallet.events.dlq`

**Próximos passos:** `score-cripto-51x` — retry com backoff exponencial sobre a infra de DLQ

**Serviços afetados:** `api-gateway`, `data-search`, `process-data-ia`, `data-indexing`, `users`

---

### 2. Observabilidade — Logging estruturado, Tracing e Métricas

**Status:** MISSING
**Problema:** Todos os serviços usam `console.log` simples. Em produção, com 5 serviços em 4 linguagens diferentes, rastrear um bug cross-service é inviável sem logs estruturados e distributed tracing.

**Solução mínima recomendada:**

| Camada | Ferramenta | Serviços |
|--------|-----------|---------|
| Logging estruturado | Pino (Node.js), slog (Go), Logger OTP (Elixir) | Todos |
| Distributed Tracing | OpenTelemetry SDK | Todos |
| Métricas | Prometheus + Grafana ou Datadog | Todos |
| Agregação de logs | Loki + Grafana ou Datadog Logs | Todos |

Cada log deve incluir: `requestId`, `userId`, `chain`, `address`, `service`, `level`, `timestamp`.

**Serviços afetados:** todos

---

### 3. Rate Limiting HTTP no api-gateway

**Status:** MISSING
**Problema:** O gateway valida limites de análise por plano (FREE_TIER: 5/mês, PRO: 15/mês) via chamada HTTP ao `users` service, mas não tem rate limiting de infraestrutura. Sem isso, é possível fazer flood de requests autenticados e causar carga desnecessária no pipeline.

**Solução:** Adicionar `@fastify/rate-limit` no api-gateway com limites por IP e por `userId` extraído do JWT.

```typescript
import rateLimit from '@fastify/rate-limit'

await app.register(rateLimit, {
  max: 60,           // 60 requests/minuto por chave
  timeWindow: '1 minute',
  keyGenerator: (req) => req.user?.id ?? req.ip,
})
```

**Serviços afetados:** `api-gateway`

---

## 🟡 Importante — Afeta robustez

### 4. Retry com Backoff Exponencial + Max Tentativas nos Consumers

**Status:** ✅ PARTIAL IMPLEMENTED (Node/Go — data-indexing em follow-up)
**Solução implementada:**
- Retry queue por fila de origem (`<queue>.retry`) com `x-dead-letter-exchange` apontando de volta para a origem via TTL nativo do RabbitMQ (zero plugins)
- `x-retry-count` header incrementado a cada tentativa; jitter ±10% anti-thundering-herd
- Após `MAX_RETRIES = 3` (delays 1s / 2s / 4s), mensagem vai para DLQ
- Helpers: `retry-topology.ts` (Node), `retry_topology.go` (Go)

**Retry queues criadas:**
- `api-gateway.wallet.score.calculated.retry`
- `api-gateway.wallet.score.failed.retry`
- `process-data-ia.wallet.data.cached.retry`
- `users.user.analysis.consumed.retry`
- `data-search.wallet.data.requested.retry`

**Escopo não coberto:** `data-indexing` (Broadway/Elixir) mantém `:reject_and_requeue_once` — 1 retry imediato antes da DLQ. Implementação com backoff customizado é issue separada.

**Serviços afetados:** `api-gateway`, `process-data-ia`, `users`, `data-search`

---

### 5. CI/CD Pipeline

**Status:** MISSING
**Problema:** Não existe nenhum pipeline de CI/CD (`.github/workflows`, GitLab CI, etc.). Qualquer push pode quebrar produção sem detecção automática.

**Solução mínima:** GitHub Actions com os seguintes stages por serviço:

```
lint → test → build Docker → push registry → deploy (staging)
```

Pipeline sugerido por serviço:
- **Node.js services:** `pnpm lint` → `pnpm test` → `docker build`
- **Go (data-search):** `go vet` → `go test ./...` → `docker build`
- **Elixir (data-indexing):** `mix credo` → `mix test` → `docker build`

**Serviços afetados:** todos

---

### 6. Health Checks nos Workers

**Status:** PARTIAL (só `api-gateway` e `users` têm `/health`)
**Problema:** `process-data-ia` (Node.js worker) e `data-search` (Go worker) não expõem endpoint de health check. Orquestradores como Docker Swarm, Kubernetes ou ECS não conseguem detectar se esses serviços estão vivos.

**Solução:**
- `process-data-ia`: expor porta HTTP mínima (ex: `:3002/health`) que verifica conexão com RabbitMQ e PostgreSQL
- `data-search`: adicionar `GET /health` no servidor Go que verifica conexão com Redis e RabbitMQ

**Serviços afetados:** `process-data-ia`, `data-search`

---

## 🟠 Feature Incompleta — Afeta Produto

### 7. Bitcoin e Solana — Providers não implementados

**Status:** PARTIAL (normalização existe, providers não)
**Problema:** A normalização de endereços Bitcoin e Solana existe em `data-search/internal/infrastructure/provider/normalizer.go`, mas não há provider real para essas redes. Se um usuário tentar analisar uma carteira BTC ou SOL, receberá erro ou dados do mock provider.

**Decisão necessária:**
- **Opção A:** Implementar providers reais
  - Bitcoin: [Blockstream API](https://github.com/Blockstream/esplora/blob/master/API.md) (gratuito, sem API key)
  - Solana: [Helius API](https://helius.dev) ou [Solscan API](https://solscan.io)
- **Opção B:** Documentar explicitamente que só suporta EVM e retornar erro amigável para outras chains

**Serviços afetados:** `data-search`

---

### 8. data-indexing não integrado ao web-app

**Status:** MISSING (serviço construído mas não consumido)
**Problema:** O serviço `data-indexing` (Elixir + Meilisearch) indexa todas as carteiras analisadas com suporte a busca full-text, filtros por score, chain, risk flags, etc. Porém o `web-app` não usa esse serviço em nenhum lugar. A feature de descoberta/busca de carteiras está construída mas inacessível ao usuário.

**Decisão necessária:**
- **Opção A:** Integrar no web-app — adicionar página de busca que consome `GET /api/search` do `data-indexing (:4000)`
- **Opção B:** Cortar o serviço temporariamente para reduzir complexidade operacional, e reintroduzir quando a feature for priorizada

**Serviços afetados:** `data-indexing`, `web-app`

---

## 🔵 Nice to Have — Afeta Escala e Operações

### 9. Admin Panel

**Status:** MISSING
**Problema:** Não existem rotas ou interface admin. Sem isso, não é possível inspecionar scores manualmente, visualizar usage por usuário, forçar re-análise de uma carteira, ou fazer override de score em casos extremos.

**Sugestão:** Adicionar rotas protegidas por `role: ADMIN` no `api-gateway` e/ou `users` para operações básicas de backoffice.

---

### 10. WebSocket / SSE no lugar de Polling

**Status:** PARTIAL (polling a cada ~2s implementado)
**Problema:** O web-app faz polling periódico em `GET /analysis/{id}` para detectar quando o score fica pronto. Funciona em baixo volume, mas é ineficiente em escala — cada usuário com análise em andamento gera requests contínuos mesmo que o resultado demore 10-15 segundos.

**Solução:** Substituir polling por Server-Sent Events (SSE) no api-gateway. Quando o consumer receber `wallet.score.calculated`, emite o evento para o cliente conectado via SSE.

```typescript
// api-gateway: endpoint SSE
app.get('/analysis/:id/stream', async (req, reply) => {
  reply.raw.setHeader('Content-Type', 'text/event-stream');
  // aguarda evento e flush ao client quando score chegar
});
```

---

## Resumo Executivo

| # | Gap | Prioridade | Esforço estimado |
|---|-----|-----------|-----------------|
| 1 | Dead Letter Queue (DLQ) | 🔴 Crítico | Médio (~1 dia) |
| 2 | Observabilidade (logs + traces) | 🔴 Crítico | Alto (~3-5 dias) |
| 3 | Rate Limiting HTTP | 🔴 Crítico | Baixo (~2h) |
| 4 | Retry com backoff + max tentativas | 🟡 Importante | Médio (~1 dia) |
| 5 | CI/CD Pipeline | 🟡 Importante | Médio (~1-2 dias) |
| 6 | Health checks nos workers | 🟡 Importante | Baixo (~4h) |
| 7 | Bitcoin/Solana providers | 🟠 Feature incompleta | Alto (~3-5 dias) |
| 8 | data-indexing integrado ao web-app | 🟠 Feature incompleta | Médio (~2 dias) |
| 9 | Admin Panel | 🔵 Nice to have | Alto (~5+ dias) |
| 10 | SSE no lugar de polling | 🔵 Nice to have | Médio (~1-2 dias) |

**A base arquitetural está sólida** — boundaries claros entre serviços, databases isolados por serviço, comunicação event-driven bem definida, JWT RS256 implementado corretamente, Stripe com validação de webhook. Os gaps são principalmente **operacionais**, não estruturais. O risco real é chegar em produção sem conseguir debugar falhas nos consumers distribuídos.
