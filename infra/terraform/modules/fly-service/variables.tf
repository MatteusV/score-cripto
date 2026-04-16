variable "app_name" {
  description = "Nome do app no Fly.io (deve ser globalmente único)"
  type        = string
}

variable "region" {
  description = "Região Fly.io onde o app será alocado"
  type        = string
  default     = "iad"
}

variable "vm_memory_mb" {
  description = "Memória da VM em MB"
  type        = number
  default     = 256
}

variable "vm_cpus" {
  description = "Número de CPUs compartilhadas"
  type        = number
  default     = 1
}

variable "min_machines" {
  description = "Número mínimo de máquinas ativas"
  type        = number
  default     = 1
}

variable "max_machines" {
  description = "Número máximo de máquinas"
  type        = number
  default     = 1
}


variable "github_repo" {
  description = "Repositório GitHub no formato owner/repo para salvar o deploy token"
  type        = string
}

variable "github_secret_name" {
  description = "Nome do secret GitHub onde o deploy token será salvo (ex: FLY_API_TOKEN_API_GATEWAY)"
  type        = string
}

variable "fly_api_token" {
  description = "Token Fly.io (org-level) usado como deploy token para o serviço"
  type        = string
  sensitive   = true
}
