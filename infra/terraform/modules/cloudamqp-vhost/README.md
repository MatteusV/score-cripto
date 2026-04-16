# Módulo: cloudamqp-vhost

Cria uma instância CloudAMQP (RabbitMQ gerenciado) com vhost, usuário de aplicação e permissões.

## Uso

```hcl
module "cloudamqp" {
  source = "../../modules/cloudamqp-vhost"

  instance_name = "score-cripto-prod"
  plan          = "little-lemur"
  region        = "amazon-web-services::us-east-1"
  vhost_name    = "score-cripto"
  user_name     = "app"
}

# Usar:
# module.cloudamqp.amqps_url  (conexão TLS — use em produção)
```

## Recursos criados

| Recurso | Descrição |
|---|---|
| `cloudamqp_instance` | Instância RabbitMQ gerenciada |
| `cloudamqp_vhost` | Vhost isolado para a aplicação |
| `cloudamqp_rabbitmq_user` | Usuário de aplicação com senha gerada |
| `cloudamqp_user_permissions` | Permissões `.*` no vhost |
