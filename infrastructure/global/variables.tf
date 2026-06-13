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
  default     = "quantumbank-terraform-state"
}
