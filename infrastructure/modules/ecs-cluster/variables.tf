###############################################################################
# ECS Cluster Module - Variables
###############################################################################

variable "region" {
  description = "AWS region name"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "vpc_id" {
  description = "VPC ID for service discovery namespace"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "ecs_sg_id" {
  description = "Security group ID for ECS tasks"
  type        = string
}

variable "task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  type        = string
}

variable "task_role_arn" {
  description = "ARN of the ECS task role (runtime app permissions)"
  type        = string
}

variable "target_group_arn" {
  description = "ARN of the ALB target group (for ALB-attached services)"
  type        = string
}
