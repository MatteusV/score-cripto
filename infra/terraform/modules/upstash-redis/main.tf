terraform {
  required_providers {
    upstash = {
      source  = "upstash/upstash"
      version = "~> 1.5"
    }
  }
}

resource "upstash_redis_database" "this" {
  database_name = var.database_name
  tls           = var.tls_enabled
  eviction      = var.eviction
}
