###############################################################################
# Environment: ap-south-1 - variables.tf
###############################################################################

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
}

variable "availability_zones" {
  description = "List of AZs"
  type        = list(string)
}

variable "public_subnet_cidrs" {
  description = "List of public subnet CIDR blocks"
  type        = list(string)
}

variable "private_subnet_cidrs" {
  description = "List of private subnet CIDR blocks"
  type        = list(string)
}

variable "state_bucket_arn" {
  description = "ARN of S3 bucket for tf state"
  type        = string
}

variable "dynamodb_table_arn" {
  description = "ARN of DynamoDB table for tf locks"
  type        = string
}

variable "certificate_arn" {
  description = "ACM Certificate ARN for wildcard domain"
  type        = string
}

variable "github_org" {
  description = "GitHub Org name for OIDC configuration"
  type        = string
}

variable "github_repo" {
  description = "GitHub repo name for OIDC configuration"
  type        = string
}

variable "sns_alert_arn" {
  description = "SNS Alert ARN for CloudWatch logs/alarms"
  type        = string
  default     = ""
}
