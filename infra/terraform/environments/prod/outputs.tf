# ─── URLs públicas dos serviços ───────────────────────────────────────────────

output "api_gateway_url" {
  description = "URL pública do api-gateway"
  value       = "https://${module.fly_api_gateway.app_hostname}"
}

output "web_app_url" {
  description = "URL de produção do web-app no Vercel"
  value       = "https://${module.vercel_web_app.production_url}"
}

# ─── Hostnames internos (rede .internal do Fly) ───────────────────────────────

output "internal_hostnames" {
  description = "Hostnames privados na rede Fly para comunicação interna"
  value = {
    api_gateway      = module.fly_api_gateway.internal_hostname
    process_data_ia  = module.fly_process_data_ia.internal_hostname
    users            = module.fly_users.internal_hostname
    data_search      = module.fly_data_search.internal_hostname
    data_indexing    = module.fly_data_indexing.internal_hostname
  }
}

# ─── Grafana dashboards ───────────────────────────────────────────────────────

output "grafana_dashboard_urls" {
  description = "URLs dos dashboards no Grafana Cloud"
  value       = module.grafana_dashboards.dashboard_urls
}
