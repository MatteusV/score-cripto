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

---

# Observability Verification Guide — Logs → Loki

## Arquitetura de Logs

O collector lê os arquivos JSON do Docker log driver (`/var/lib/docker/containers/*/*-json.log`), parseia o wrapper externo do Docker e depois o JSON interno de cada serviço (pino, slog, logger_json), e envia para o Loki via OTLP nativo (Loki 3.x endpoint `/otlp/v1/logs`).

**Serviços → stdout JSON → Docker log files → filelog receiver → OTel Collector → Loki**

O campo `service` do log interno é promovido a resource attribute `service.name`, que o Loki usa como stream label.

## Checklist de Verificação

### 1. Stack observability em pé

```bash
docker compose --profile observability ps
# otel-collector, loki, tempo, prometheus, grafana — todos "running"
```

Se o collector já estava rodando antes desta mudança, reiniciar para recarregar o config:

```bash
docker compose --profile observability restart otel-collector
```

### 2. Logs chegando ao Loki

Aguardar ~30s após subir os serviços de aplicação (api-gateway, process-data-ia, data-search, etc.) e verificar:

```bash
# Conferir streams disponíveis no Loki
curl -s 'http://localhost:3100/loki/api/v1/labels' | jq '.data'
# esperado: ["service_name", ...]

# Conferir logs do api-gateway
curl -s 'http://localhost:3100/loki/api/v1/query_range?query={service_name="api-gateway"}&limit=5' \
  | jq '.data.result | length'
# esperado: > 0
```

### 3. Grafana → Explore → Loki

1. Abrir `http://localhost:3030` → Explore → datasource **Loki**
2. Query: `{service_name=~".+"} | json | line_format "[{{.service_name}}] {{.body}}"`
3. Deve exibir linhas de log recentes de todos os serviços ativos

### 4. Correlação Trace → Logs (Tempo ↔ Loki)

1. Grafana → Explore → datasource **Tempo** → buscar qualquer trace recente
2. Expandir um span → botão **"Logs for this span"**
3. Deve abrir Loki com query filtrando pelo `traceId` do span
4. Conferir que logs com o mesmo `trace_id` aparecem — o derived field regex `"trace_id":"([a-f0-9]{32})"` no datasource Loki realiza o match

### 5. Dashboard Logs Overview

1. Grafana → Dashboards → **Logs Overview**
2. Confirmar que os 3 painéis de timeseries têm dados (Log Rate, Errors, Distribuição por Level)
3. O painel **Logs Recentes** deve exibir linhas com timestamp

## Checklist rápido

| Verificação | Esperado |
|---|---|
| `curl .../loki/api/v1/labels` | `service_name` presente na lista |
| Query `{service_name="api-gateway"}` no Loki | Retorna linhas |
| Explore Tempo → "Logs for this span" | Abre Loki com logs correlacionados |
| Dashboard "Logs Overview" | Sem painéis com "No data" após 2min de tráfego |
| `docker exec score-cripto-otel-collector cat /var/lib/docker/containers` (via volume) | Volume montado — não erro de permissão |

## Troubleshooting

### Loki não recebe logs ("No data" em todos os painéis)

```bash
# Verificar se o pipeline de logs está no collector
curl -s http://localhost:13133 | jq .
# Deve responder healthy

# Verificar logs do collector para erros do filelog receiver
docker logs score-cripto-otel-collector 2>&1 | grep -i "error\|filelog\|loki" | tail -20
```

Causas comuns:
- O volume `/var/lib/docker/containers` não existe ou não tem permissão → verificar que `user: root` está no docker-compose
- Os serviços de aplicação não foram iniciados com `--profile observability` (precisam estar na mesma network que o collector)

### `service_name` não aparece como label no Loki

O operador `move` do filelog extrai `attributes.service` → `resource["service.name"]`. Se o serviço não emite campo `service` no JSON de log, o label não será criado. Verificar o log bruto:

```bash
docker logs score-cripto-api-gateway 2>&1 | tail -5
# Deve conter campo "service":"api-gateway" em cada linha JSON
```

### Derived fields (trace_id) não funcionam no Loki

O datasource Loki tem `derivedFields` com regex `"trace_id":"([a-f0-9]{32})"`. Verificar se o log contém esse campo:

```bash
docker logs score-cripto-api-gateway 2>&1 | grep trace_id | tail -3
```

Se `trace_id` não aparecer nos logs, verificar que `@opentelemetry/instrumentation-pino` está ativo na inicialização do serviço Node (variável `NODE_OPTIONS=--require @opentelemetry/auto-instrumentations-node/register`).

### Dashboard "Logs Overview" não aparece no Grafana

```bash
docker exec score-cripto-grafana ls /etc/grafana/provisioning/dashboards/
# Deve listar: dashboards.yaml, service-health.json, amqp-pipeline.json,
#              ai-cost-usage.json, wallet-analysis-flow.json, logs-overview.json
```
