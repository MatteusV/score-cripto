terraform {
  required_providers {
    cloudamqp = {
      source  = "cloudamqp/cloudamqp"
      version = "~> 1.44"
    }
  }
}

resource "cloudamqp_instance" "this" {
  name   = var.instance_name
  plan   = var.plan
  region = var.region
}

resource "cloudamqp_vhost" "app" {
  instance_id = cloudamqp_instance.this.id
  name        = var.vhost_name
}

resource "cloudamqp_rabbitmq_user" "app" {
  instance_id = cloudamqp_instance.this.id
  name        = var.user_name
  # Permissões totais no vhost da aplicação
  tags        = "management"
}

resource "cloudamqp_user_permissions" "app" {
  instance_id  = cloudamqp_instance.this.id
  user         = cloudamqp_rabbitmq_user.app.name
  vhost        = cloudamqp_vhost.app.name
  configure    = ".*"
  write        = ".*"
  read         = ".*"
}
