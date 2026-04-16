terraform {
  required_version = "~> 1.9"

  # Backend remoto no Terraform Cloud
  # Workspace VCS-driven trigger: infra/terraform/environments/prod/**
  backend "remote" {
    organization = "score-cripto"

    workspaces {
      name = "score-cripto"
    }
  }

  required_providers {
    fly = {
      source  = "fly-apps/fly"
      version = "~> 0.0"
    }
    neon = {
      source  = "kislerdm/neon"
      version = "~> 0.9"
    }
    cloudamqp = {
      source  = "cloudamqp/cloudamqp"
      version = "~> 1.44"
    }
    upstash = {
      source  = "upstash/upstash"
      version = "~> 1.5"
    }
    grafana = {
      source  = "grafana/grafana"
      version = "~> 4.0"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "~> 4.0"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}
