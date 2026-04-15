# CLAUDE.md — api-gateway

Boundary externo único da plataforma Score Cripto. Todo cliente (web-app, apps mobile, integrações) deve falar somente com este serviço.

## Commands

```bash
pnpm dev                  # Start com hot-reload (tsx watch)
pnpm build                # Compila TypeScript
pnpm start                # Roda o build
pnpm test                 # Testes unitários (vitest)
pnpm test:watch           # Watch mode
pnpm db:generate          # Regenera Prisma client
pnpm check                # Lint com Ultracite/Biome
pnpm fix                  # Auto-fix de lint
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Porta do servidor Fastify |
| `DATABASE_URL` | — | PostgreSQL connection string (banco próprio do gateway) |
| `RABBITMQ_URL` | `amqp://localhost:5672` | RabbitMQ connection |
| `RATE_LIMIT_MAX_AUTH` | `60` | Máximo de req/janela por usuário autenticado |
| `RATE_LIMIT_MAX_ANON` | `30` | Máximo de req/janela por IP anônimo |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Janela de rate limit em ms (padrão: 1 minuto) |
| `USERS_SERVICE_TIMEOUT_MS` | `1000` | Timeout da chamada HTTP ao users service em ms |
| `USERS_SERVICE_RETRY_ATTEMPTS` | `1` | Número de retries após erro retentável (ex: rede, 5xx) |
| `USERS_SERVICE_RETRY_BACKOFF_MS` | `200` | Backoff fixo entre retries em ms |
| `USERS_SERVICE_BREAKER_THRESHOLD` | `0.5` | Fração de falhas (0–1) que abre o circuit breaker na janela |
| `USERS_SERVICE_BREAKER_HALF_OPEN_AFTER_MS` | `30000` | Tempo em ms até o breaker testar recuperação (half-open) |
| `STALE_ANALYSIS_THRESHOLD_MS` | `600000` | Tempo em ms que uma análise PENDING aguarda antes de ser expirada |
| `RECONCILE_INTERVAL_MS` | `120000` | Intervalo em ms do job de reconciliação de análises stale |

## Responsabilidades

- Expõe `POST /analysis` e `GET /analysis/:id` para o frontend
- Publica evento `wallet.data.requested` para iniciar o pipeline
- Consome `wallet.score.calculated` → atualiza status para COMPLETED
- Consome `wallet.score.failed` → atualiza status para FAILED
- Retorna `GET /docs` com documentação de todos os endpoints

## O que NÃO fazer aqui

- Não fazer scoring ou chamar IA — isso é responsabilidade de `process-data-ia`
- Não chamar `data-search` diretamente — comunicação é via eventos
- Não compartilhar banco com outros serviços

## Endpoints

Ver `GET /docs` em runtime ou `src/http/server.ts` para o contrato completo.
