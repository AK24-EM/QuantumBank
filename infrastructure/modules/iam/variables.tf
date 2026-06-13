###############################################################################
# IAM Module - Variables
###############################################################################

variable "region" {
  description = "AWS region for resource naming"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "state_bucket_arn" {
  description = "ARN of the S3 bucket storing Terraform state (from bootstrap output)"
  type        = string
}

variable "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table for Terraform state locking (from bootstrap output)"
  type        = string
}

variable "github_org" {
  description = "GitHub organization name for OIDC trust (e.g. quantumbank-org)"
  type        = string
  default     = "quantumbank-org"
}

variable "github_repo" {
  description = "GitHub repository name for OIDC trust (e.g. platform)"
  type        = string
  default     = "platform"
}
