variable "grafana_url" {
  description = "URL do stack Grafana Cloud (ex: https://score-cripto.grafana.net)"
  type        = string
}

variable "grafana_auth" {
  description = "Credenciais Grafana Cloud no formato 'user:api_token'"
  type        = string
  sensitive   = true
}

variable "folder_title" {
  description = "Título da pasta onde os dashboards serão criados"
  type        = string
  default     = "Score Cripto"
}

variable "dashboards_path" {
  description = "Caminho absoluto para o diretório com os JSONs dos dashboards"
  type        = string
  default     = "../../../../infra/observability/grafana/provisioning/dashboards"
}
