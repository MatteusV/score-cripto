variable "instance_name" {
  description = "Nome da instância CloudAMQP"
  type        = string
}

variable "plan" {
  description = "Plano CloudAMQP (lemur = free, little-lemur = pago básico)"
  type        = string
  default     = "little-lemur"
}

variable "region" {
  description = "Região CloudAMQP (ex: amazon-web-services::us-east-1)"
  type        = string
  default     = "amazon-web-services::us-east-1"
}

variable "vhost_name" {
  description = "Nome do vhost RabbitMQ"
  type        = string
  default     = "score-cripto"
}

variable "user_name" {
  description = "Nome do usuário RabbitMQ para a aplicação"
  type        = string
  default     = "app"
}
