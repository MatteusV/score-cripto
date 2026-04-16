output "app_name" {
  description = "Nome do app criado no Fly.io"
  value       = fly_app.this.name
}

output "app_hostname" {
  description = "Hostname público do app (ex: score-cripto-api-gateway.fly.dev)"
  value       = "${fly_app.this.name}.fly.dev"
}

output "internal_hostname" {
  description = "Hostname privado na rede interna Fly (ex: score-cripto-api-gateway.internal)"
  value       = "${fly_app.this.name}.internal"
}

