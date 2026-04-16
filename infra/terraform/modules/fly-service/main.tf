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
# Secret no GitHub para o workflow release.yml — usa o token de org Fly.io
resource "github_actions_secret" "deploy_token" {
  repository      = split("/", var.github_repo)[1]
  secret_name     = var.github_secret_name
  plaintext_value = var.fly_api_token
}
