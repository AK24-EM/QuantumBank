###############################################################################
# Compliance Module - Variables
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
  description = "KMS key ARN for encrypting CloudTrail logs and compliance reports"
  type        = string
}

variable "sns_topic_arn" {
  description = "SNS topic ARN for compliance violation alerts"
  type        = string
}

variable "log_group_names" {
  description = "Map of service log group names for compliance log retention policy"
  type        = map(string)
  default     = {}
}
