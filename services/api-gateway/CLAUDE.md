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
