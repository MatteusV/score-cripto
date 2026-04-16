# Módulo: neon-database

Cria um projeto Neon com role de aplicação e banco de dados. Expõe `connection_uri` sensível para ser injetada como secret.

## Uso

```hcl
module "neon_api_gateway" {
  source = "../../modules/neon-database"

  project_name  = "score-cripto-api-gateway"
  region_id     = "aws-us-east-1"
  pg_version    = 16
  role_name     = "app"
  database_name = "api_gateway"
}

# Usar a URI:
# module.neon_api_gateway.connection_uri
```

## Recursos criados

| Recurso | Descrição |
|---|---|
| `neon_project` | Projeto Neon com endpoint serverless |
| `neon_role` | Role de aplicação com senha gerada |
| `neon_database` | Banco de dados vinculado ao role |
