output "folder_id" {
  description = "ID da pasta criada no Grafana"
  value       = grafana_folder.score_cripto.id
}

output "dashboard_urls" {
  description = "URLs dos dashboards importados"
  value = {
    for name, dash in grafana_dashboard.dashboards :
    name => "${var.grafana_url}/d/${jsondecode(dash.config_json)["uid"]}"
  }
}
