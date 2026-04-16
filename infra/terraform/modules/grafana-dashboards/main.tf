terraform {
  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = "~> 4.0"
    }
  }
}

provider "grafana" {
  url  = var.grafana_url
  auth = var.grafana_auth
}

resource "grafana_folder" "score_cripto" {
  title = var.folder_title
}

locals {
  # Mapeia cada JSON de dashboard para ser importado
  dashboard_files = {
    "ai-cost-usage"        = "${var.dashboards_path}/ai-cost-usage.json"
    "amqp-pipeline"        = "${var.dashboards_path}/amqp-pipeline.json"
    "logs-overview"        = "${var.dashboards_path}/logs-overview.json"
    "service-health"       = "${var.dashboards_path}/service-health.json"
    "wallet-analysis-flow" = "${var.dashboards_path}/wallet-analysis-flow.json"
  }
}

resource "grafana_dashboard" "dashboards" {
  for_each = local.dashboard_files

  folder      = grafana_folder.score_cripto.id
  config_json = file(each.value)
}
