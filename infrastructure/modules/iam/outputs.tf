###############################################################################
# IAM Module — Outputs
###############################################################################

output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS Task Execution Role (passed to task definitions)"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "ecs_task_execution_role_name" {
  description = "Name of the ECS Task Execution Role"
  value       = aws_iam_role.ecs_task_execution.name
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS Task Role (runtime permissions for the application)"
  value       = aws_iam_role.ecs_task.arn
}

output "ecs_task_role_name" {
  description = "Name of the ECS Task Role"
  value       = aws_iam_role.ecs_task.name
}

output "terraform_deploy_role_arn" {
  description = "ARN of the Terraform Deploy Role (assumed by CI/CD via OIDC)"
  value       = aws_iam_role.terraform_deploy.arn
}

output "chaos_engineering_role_arn" {
  description = "ARN of the Chaos Engineering Role (admin-only, MFA required)"
  value       = aws_iam_role.chaos_engineering.arn
}

output "ecs_permission_boundary_arn" {
  description = "ARN of the ECS permission boundary policy"
  value       = aws_iam_policy.ecs_boundary.arn
}
