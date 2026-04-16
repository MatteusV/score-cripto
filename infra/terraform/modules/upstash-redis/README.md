# Módulo: upstash-redis

Cria um banco Redis serverless no Upstash.

## Uso

```hcl
module "redis" {
  source = "../../modules/upstash-redis"

  database_name = "score-cripto-prod"
  region        = "us-east-1"
  tls_enabled   = true
}

# Usar:
# module.redis.redis_url  (rediss://:password@host:port)
```

## Recursos criados

| Recurso | Descrição |
|---|---|
| `upstash_redis_database` | Banco Redis serverless com cobrança por request |
