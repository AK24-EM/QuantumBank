###############################################################################
# ECS Cluster Module - Outputs
###############################################################################

output "cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "service_names" {
  description = "Map of service names to ECS service names"
  value = merge(
    { for k, v in aws_ecs_service.alb_services : k => v.name },
    { for k, v in aws_ecs_service.internal_services : k => v.name }
  )
}

output "ecr_repository_urls" {
  description = "Map of service names to ECR repository URLs"
  value       = { for k, v in aws_ecr_repository.services : k => v.repository_url }
}

output "service_discovery_namespace_id" {
  description = "ID of the Cloud Map private DNS namespace"
  value       = aws_service_discovery_private_dns_namespace.main.id
}

output "service_discovery_namespace_name" {
  description = "DNS name of the Cloud Map namespace (e.g. quantumbank.us-east-1.internal)"
  value       = aws_service_discovery_private_dns_namespace.main.name
}

output "log_group_names" {
  description = "Map of service names to CloudWatch Log Group names"
  value       = { for k, v in aws_cloudwatch_log_group.services : k => v.name }
}
