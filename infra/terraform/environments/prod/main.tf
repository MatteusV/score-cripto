locals {
  github_repo = "${var.github_owner}/${var.github_repo_name}"
}

# ─── Bancos de dados Neon (um por serviço) ────────────────────────────────────

module "neon_api_gateway" {
  source = "../../modules/neon-database"

  project_name  = "score-cripto-api-gateway"
  region_id     = var.neon_region
  pg_version    = 16
  role_name     = "app"
  database_name = "api_gateway"
}

module "neon_process_data_ia" {
  source = "../../modules/neon-database"

  project_name  = "score-cripto-process-data-ia"
  region_id     = var.neon_region
  pg_version    = 16
  role_name     = "app"
  database_name = "process_data_ia"
}

module "neon_users" {
  source = "../../modules/neon-database"

  project_name  = "score-cripto-users"
  region_id     = var.neon_region
  pg_version    = 16
  role_name     = "app"
  database_name = "users"
}

# ─── Message broker (RabbitMQ) ────────────────────────────────────────────────

module "cloudamqp" {
  source = "../../modules/cloudamqp-vhost"

  instance_name = "score-cripto-prod"
  plan          = "little-lemur"
  region        = "amazon-web-services::us-east-1"
}

# ─── Cache Redis ──────────────────────────────────────────────────────────────

module "redis" {
  source = "../../modules/upstash-redis"

  database_name = "score-cripto-prod"
  region        = "us-east-1"
  tls_enabled   = true
  eviction      = false
}

# ─── Fly.io apps (um por serviço backend) ─────────────────────────────────────

module "fly_api_gateway" {
  source = "../../modules/fly-service"

  app_name           = "score-cripto-api-gateway"
  region             = var.fly_region
  github_repo        = local.github_repo
  github_secret_name = "FLY_API_TOKEN_API_GATEWAY"
  fly_api_token      = var.fly_api_token

  secrets = {
    DATABASE_URL = module.neon_api_gateway.connection_uri
    RABBITMQ_URL = module.cloudamqp.amqps_url
  }
}

module "fly_process_data_ia" {
  source = "../../modules/fly-service"

  app_name           = "score-cripto-process-data-ia"
  region             = var.fly_region
  github_repo        = local.github_repo
  github_secret_name = "FLY_API_TOKEN_PROCESS_DATA_IA"
  fly_api_token      = var.fly_api_token

  secrets = {
    DATABASE_URL = module.neon_process_data_ia.connection_uri
    RABBITMQ_URL = module.cloudamqp.amqps_url
  }
}

module "fly_users" {
  source = "../../modules/fly-service"

  app_name           = "score-cripto-users"
  region             = var.fly_region
  github_repo        = local.github_repo
  github_secret_name = "FLY_API_TOKEN_USERS"
  fly_api_token      = var.fly_api_token

  secrets = {
    DATABASE_URL = module.neon_users.connection_uri
    RABBITMQ_URL = module.cloudamqp.amqps_url
  }
}

module "fly_data_search" {
  source = "../../modules/fly-service"

  app_name           = "score-cripto-data-search"
  region             = var.fly_region
  github_repo        = local.github_repo
  github_secret_name = "FLY_API_TOKEN_DATA_SEARCH"
  fly_api_token      = var.fly_api_token

  secrets = {
    REDIS_URL    = module.redis.redis_url
    RABBITMQ_URL = module.cloudamqp.amqps_url
  }
}

module "fly_data_indexing" {
  source = "../../modules/fly-service"

  app_name           = "score-cripto-data-indexing"
  region             = var.fly_region
  github_repo        = local.github_repo
  github_secret_name = "FLY_API_TOKEN_DATA_INDEXING"
  fly_api_token      = var.fly_api_token

  secrets = {
    RABBITMQ_URL = module.cloudamqp.amqps_url
  }
}

# ─── Observabilidade (Grafana Cloud) ─────────────────────────────────────────

module "grafana_dashboards" {
  source = "../../modules/grafana-dashboards"

  grafana_url     = var.grafana_url
  grafana_auth    = var.grafana_auth
  folder_title    = "Score Cripto"
  dashboards_path = "${path.root}/../../../../infra/observability/grafana/provisioning/dashboards"
}

# ─── Frontend (Vercel) ────────────────────────────────────────────────────────

module "vercel_web_app" {
  source = "../../modules/vercel-project"

  project_name      = "score-cripto-web-app"
  framework         = "nextjs"
  root_directory    = "services/web-app"
  github_repo       = local.github_repo
  production_branch = "main"

  env_vars = [
    {
      key    = "NEXT_PUBLIC_API_URL"
      value  = "https://${module.fly_api_gateway.app_hostname}"
      target = ["production", "preview"]
    }
  ]
}

# ─── Branch protection no GitHub ─────────────────────────────────────────────

resource "github_branch_protection" "main" {
  repository_id = var.github_repo_name
  pattern       = "main"

  required_status_checks {
    strict   = true
    contexts = ["CI / CI passou"]
  }

  required_pull_request_reviews {
    required_approving_review_count = 0
    dismiss_stale_reviews           = true
  }

  required_linear_history = true
  allows_force_pushes    = false
  allows_deletions       = false
}
