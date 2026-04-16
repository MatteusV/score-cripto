output "project_id" {
  description = "ID do projeto Vercel"
  value       = vercel_project.this.id
}

output "project_name" {
  description = "Nome do projeto Vercel"
  value       = vercel_project.this.name
}

output "production_url" {
  description = "URL de produção do projeto"
  value       = "${vercel_project.this.name}.vercel.app"
}
