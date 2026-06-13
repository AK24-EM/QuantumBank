###############################################################################
# ALB Module — Variables
###############################################################################

variable "vpc_id" {
  description = "VPC ID in which to create the ALB"
  type        = string
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs for the ALB (minimum 2 AZs)"
  type        = list(string)

  validation {
    condition     = length(var.public_subnet_ids) >= 2
    error_message = "At least 2 public subnets required for ALB high-availability."
  }
}

variable "alb_sg_id" {
  description = "Security group ID for the ALB"
  type        = string
}

variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS listener (wildcard *.quantumbank.com)"
  type        = string
}

variable "region" {
  description = "AWS region name — used for resource naming"
  type        = string
}

variable "environment" {
  description = "Deployment environment (controls deletion protection)"
  type        = string
  default     = "production"
}

variable "sns_alert_arn" {
  description = "SNS topic ARN for CloudWatch alarm notifications (leave empty to disable)"
  type        = string
  default     = ""
}
