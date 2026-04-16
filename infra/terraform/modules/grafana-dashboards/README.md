# Módulo: grafana-dashboards

Importa os 5 dashboards JSON do diretório `infra/observability/grafana/provisioning/dashboards/` para um stack Grafana Cloud.

## Dashboards importados

| Arquivo | Descrição |
|---|---|
| `ai-cost-usage.json` | Custo e uso de tokens de IA |
| `amqp-pipeline.json` | Pipeline de mensagens RabbitMQ |
| `logs-overview.json` | Visão geral de logs (Loki) |
| `service-health.json` | Health e latência dos serviços |
| `wallet-analysis-flow.json` | Fluxo de análise de carteiras |

## Uso

```hcl
module "grafana_dashboards" {
  source = "../../modules/grafana-dashboards"

  grafana_url  = var.grafana_url
  grafana_auth = var.grafana_auth
}
```
