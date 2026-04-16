terraform {
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 4.0"
    }
  }
}

resource "vercel_project" "this" {
  name      = var.project_name
  framework = var.framework

  git_repository = {
    type              = "github"
    repo              = var.github_repo
    production_branch = var.production_branch
  }

  root_directory = var.root_directory

  # Ignora mudanças fora do diretório do web-app
  ignore_command = "git diff --quiet HEAD^ HEAD -- ${var.root_directory}"
}

resource "vercel_project_environment_variable" "env_vars" {
  for_each = { for v in var.env_vars : v.key => v }

  project_id = vercel_project.this.id
  key        = each.value.key
  value      = each.value.value
  target     = each.value.target
}
