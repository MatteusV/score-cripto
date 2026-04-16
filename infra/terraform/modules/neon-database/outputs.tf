output "project_id" {
  description = "ID do projeto Neon"
  value       = neon_project.this.id
}

output "connection_uri" {
  description = "URI de conexão PostgreSQL com pooling habilitado"
  value       = "postgresql://${neon_role.app.name}:${neon_role.app.password}@${neon_project.this.database_host}/${var.database_name}?sslmode=require"
  sensitive   = true
}

output "database_host" {
  description = "Host do endpoint Neon"
  value       = neon_project.this.database_host
}
