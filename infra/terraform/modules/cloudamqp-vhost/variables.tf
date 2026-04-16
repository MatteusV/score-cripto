variable "instance_name" {
  description = "Nome da instância CloudAMQP"
  type        = string
}

variable "plan" {
  description = "Plano CloudAMQP (lemur = free, little-lemur = pago básico)"
  type        = string
  default     = "lemur"
}

variable "region" {
  description = "Região CloudAMQP (ex: amazon-web-services::us-east-1)"
  type        = string
  default     = "amazon-web-services::us-east-1"
}

