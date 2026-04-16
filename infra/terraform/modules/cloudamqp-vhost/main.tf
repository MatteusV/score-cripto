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
