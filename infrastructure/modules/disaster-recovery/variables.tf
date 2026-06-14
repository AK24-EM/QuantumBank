###############################################################################
# Disaster Recovery Module — Variables
###############################################################################

variable "region" {
  description = "AWS region this DR module is deployed in"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "ecs_cluster_name" {
  description = "ECS cluster name — used in FIS experiment targets"
  type        = string
}

variable "ecs_cluster_arn" {
  description = "ECS cluster ARN — used in FIS IAM policy scoping"
  type        = string
}

variable "service_names" {
  description = "Map of service key to ECS service name"
  type        = map(string)
}

variable "vpc_id" {
  description = "VPC ID — used for network disruption FIS experiments"
  type        = string
}

variable "sns_topic_arn" {
  description = "SNS topic ARN for DR alarm notifications"
  type        = string
}

variable "kms_key_arn" {
  description = "KMS key ARN for encrypting DR log group"
  type        = string
}

variable "rto_minutes" {
  description = "Recovery Time Objective in minutes — alarm fires if RTO is breached"
  type        = number
  default     = 30
}

variable "rpo_minutes" {
  description = "Recovery Point Objective in minutes — maximum tolerable data loss window"
  type        = number
  default     = 5
}

variable "chaos_enabled" {
  description = "Whether FIS experiments can be triggered. Set false in production to prevent accidental runs."
  type        = bool
  default     = false
}
