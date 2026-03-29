# Mapeamento de Serviços → Tech Stack

## Decisão Arquitetural: Polyglot Services

Cada serviço usa a linguagem/framework **mais adequado para seu caso de uso**, não uma linguagem única.

## Mapeamento Final

| Serviço | Responsabilidade | Linguagem | Framework | Principais Libs | Justificativa |
|---------|-----------------|-----------|-----------|-----------------|---------------|
| **users** | Auth, planos, billing, limites de uso | Node.js/TS | Fastify | Stripe SDK, bcrypt | Rápido prototipar, ecossistema rich, integração Stripe natural |
| **wallet-analysis** | Busca dados blockchain, gera sinais estruturados | Go | Chi/Fiber | Etherscan SDK, custom parsers | Alta performance, concorrência, requisições HTTP paralelas rápidas |
| **data-indexing** | Sincronização blockchain, índice searchable, cache | Elixir | Phoenix (opcional) | Broadway, Redis, Meilisearch | Fault-tolerant, event-driven natural, escalável horizontalmente |
| **scoring-engine** | Orquestra IA, estrutura resposta, persiste score | Node.js/TS | Fastify | Vercel AI SDK, Zod, prisma | Integração Vercel AI SDK nativa, structured output, schema validation |

## Diagrama de Comunicação

```
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway (Node.js)                     │
│  (Fastify: valida auth, rate limit, orquestra fluxo)       │
└──┬────────────┬──────────────┬──────────────┬──────────────┘
   │            │              │              │
   │ HTTP       │ HTTP         │ HTTP         │ HTTP
   ↓            ↓              ↓              ↓
┌──────────────────┐  ┌────────────────────┐  ┌────────────┐
│   users (Node)   │  │  wallet-analysis   │  │ scoring-   │
│ (Fastify)        │  │  (Go)              │  │ engine     │
│                  │  │                    │  │ (Node)     │
│ • Auth           │  │ • Etherscan API    │  │ • AI SDK   │
│ • Plans          │  │ • Parse tx         │  │ • Struct   │
│ • Stripe         │  │ • Risk flags       │  │ • Persist  │
│ • Usage limits   │  │ • Cache Redis      │  │            │
└──────────────────┘  └────────────────────┘  └────────────┘
   │                           │                    │
   │ (insert event)            │ (publish event)    │
   └───────────┬───────────────┴────────────────────┘
               │
      ┌────────↓───────────┐
      │  Event Bus         │
      │  (RabbitMQ/Kafka)  │
      └────────┬───────────┘
               │
     wallet.analysis.completed
               │
               ↓
    ┌──────────────────────────┐
    │ data-indexing (Elixir)   │
    │                          │
    │ • Event consumer         │
    │ • Redis cache            │
    │ • Meilisearch index      │
    │ • Debounce scheduler     │
    └──────────────────────────┘
```

## Detalhamento por Serviço

### 1️⃣ **users** (Node.js/Fastify)

**Por que Node.js?**
- Prototipagem rápida
- Stripe SDK tem excelente suporte em Node.js
- Rota simples: receber credenciais → validar → retornar token
- Equipe já familiarizada com TypeScript/Node

**Responsabilidades:**
```
POST   /auth/signup           → Criar usuário
POST   /auth/login            → Login (JWT)
GET    /auth/me               → Perfil do usuário
POST   /subscriptions         → Upgrade plano
GET    /usage                 → Consumo do mês
PUT    /wallets               → Vincular carteira
```

**Libs principais:**
- `@fastify/jwt` — tokens
- `@stripe/stripe-js` — billing
- `prisma` — ORM
- `bcrypt` — hashing
- `zod` — schema validation

**Exemplo:**
```typescript
// src/routes/subscriptions.ts
app.post('/subscriptions', async (req, reply) => {
  const { planId } = req.body
  const userId = req.user.id

  // Busca preço do plano no Stripe
  const price = await stripe.prices.retrieve(planId)

  // Cria sessão de checkout
  const session = await stripe.checkout.sessions.create({
    customer: user.stripeCustomerId,
    line_items: [{ price: planId, quantity: 1 }],
  })

  return { checkoutUrl: session.url }
})
```

---

### 2️⃣ **wallet-analysis** (Go/Chi)

**Por que Go?**
- **Performance**: Requisições HTTP paralelas ao Etherscan API
- **Concorrência**: Goroutines lidam com N wallets simultâneos
- **Compiled**: Deploys rápidos, sem runtime overhead
- **Static analysis**: Tipo forte reduz bugs

**Responsabilidades:**
```
POST /analyze                 → Analisa carteira (busca dados)
GET  /analyze/{chain}/{addr}  → Cache de análises
```

**Fluxo:**
```
1. Recebe: { chain: "ethereum", address: "0x123..." }
2. Busca em cache (Redis) - TTL 12h
   │
   ├─ HIT → Retorna cached
   │
   └─ MISS:
      ├─ Paralelo: Etherscan API (tx history, balance)
      ├─ Paralelo: DeBank API (assets, token holdings)
      ├─ Paralelo: BlockScout (validators, labels)
      │
      └─ Normaliza resposta
         ├─ Gera sinais: tx_count, velocity, risk_flags
         ├─ Salva em cache
         └─ Publica: wallet.analysis.completed event
```

**Libs principais:**
- `chi` — router
- `redis` — cache
- Standard lib `net/http` — requisições

**Exemplo:**
```go
// cmd/wallet-analysis/main.go
func analyzeWallet(w http.ResponseWriter, r *http.Request) {
    chain := chi.URLParam(r, "chain")
    address := chi.URLParam(r, "address")

    // Tenta cache
    if cached, ok := cache.Get(chain, address); ok {
        json.NewEncoder(w).Encode(cached)
        return
    }

    // Busca paralelo
    var wg sync.WaitGroup
    txData := fetchEtherscan(chain, address, &wg)
    assets := fetchDeBank(address, &wg)
    wg.Wait()

    // Normaliza
    analysis := normalizeData(txData, assets)

    // Salva cache
    cache.Set(chain, address, analysis, 12*time.Hour)

    // Publica evento
    eventBus.Publish("wallet.analysis.completed", analysis)

    json.NewEncoder(w).Encode(analysis)
}
```

---

### 3️⃣ **scoring-engine** (Node.js/Fastify)

**Por que Node.js?**
- Vercel AI SDK é nativo em Node.js
- Integração com LLMs é simples (Promise-based)
- Já domina Zod (schema validation)
- Integração Prisma/Database rápida

**Responsabilidades:**
```
POST /score               → Calcula score (IA)
GET  /score/{processId}   → Busca score existente
```

**Fluxo:**
```
1. Recebe: wallet_context_hash (dados normalizados)
2. Verifica PROCESSED_DATA cache
   │
   ├─ HIT → Retorna score existente
   │
   └─ MISS:
      ├─ Prepara prompt estruturado
      ├─ Chama Vercel AI SDK (gpt-4-turbo)
      │  └─ Parseado com Zod (structured output)
      │
      ├─ Valida: score 0-100, confidence 0-1
      │
      ├─ Fallback: se IA falhar, usa heurístico
      │
      ├─ Persiste em PROCESSED_DATA
      │  └─ Rastreia: model_version, prompt_version, cost, tokens
      │
      └─ Publica: wallet.score.calculated event
```

**Libs principais:**
- `ai` (Vercel SDK) — LLM integration
- `@ai-sdk/openai` — OpenAI provider
- `zod` — schema validation
- `prisma` — database
- `@anthropic-ai/sdk` (future fallback)

**Exemplo:**
```typescript
// src/services/scoring.ts
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

const scoreSchema = z.object({
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  positiveFactors: z.array(z.string()),
  riskFactors: z.array(z.string()),
})

export async function scoreWallet(context: WalletContext) {
  const { object, usage } = await generateObject({
    model: openai('gpt-4-turbo'),
    schema: scoreSchema,
    prompt: buildPrompt(context),
  })

  // Persiste com versioning
  return db.processedData.create({
    score: object.score,
    confidence: object.confidence,
    modelVersion: 'gpt-4-turbo',
    promptVersion: 'v2.0',
    tokensUsed: usage.totalTokens,
  })
}
```

---

### 4️⃣ **data-indexing** (Elixir/OTP)

**Por que Elixir?**
- **Event-driven natural**: Consome eventos via Broadway/GenStage
- **Fault tolerance**: Supervisor tree reinicia workers se falharem
- **Escalabilidade**: OTP actors lidam com milhões de operações
- **Distributed**: Cluster automático entre nós

**Responsabilidades:**
```
Consome: wallet.analysis.completed
    ↓
Atualiza Redis cache (TTL 12h)
    ↓
Agenda indexação Meilisearch (debounce 30s)
    ↓
Expõe API:
  GET /search?q=address&chain=ethereum
  GET /stats
```

**Arquitetura OTP:**
```
┌─────────────────────────────────┐
│ Application Supervisor          │
├─────────────────────────────────┤
│ ├─ Event Consumer (Broadway)    │
│ ├─ Cache Manager (Redix)        │
│ ├─ Index Manager (Meilisearch)  │
│ └─ Sync Scheduler (Quantum)     │
└─────────────────────────────────┘
```

**Exemplo:**
```elixir
# lib/score_cripto/application.ex
def start(_type, _args) do
  children = [
    {Redix, name: :redix},
    {ScoreCripto.Events.ConsumerSupervisor, []},
    {ScoreCripto.Index.SyncScheduler, []},
  ]

  Supervisor.start_link(children, strategy: :one_for_one)
end
```

---

## Deployment

### Local Development

```bash
# Terminal 1: users (Node.js)
cd services/users
npm install
npm run dev

# Terminal 2: wallet-analysis (Go)
cd services/wallet-analysis
go run cmd/main.go

# Terminal 3: scoring-engine (Node.js)
cd services/scoring-engine
npm install
npm run dev

# Terminal 4: data-indexing (Elixir)
cd services/data-indexing
mix deps.get
mix phx.server

# Terminal 5: supporting services
docker-compose up -d  # Redis, Meilisearch, RabbitMQ, PostgreSQL
```

### Kubernetes/Docker Compose

```yaml
# docker-compose.yml (production)
version: '3'

services:
  api-gateway:
    image: score-cripto/api-gateway:latest
    ports: ['3000:3000']
    environment:
      - USERS_URL=http://users:3001
      - WALLET_ANALYSIS_URL=http://wallet-analysis:8080
      - SCORING_ENGINE_URL=http://scoring-engine:3002

  users:
    image: score-cripto/users:latest
    ports: ['3001:3001']
    environment:
      - DATABASE_URL=postgresql://...
      - STRIPE_KEY=sk_...

  wallet-analysis:
    image: score-cripto/wallet-analysis:latest
    ports: ['8080:8080']
    environment:
      - REDIS_URL=redis://redis:6379
      - ETHERSCAN_API_KEY=...

  scoring-engine:
    image: score-cripto/scoring-engine:latest
    ports: ['3002:3002']
    environment:
      - DATABASE_URL=postgresql://...
      - OPENAI_API_KEY=...

  data-indexing:
    image: score-cripto/data-indexing:latest
    environment:
      - REDIS_URL=redis://redis:6379
      - MEILISEARCH_URL=http://meilisearch:7700

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']

  meilisearch:
    image: getmeili/meilisearch:latest
    ports: ['7700:7700']

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=password
    ports: ['5432:5432']

  rabbitmq:
    image: rabbitmq:3.12
    ports: ['5672:5672', '15672:15672']
```

## Observabilidade por Serviço

| Serviço | Logs | Métricas | Traces |
|---------|------|----------|--------|
| users | Winston (Node.js) | Prometheus | OpenTelemetry |
| wallet-analysis | Logrus (Go) | Prometheus | OpenTelemetry |
| scoring-engine | Winston (Node.js) | Prometheus, Cost tracking | OpenTelemetry |
| data-indexing | Logger (Elixir) | Prometheus, Cache hit rate | OpenTelemetry |

## Próximas Etapas

1. **Criar repositórios** para cada serviço (monorepo ou poly-repo)
2. **Implementar CI/CD** (GitHub Actions)
3. **Setup Kubernetes** (staging + prod)
4. **Monitoramento** (Prometheus + Grafana)
5. **Alerting** (AI scoring failures, cache misses >30%)

---

## FAQ

**P: Por que não usar uma única linguagem?**
A: Cada serviço tem diferentes trade-offs. Go é ótimo para I/O, Elixir para eventos, Node.js para integração IA.

**P: Como sincronizar dados entre serviços?**
A: Event Bus (RabbitMQ/Kafka) com contrato bem definido (OpenAPI/AsyncAPI).

**P: E se um serviço falhar?**
A: API Gateway tem retry logic; cada serviço tem fallback (ex: heurístico no scoring-engine).

**P: Como escalar horizontalmente?**
A: Cada serviço é stateless e pode rodar em múltiplas instâncias (load balanced).
