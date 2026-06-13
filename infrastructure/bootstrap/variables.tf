###############################################################################
# Bootstrap - Variables
###############################################################################

variable "aws_region" {
  description = "AWS region for the bootstrap resources (state bucket always lives in primary region)"
  type        = string
  default     = "us-east-1"

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]$", var.aws_region))
    error_message = "aws_region must be a valid AWS region identifier (e.g. us-east-1)."
  }
}
