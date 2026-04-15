# Observability Verification Guide — Fase 3

Este guia documenta como verificar que todas as métricas customizadas e dashboards Grafana estão funcionando após a Fase 3 de observabilidade.

## Pré-requisitos

- Docker e Docker Compose instalados
- Autenticação JWT válida para o api-gateway (ou desabilitar temporariamente no `.env`)
- Monorepo clonado e dependências resolvidas

## 1. Subir a stack completa com observabilidade

```bash
# Da raiz do monorepo
docker compose --profile observability up -d --build

# Verificar que todos os containers estão healthy
docker compose --profile observability ps
```

Aguardar ~30 segundos para o RabbitMQ prometheus plugin inicializar (porta 15692 pode demorar ~15s após o broker estar UP).

Serviços esperados em execução:
| Container | Porta |
|---|---|
| api-gateway | 3001 |
| process-data-ia | — (worker RabbitMQ) |
| data-search | 8080 |
| otel-collector | 4317, 4318, 8889 |
| prometheus | 9090 |
| grafana | 3030 |
| rabbitmq | 5673, 15673, 15692 |

## 2. Verificar pipeline do collector

```bash
# Verificar saúde do collector
curl -s http://localhost:13133

# Ver métricas expostas pelo collector (app metrics via Prometheus exporter)
curl -s http://localhost:8889/metrics | head -50
```

Se o pipeline estiver funcional, o endpoint `/metrics` responde com pelo menos as métricas de build info do OTel SDK.

## 3. Gerar tráfego para as métricas

### 3a. Requisições de análise (analysis.requests_total)

```bash
export JWT="<seu token JWT>"

# Criar análise (status=created)
curl -s -X POST http://localhost:3001/analysis \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"chain":"ethereum","address":"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"}' | jq .

# Repetir a mesma requisição para gerar cache hit (status=cached)
curl -s -X POST http://localhost:3001/analysis \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"chain":"ethereum","address":"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"}' | jq .

# Repetir 3x mais com outros endereços para gerar volume
for addr in "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B" "0x1234567890123456789012345678901234567890"; do
  curl -s -X POST http://localhost:3001/analysis \
    -H "Authorization: Bearer $JWT" \
    -H "Content-Type: application/json" \
    -d "{\"chain\":\"ethereum\",\"address\":\"$addr\"}" | jq .requestId
done
```

### 3b. Forçar mensagem na DLQ

```bash
# Publicar payload inválido via management API do RabbitMQ
# (NACK sem requeue → cai na DLQ)
curl -s -u guest:guest -X POST http://localhost:15673/api/exchanges/%2F/score-cripto.events/publish \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {"content_type": "application/json"},
    "routing_key": "wallet.data.requested",
    "payload": "{\"invalid\":true}",
    "payload_encoding": "string"
  }'
```

## 4. Validar métricas no collector (Prometheus scrape endpoint)

Aguardar ~20 segundos após gerar tráfego (intervalo de export do periodic reader = 15s).

```bash
# Verificar cada métrica customizada
curl -s http://localhost:8889/metrics | grep -E \
  'analysis_requests_total|ai_tokens_total|ai_cost_usd_total|cache_hits_total|cache_misses_total'

# Saída esperada (exemplo):
# analysis_requests_total{chain="ethereum",service_name="api-gateway",status="created"} 4
# analysis_requests_total{chain="ethereum",service_name="api-gateway",status="cached"} 1
# ai_tokens_total{model="mistral/ministral-3b",service_name="process-data-ia",type="completion"} 123
# ai_tokens_total{model="mistral/ministral-3b",service_name="process-data-ia",type="prompt"} 456
# ai_cost_usd_total{model="mistral/ministral-3b",service_name="process-data-ia"} 0.000123
# cache_hits_total{chain="ethereum",service_name="data-search"} 1
# cache_misses_total{chain="ethereum",service_name="data-search"} 4
```

## 5. Validar scrape targets no Prometheus

```bash
# Verificar que todos os jobs estão UP
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'
```

Saída esperada:
```json
{"job": "otel-collector",      "health": "up"}
{"job": "otel-collector-apps", "health": "up"}
{"job": "tempo",               "health": "up"}
{"job": "rabbitmq",            "health": "up"}
```

Se algum job estiver `down`, verificar:
- `otel-collector-apps`: o collector está com `--profile observability`?
- `rabbitmq`: o plugin prometheus está habilitado? `curl http://localhost:15692/metrics`

## 6. Validar queries PromQL

```bash
# analysis.requests_total
curl -sG 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=sum by (chain, status) (analysis_requests_total)' | jq .

# Cache hit ratio
curl -sG 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=sum(cache_hits_total) / (sum(cache_hits_total) + sum(cache_misses_total))' | jq .

# DLQ depth
curl -sG 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=sum by (queue) (rabbitmq_queue_messages{queue=~".*\\.dlq"})' | jq .

# AI cost total
curl -sG 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=sum(ai_cost_usd_total)' | jq .
```

## 7. Validar dashboards no Grafana

1. Abrir `http://localhost:3030` no browser
2. Login: `admin` / `admin`
3. Ir em **Dashboards** → pasta **Score Cripto**
4. Verificar os 4 dashboards provisionados:
   - `Service Health` — painéis de RPS, latência p50/p95, error rate
   - `AMQP Pipeline` — DLQ depth, queue messages, delivery rate
   - `AI Cost & Usage` — custo/min por modelo, tokens por tipo, custo cumulativo
   - `Wallet Analysis Flow` — requests por chain/status, cache hit ratio gauge

Após ~2 minutos de tráfego sustentado, todos os painéis devem mostrar dados reais (não "No data").

## 8. Critérios de aceite

| Métrica | Critério de aceite |
|---|---|
| `analysis_requests_total` | +1 por `POST /analysis`; labels `chain` e `status ∈ {created, cached, error}` presentes |
| `ai_tokens_total` | Aumenta após scoring IA concluído; labels `model` e `type ∈ {prompt, completion}` |
| `ai_cost_usd_total` | Proporcional aos tokens: `inputTokens × 4e-8 + outputTokens × 4e-8` (mistral-3b) |
| `cache_hits_total` | Aumenta quando análise ativa já existe (segundo request do mesmo endereço) |
| `cache_misses_total` | Aumenta em cada novo endereço buscado no data-search |
| `rabbitmq_queue_messages{queue=~".*\\.dlq"}` | > 0 após injeção de payload inválido |
| Todos os 4 dashboards | Zero painéis com "No data" após 2min de tráfego |
| Prometheus targets | Todos os 4 jobs com `health: "up"` |

## Troubleshooting

### Métricas ausentes no collector endpoint (:8889)

- Verificar se o pipeline `metrics` está ativo: `curl -s http://localhost:13133` deve retornar `{"status": "Server available"}`
- Os serviços Node precisam de `OTEL_METRICS_EXPORTER=otlp` setado e `--profile observability` ativo

### DLQ metric não aparece

```bash
# Testar se o plugin está ativo
curl -s http://localhost:15692/metrics | head -10
# Se não responder, verificar se o arquivo enabled_plugins foi montado corretamente
docker exec score-cripto-rabbitmq cat /etc/rabbitmq/enabled_plugins
```

### Dashboards não aparecem no Grafana

```bash
# Verificar se o volume de provisioning está correto
docker exec score-cripto-grafana ls /etc/grafana/provisioning/dashboards/
# Deve listar: dashboards.yaml, service-health.json, amqp-pipeline.json, ai-cost-usage.json, wallet-analysis-flow.json
```
