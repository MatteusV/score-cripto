output "database_id" {
  description = "ID do banco Redis no Upstash"
  value       = upstash_redis_database.this.database_id
}

output "redis_url" {
  description = "URL Redis com autenticação (rediss://)"
  value       = "rediss://:${upstash_redis_database.this.password}@${upstash_redis_database.this.endpoint}:${upstash_redis_database.this.port}"
  sensitive   = true
}

output "endpoint" {
  description = "Endpoint do banco Redis"
  value       = upstash_redis_database.this.endpoint
}

output "port" {
  description = "Porta do banco Redis"
  value       = upstash_redis_database.this.port
}

output "password" {
  description = "Senha do banco Redis"
  value       = upstash_redis_database.this.password
  sensitive   = true
}
