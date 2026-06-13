###############################################################################
# Security Groups Module - Variables
###############################################################################

variable "vpc_id" {
  description = "ID of the VPC in which to create security groups"
  type        = string
}

variable "region" {
  description = "AWS region name - used for resource naming and VPC endpoints"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}
