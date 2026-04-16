provider "fly" {
  fly_api_token = var.fly_api_token
}

provider "neon" {
  api_key = var.neon_api_key
}

provider "cloudamqp" {
  apikey = var.cloudamqp_apikey
}

provider "upstash" {
  email   = var.upstash_email
  api_key = var.upstash_api_key
}

provider "grafana" {
  url  = var.grafana_url
  auth = var.grafana_auth
}

provider "vercel" {
  api_token = var.vercel_api_token
}

provider "github" {
  token = var.github_token
  owner = var.github_owner
}
