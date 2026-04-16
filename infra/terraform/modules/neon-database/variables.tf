variable "project_name" {
  description = "Nome do projeto Neon (ex: score-cripto-api-gateway)"
  type        = string
}

variable "region_id" {
  description = "Região Neon (ex: aws-us-east-1)"
  type        = string
  default     = "aws-us-east-1"
}

variable "pg_version" {
  description = "Versão do PostgreSQL"
  type        = number
  default     = 16
}

variable "role_name" {
  description = "Nome do role/usuário do banco"
  type        = string
  default     = "app"
}

variable "database_name" {
  description = "Nome do banco de dados"
  type        = string
  default     = "app"
}
