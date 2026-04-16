variable "project_name" {
  description = "Nome do projeto no Vercel"
  type        = string
}

variable "framework" {
  description = "Framework do projeto (nextjs, vite, etc)"
  type        = string
  default     = "nextjs"
}

variable "root_directory" {
  description = "Diretório raiz do projeto dentro do repositório"
  type        = string
  default     = "services/web-app"
}

variable "github_repo" {
  description = "Repositório GitHub no formato owner/repo"
  type        = string
}

variable "production_branch" {
  description = "Branch de produção"
  type        = string
  default     = "main"
}

variable "env_vars" {
  description = "Variáveis de ambiente para o projeto Vercel"
  type = list(object({
    key    = string
    value  = string
    target = list(string) # production, preview, development
  }))
  default = []
}
