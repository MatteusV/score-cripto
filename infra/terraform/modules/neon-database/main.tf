terraform {
  required_providers {
    neon = {
      source  = "kislerdm/neon"
      version = "~> 0.9"
    }
  }
}

resource "neon_project" "this" {
  name                      = var.project_name
  region_id                 = var.region_id
  pg_version                = var.pg_version
  history_retention_seconds = 21600 # máximo no free tier (6h)
}

resource "neon_role" "app" {
  project_id = neon_project.this.id
  branch_id  = neon_project.this.default_branch_id
  name       = var.role_name
}

resource "neon_database" "app" {
  project_id = neon_project.this.id
  branch_id  = neon_project.this.default_branch_id
  name       = var.database_name
  owner_name = neon_role.app.name
}
