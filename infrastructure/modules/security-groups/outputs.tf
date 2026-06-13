###############################################################################
# Security Groups Module — Outputs
###############################################################################

output "alb_sg_id" {
  description = "Security Group ID for the Application Load Balancer"
  value       = aws_security_group.alb.id
}

output "ecs_sg_id" {
  description = "Security Group ID for ECS Fargate tasks"
  value       = aws_security_group.ecs.id
}

output "db_sg_id" {
  description = "Security Group ID for databases (RDS, DocumentDB, Redis)"
  value       = aws_security_group.db.id
}

output "s3_vpc_endpoint_id" {
  description = "ID of the S3 VPC Gateway Endpoint"
  value       = aws_vpc_endpoint.s3.id
}

output "dynamodb_vpc_endpoint_id" {
  description = "ID of the DynamoDB VPC Gateway Endpoint"
  value       = aws_vpc_endpoint.dynamodb.id
}
