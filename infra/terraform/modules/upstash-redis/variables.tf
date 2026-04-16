variable "database_name" {
  description = "Nome do banco Redis no Upstash"
  type        = string
}

variable "region" {
  description = "Região Upstash (ex: us-east-1)"
  type        = string
  default     = "us-east-1"
}

variable "tls_enabled" {
  description = "Habilitar TLS na conexão"
  type        = bool
  default     = true
}

variable "eviction" {
  description = "Habilitar eviction de chaves (allkeys-lru)"
  type        = bool
  default     = false
}
