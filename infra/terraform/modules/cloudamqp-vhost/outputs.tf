output "instance_id" {
  description = "ID da instância CloudAMQP"
  value       = cloudamqp_instance.this.id
}

output "amqp_url" {
  description = "URL AMQP com credenciais para conexão da aplicação"
  value       = "amqp://${cloudamqp_rabbitmq_user.app.name}:${cloudamqp_rabbitmq_user.app.password}@${cloudamqp_instance.this.host}/${var.vhost_name}"
  sensitive   = true
}

output "amqps_url" {
  description = "URL AMQPS (TLS) para conexão segura"
  value       = "amqps://${cloudamqp_rabbitmq_user.app.name}:${cloudamqp_rabbitmq_user.app.password}@${cloudamqp_instance.this.host}/${var.vhost_name}"
  sensitive   = true
}

output "management_url" {
  description = "URL do painel de gerenciamento RabbitMQ"
  value       = cloudamqp_instance.this.url
}
