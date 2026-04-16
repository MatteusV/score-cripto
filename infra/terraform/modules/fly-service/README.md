# Módulo: fly-service

Cria um app Fly.io vazio com secrets, token de deploy escopado e o salva no GitHub Actions.

## Uso

```hcl
module "api_gateway" {
  source = "../../modules/fly-service"

  app_name           = "score-cripto-api-gateway"
  region             = "iad"
  vm_memory_mb       = 256
  github_repo        = "meu-usuario/score-cripto"
  github_secret_name = "FLY_API_TOKEN_API_GATEWAY"

  secrets = {
    DATABASE_URL = module.neon_api_gateway.connection_uri
    RABBITMQ_URL = module.cloudamqp.amqp_url
  }
}
```

## Recursos criados

| Recurso | Descrição |
|---|---|
| `fly_app` | App Fly.io vazio (sem imagem — deploy via `release.yml`) |
| `fly_app_secret` | Secrets injetados como env vars no app |
| `fly_app_token` | Token de deploy escopado ao app (1 ano de validade) |
| `github_actions_secret` | Token salvo como secret no repositório GitHub |
