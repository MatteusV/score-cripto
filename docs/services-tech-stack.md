# Mapeamento de Serviços → Tech Stack

## Decisão Arquitetural

Cada serviço usa a linguagem e o runtime mais adequado ao seu papel. A aplicação local é orquestrada pelo [docker-compose.yml](/home/matteus-varlesse/www/score-cripto/docker-compose.yml) na raiz.

## Mapeamento Atual

| Serviço | Responsabilidade | Linguagem | Framework | Principais Libs | Infra dedicada |
|---------|------------------|-----------|-----------|-----------------|----------------|
| **users** | Auth, planos, billing, limites de uso | Node.js/TS | Fastify | Stripe SDK, bcrypt, Prisma, Zod | Futuro `users-postgres` |
| **data-search** | Busca dados on-chain, normaliza resposta e mantém cache temporário | Go | Chi | go-chi, go-redis, amqp091-go | `data-search-redis` |
| **process-data-ia** | Consolida contexto, chama IA, persiste score e publica evento | Node.js/TS | Fastify | Vercel AI SDK, Prisma, Zod, amqplib | `process-data-ia-postgres` |
| **data-indexing** | Read model, indexação e busca | Elixir | OTP / Phoenix opcional | Broadway, Redis, Meilisearch | Ainda não implementado |

## Comunicação

```text
Client
  -> API Gateway
  -> data-search
  -> process-data-ia
  -> users
  -> Client

Async:
process-data-ia -> rabbitmq -> data-indexing
```

## Infraestrutura Atual

### Compartilhada

- `rabbitmq`
  - broker de eventos compartilhado entre os serviços orientados a eventos

### Dedicada por serviço

- `data-search`
  - `data-search-redis`
  - cache TTL 20 minutos
- `process-data-ia`
  - `process-data-ia-postgres`
  - persistência de `analysis_requests` e `processed_data`
- `users`
  - deve ter Postgres próprio quando for implementado

## Serviços em detalhe

### users

**Responsabilidades**
- autenticação
- assinatura
- controle de plano
- controle de consumo mensal
- integração com Stripe

**Observação**
- não deve compartilhar PostgreSQL com `process-data-ia`

### data-search

**Responsabilidades**
- receber `chain + address`
- consultar provedores externos
- normalizar contexto da carteira
- salvar cache temporário
- publicar `wallet.data.cached`

**Por que Go**
- IO-bound com muitas chamadas HTTP
- concorrência simples para coleta de dados
- binário enxuto para container

### process-data-ia

**Responsabilidades**
- receber contexto estruturado
- decidir entre reuso de score ou nova inferência
- chamar IA
- aplicar fallback heurístico quando necessário
- persistir score e metadados
- publicar `wallet.score.calculated`

**Por que Node.js/TS**
- integração direta com AI SDK
- Prisma para persistência rápida
- Zod para contrato de entrada e saída

### data-indexing

**Responsabilidades planejadas**
- consumir resultado final de análise
- atualizar cache/read model
- manter índice de busca
- aplicar debounce de sincronização

## Desenvolvimento local

### Subir stack completa

```bash
docker compose up -d
```

### Portas padrão

- `process-data-ia`: `3002`
- `data-search`: `8080`
- `process-data-ia-postgres`: `5433`
- `data-search-redis`: `6380`
- `rabbitmq`: `5673`
- `rabbitmq management`: `15673`

### Arquivos relevantes

- [docker-compose.yml](/home/matteus-varlesse/www/score-cripto/docker-compose.yml)
- [services/process-data-ia/Dockerfile](/home/matteus-varlesse/www/score-cripto/services/process-data-ia/Dockerfile)
- [services/data-search/Dockerfile](/home/matteus-varlesse/www/score-cripto/services/data-search/Dockerfile)
