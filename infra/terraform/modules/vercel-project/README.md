# Módulo: vercel-project

Cria um projeto Vercel conectado ao repositório GitHub com variáveis de ambiente configuradas.

> O deploy do web-app é feito via integração nativa Vercel↔GitHub (não pelo `release.yml`).
> Este módulo apenas configura o projeto e as env vars via IaC.

## Uso

```hcl
module "vercel_web_app" {
  source = "../../modules/vercel-project"

  project_name      = "score-cripto-web-app"
  framework         = "nextjs"
  root_directory    = "services/web-app"
  github_repo       = "meu-usuario/score-cripto"
  production_branch = "main"

  env_vars = [
    {
      key    = "NEXT_PUBLIC_API_URL"
      value  = "https://score-cripto-api-gateway.fly.dev"
      target = ["production", "preview"]
    }
  ]
}
```
