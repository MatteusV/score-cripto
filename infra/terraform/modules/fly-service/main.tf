terraform {
  required_providers {
    fly = {
      source  = "fly-apps/fly"
      version = "~> 0.0"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}

# App Fly.io — criado vazio; o deploy da imagem acontece via release.yml
resource "fly_app" "this" {
  name = var.app_name
  org  = "personal"
}

# Secrets da aplicação (injetados como env vars)
resource "fly_app_secret" "secrets" {
  for_each = var.secrets

  app_id  = fly_app.this.id
  key     = each.key
  value   = each.value
}

# Deploy token escopado por app — salvo no GitHub Actions
resource "fly_app_token" "deploy" {
  app_id    = fly_app.this.id
  name      = "${var.app_name}-deploy"
  expiry    = "8760h" # 1 ano
}

# Secret no GitHub para o workflow release.yml usar
resource "github_actions_secret" "deploy_token" {
  repository      = split("/", var.github_repo)[1]
  secret_name     = var.github_secret_name
  plaintext_value = fly_app_token.deploy.token
}
