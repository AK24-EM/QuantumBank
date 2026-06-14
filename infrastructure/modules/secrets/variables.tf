###############################################################################
# Secrets Module - Variables
#
# Manages AWS Secrets Manager secrets for all QuantumBank services.
# Services fetch secrets at runtime via the ECS task execution role —
# no secrets in environment variables, Dockerfiles, or code.
###############################################################################

variable "region" {
  description = "AWS region"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "kms_key_arn" {
  description = "KMS key ARN for secret encryption (uses aws/secretsmanager if empty)"
  type        = string
  default     = ""
}

variable "mongodb_uri" {
  description = "MongoDB Atlas connection URI"
  type        = string
  sensitive   = true
  default     = ""
}

variable "redis_url" {
  description = "Redis/ElastiCache connection URL"
  type        = string
  sensitive   = true
  default     = ""
}

variable "jwt_secret" {
  description = "JWT signing secret for auth-service"
  type        = string
  sensitive   = true
  default     = ""
}

variable "jwt_refresh_secret" {
  description = "JWT refresh token signing secret"
  type        = string
  sensitive   = true
  default     = ""
}
