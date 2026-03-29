# Data Indexing Service Architecture

## Visão Geral

O serviço **data-indexing** é um serviço escalável de sincronização e indexação de dados blockchain em Elixir. Ele mantém:

1. **Cache de dados blockchain** (Redis) com TTL de 12h
2. **Índice searchable** (Meilisearch) para permitir buscas full-text em wallets analisadas
3. **Event consumer** que processa análises completadas e mantém os dados sempre frescos

## Arquitetura

### Stack Tecnológico

```
┌─────────────────────────────────────────┐
│   Event Bus (RabbitMQ / Kafka)          │
└─────────────────┬───────────────────────┘
                  │
                  │ wallet.analysis.completed
                  ↓
┌─────────────────────────────────────────┐
│   Data Indexing Service (Elixir/OTP)    │
├─────────────────────────────────────────┤
│  • Event Consumer (GenServer)           │
│  • Cache Manager (Redis adapter)        │
│  • Index Manager (Meilisearch adapter)  │
│  • Sync Scheduler (debounce)            │
└─────────────────────────────────────────┘
          │            │
          ↓            ↓
    ┌──────────┐  ┌─────────────────┐
    │ Redis    │  │ Meilisearch     │
    │ Cache    │  │ Search Index    │
    └──────────┘  └─────────────────┘
```

### Responsabilidades

| Componente | Responsabilidade | Tech |
|-----------|-----------------|------|
| **Event Consumer** | Processa `wallet.analysis.completed` events | GenServer + Broadway |
| **Cache Manager** | Lê/escreve em Redis com TTL 12h | Redix (Elixir Redis) |
| **Index Manager** | Sincroniza dados em Meilisearch | meilisearch-elixir client |
| **Sync Scheduler** | Debounce requests (evita hammering) | Quantum (cron) + GenStage |
| **API Gateway** | Exposes busca/leitura via HTTP | Plug/Cowboy |

---

## Fluxo de Dados (Detalhado)

### 1. Evento é publicado (wallet-analysis service)

```
wallet-analysis concluiu análise
│
└─→ Publica: "wallet.analysis.completed"
    {
      "analysis_id": "uuid",
      "chain": "ethereum",
      "address": "0x1234...",
      "wallet_context": {
        "tx_count": 1500,
        "balance": "100.5",
        "last_activity": "2026-03-29T...",
        "risk_score": 0.25,
        "flags": [...],
        ...
      },
      "timestamp": "2026-03-29T22:51:41Z"
    }
```

### 2. Data-indexing consome evento

```elixir
# lib/score_cripto/events/consumer.ex
defmodule ScoreCripto.Events.Consumer do
  use GenStage

  def init(_opts) do
    {:consumer, []}
  end

  def handle_events(events, _from, state) do
    # Processa eventos em batch (de-duplicação automática)
    Enum.each(events, &process_analysis/1)
    {:noop, state}
  end

  defp process_analysis(event) do
    # 1. Extrai dados
    data = event["wallet_context"]
    cache_key = "wallet:#{event["chain"]}:#{event["address"]}"
    search_doc = build_search_document(event)

    # 2. Salva em cache (Redis)
    CacheManager.set(cache_key, data, ttl: 12 * 60 * 60)

    # 3. Agenda indexação (com debounce)
    IndexScheduler.schedule_index(search_doc)
  end
end
```

### 3. Cache Manager (Redis)

```elixir
# lib/score_cripto/cache/manager.ex
defmodule ScoreCripto.Cache.Manager do
  def set(key, value, opts \\ []) do
    ttl = Keyword.get(opts, :ttl, 43200)  # 12h default

    {:ok, serialized} = Jason.encode(value)

    Redix.command(:redix, [
      "SET",
      key,
      serialized,
      "EX",
      ttl
    ])
  end

  def get(key) do
    case Redix.command(:redix, ["GET", key]) do
      {:ok, nil} -> {:miss, nil}
      {:ok, data} -> {:hit, Jason.decode!(data)}
      error -> error
    end
  end

  def invalidate_cache(pattern) do
    # Invalida padrão (ex: "wallet:ethereum:*")
    Redix.command(:redix, ["EVAL",
      ~s(return redis.call('del', unpack(redis.call('keys', ARGV[1])))),
      0,
      pattern
    ])
  end
end
```

### 4. Index Scheduler (Debounce)

```elixir
# lib/score_cripto/index/scheduler.ex
defmodule ScoreCripto.Index.Scheduler do
  use GenServer

  def start_link(_) do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  def schedule_index(doc) do
    # Debounce: agrupa mudanças por 30s antes de indexar
    key = "index_batch:#{doc["chain"]}:#{doc["address"]}"

    # Se já está agendado, apenas atualiza
    send_after_debounce(key, doc, 30_000)
  end

  defp send_after_debounce(key, doc, debounce_ms) do
    GenServer.cast(__MODULE__, {:schedule, key, doc, debounce_ms})
  end

  def handle_cast({:schedule, key, doc, debounce_ms}, state) do
    # Cancela timer anterior se existe
    old_ref = Map.get(state, key)
    if old_ref, do: Process.cancel_timer(old_ref)

    # Agenda novo timer
    ref = Process.send_after(self(), {:flush, key, doc}, debounce_ms)

    {:noreply, Map.put(state, key, {ref, doc})}
  end

  def handle_info({:flush, key, doc}, state) do
    # Finalmente indexa
    IndexManager.index(doc)
    {:noreply, Map.delete(state, key)}
  end
end
```

### 5. Index Manager (Meilisearch)

```elixir
# lib/score_cripto/index/manager.ex
defmodule ScoreCripto.Index.Manager do
  def index(doc) do
    # Estrutura documento para search
    search_doc = %{
      "id" => doc["address"],  # ID único
      "chain" => doc["chain"],
      "address" => doc["address"],
      "tx_count" => doc["wallet_context"]["tx_count"],
      "balance" => doc["wallet_context"]["balance"],
      "risk_score" => doc["wallet_context"]["risk_score"],
      "last_activity" => doc["wallet_context"]["last_activity"],
      "tags" => extract_tags(doc),  # Tags para filtro
      "searchable_text" => "#{doc["chain"]} #{doc["address"]}"  # Para busca full-text
    }

    Meilisearch.Index.add_documents(
      :meilisearch,
      "wallets",  # Index name
      [search_doc]
    )
  end

  def search(query, filters \\ %{}) do
    Meilisearch.Search.search(
      :meilisearch,
      "wallets",
      query,
      filter: build_filter(filters),
      limit: 20
    )
  end

  defp extract_tags(doc) do
    doc["wallet_context"]["flags"] || []
  end

  defp build_filter(filters) do
    filters
    |> Enum.map(fn
      {:chain, value} -> "chain = #{value}"
      {:risk_min, value} -> "risk_score >= #{value}"
      {:risk_max, value} -> "risk_score <= #{value}"
    end)
    |> Enum.join(" AND ")
  end
end
```

### 6. API Gateway (dados indexados)

```elixir
# lib/score_cripto_web/controllers/search_controller.ex
defmodule ScoreCryptoWeb.SearchController do
  use ScoreCryptoWeb, :controller

  def search(conn, %{"q" => query} = params) do
    filters = %{
      chain: params["chain"],
      risk_min: params["risk_min"],
      risk_max: params["risk_max"]
    }

    {:ok, results} = IndexManager.search(query, filters)

    json(conn, %{
      "results" => results,
      "total" => length(results)
    })
  end

  def cache_hit_rate(conn, _params) do
    # Retorna stats de cache para monitoramento
    stats = CacheManager.get_stats()
    json(conn, stats)
  end
end
```

---

## TTL Strategy

| Componente | TTL | Razão |
|-----------|-----|-------|
| **Redis Cache** | 12h | Dados blockchain mudam lentamente; reduz chamadas a APIs |
| **Meilisearch Index** | No TTL | Índice é atualizado em tempo real; busca sempre retorna dados frescos |
| **Debounce Scheduler** | 30s | Agrupa mudanças; evita indexações repetidas |

---

## Resiliência & Fallback

### Falha ao conectar Redis?

```elixir
# Fallback: retorna misses até Redis voltar
def get(key) do
  case Redix.command(:redix, ["GET", key]) do
    {:ok, data} -> {:hit, data}
    {:error, _} -> {:miss, nil}  # Fallback seguro
  end
end
```

### Falha ao indexar Meilisearch?

```elixir
# Dead Letter Queue (DLQ) em Redis
defp handle_index_error(doc, reason) do
  Logger.error("Index failed: #{inspect(reason)}")

  # Salva em DLQ para retry posterior
  Redix.command(:redix, [
    "LPUSH",
    "meilisearch:dlq",
    Jason.encode!(doc)
  ])

  # Retry automático em background
  # (via scheduled task)
end
```

---

## Monitoramento & Observabilidade

```elixir
# lib/score_cripto/telemetry.ex
defmodule ScoreCripto.Telemetry do
  def setup do
    :telemetry.attach("cache_hit", [:cache, :hit], &log_hit/4, nil)
    :telemetry.attach("cache_miss", [:cache, :miss], &log_miss/4, nil)
    :telemetry.attach("index_success", [:index, :success], &log_index/4, nil)
  end
end
```

**Métricas importantes:**
- Cache hit rate (target: 80%+)
- Indexação latência (target: <500ms p95)
- DLQ size (deve estar vazio ou baixo)
- Event processing lag (target: <5s)

---

## Escalabilidade

### Horizontal Scaling

```
Event Bus (RabbitMQ)
├─ Consumer Group: data-indexing
│  ├─ Node 1 (consome partição 0-3)
│  ├─ Node 2 (consome partição 4-7)
│  └─ Node 3 (consome partição 8-11)
```

Cada nó Elixir é independente graças ao modelo de actors OTP. Rebalanceamento é automático.

### Redis & Meilisearch

```
Redis Cluster (3 nós)
├─ Master 1 (slot 0-5461)
├─ Master 2 (slot 5462-10922)
└─ Master 3 (slot 10923-16383)

Meilisearch (replicado)
├─ Primary (writes)
└─ Replica (reads)
```

---

## Testes

```elixir
# test/score_cripto/events/consumer_test.exs
describe "wallet analysis event consumption" do
  test "persists to cache and schedules index" do
    event = fixture(:wallet_analysis_event)

    Consumer.handle_events([event], self(), [])

    # Verifica cache
    {:hit, data} = CacheManager.get("wallet:ethereum:0x1234")
    assert data["balance"] == event["wallet_context"]["balance"]

    # Verifica agendamento
    assert_eventually(fn ->
      {:ok, indexed} = IndexManager.search("0x1234")
      assert length(indexed) > 0
    end, timeout: 2000)
  end
end
```

---

## Deployment

```dockerfile
# Dockerfile
FROM elixir:1.14-alpine

WORKDIR /app
COPY . .

RUN mix deps.get
RUN mix compile

EXPOSE 4000
CMD ["mix", "ecto.migrate", "&&", "mix", "phx.server"]
```

```yaml
# k8s deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: data-indexing
spec:
  replicas: 3
  selector:
    matchLabels:
      app: data-indexing
  template:
    metadata:
      labels:
        app: data-indexing
    spec:
      containers:
      - name: data-indexing
        image: score-cripto/data-indexing:latest
        env:
        - name: REDIS_URL
          value: redis://redis-master:6379
        - name: MEILISEARCH_URL
          value: http://meilisearch:7700
        - name: RABBITMQ_URL
          value: amqp://rabbitmq:5672
```

---

## Sumário

**Data-indexing em Elixir fornece:**

✅ Consumer de eventos robusto (GenStage/Broadway)
✅ Cache com TTL (Redis)
✅ Índice searchable (Meilisearch)
✅ Debounce automático (evita sobrecarga)
✅ Resiliência com fallback gracioso
✅ Escalabilidade horizontal (OTP actors)
✅ Observabilidade integrada (Telemetry)

**Próximos passos:**
1. Implementar Event Consumer (score-cripto-3wt)
2. Configurar Redis cluster + Meilisearch
3. Escrever testes integrados
4. Deploy em staging e validar hit rate de cache
