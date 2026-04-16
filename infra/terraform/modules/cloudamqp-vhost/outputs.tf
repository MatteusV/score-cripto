output "instance_id" {
  description = "ID da instância CloudAMQP"
  value       = cloudamqp_instance.this.id
}

output "amqp_url" {
  description = "URL AMQPS com credenciais para conexão da aplicação"
  value       = cloudamqp_instance.this.url
  sensitive   = true
}

output "amqps_url" {
  description = "URL AMQPS com credenciais para conexão segura"
  value       = cloudamqp_instance.this.url
  sensitive   = true
}

output "management_url" {
  description = "URL do painel de gerenciamento RabbitMQ"
  value       = "https://customer.cloudamqp.com/instance/${cloudamqp_instance.this.id}"
}
