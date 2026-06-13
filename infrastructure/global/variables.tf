###############################################################################
# Global DNS - variables.tf
###############################################################################

variable "domain_name" {
  description = "DNS Root domain (e.g. quantumbank.com)"
  type        = string
  default     = "quantumbank.com"
}

variable "state_bucket_name" {
  description = "Bootstrap S3 bucket name for state lookups"
  type        = string
  default     = "quantumbank-tf-state-577137986953"
}

variable "dynamodb_table_name" {
  description = "Bootstrap DynamoDB lock table name"
  type        = string
  default     = "quantumbank-tf-locks"
}

variable "state_bucket_region" {
  description = "AWS region where the Terraform state bucket lives"
  type        = string
  default     = "ap-south-1"
}
