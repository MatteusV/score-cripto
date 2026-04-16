# ─── Fly.io ───────────────────────────────────────────────────────────────────
variable "fly_api_token" {
  description = "Token de organização Fly.io para criar apps e tokens de deploy"
  type        = string
  sensitive   = true
}

# ─── Neon ─────────────────────────────────────────────────────────────────────
variable "neon_api_key" {
  description = "API Key do Neon para gerenciar projetos e branches"
  type        = string
  sensitive   = true
}

# ─── CloudAMQP ────────────────────────────────────────────────────────────────
variable "cloudamqp_apikey" {
  description = "API Key do CloudAMQP"
  type        = string
  sensitive   = true
}

# ─── Upstash ──────────────────────────────────────────────────────────────────
variable "upstash_email" {
  description = "Email da conta Upstash"
  type        = string
}

variable "upstash_api_key" {
  description = "API Key do Upstash"
  type        = string
  sensitive   = true
}

# ─── Grafana Cloud ────────────────────────────────────────────────────────────
variable "grafana_url" {
  description = "URL do stack Grafana Cloud (ex: https://score-cripto.grafana.net)"
  type        = string
}

variable "grafana_auth" {
  description = "Credenciais Grafana Cloud no formato 'user:api_token'"
  type        = string
  sensitive   = true
}

# ─── Vercel ───────────────────────────────────────────────────────────────────
variable "vercel_api_token" {
  description = "Token de API do Vercel"
  type        = string
  sensitive   = true
}

# ─── GitHub ───────────────────────────────────────────────────────────────────
variable "github_token" {
  description = "Token GitHub com permissão de escrita em Secrets e Environments"
  type        = string
  sensitive   = true
}

variable "github_owner" {
  description = "Owner do repositório GitHub (usuário ou organização)"
  type        = string
}

variable "github_repo_name" {
  description = "Nome do repositório GitHub (sem o owner)"
  type        = string
  default     = "score-cripto"
}

# ─── Configurações gerais ──────────────────────────────────────────────────────
variable "fly_region" {
  description = "Região padrão Fly.io para todos os serviços"
  type        = string
  default     = "iad"
}

variable "neon_region" {
  description = "Região Neon (deve ser próxima à região Fly)"
  type        = string
  default     = "aws-us-east-1"
}
