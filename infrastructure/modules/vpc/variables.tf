###############################################################################
# VPC Module - Variables
###############################################################################

variable "vpc_cidr" {
  description = "CIDR block for the VPC (e.g. 10.0.0.0/16)"
  type        = string

  validation {
    condition     = can(cidrnetmask(var.vpc_cidr))
    error_message = "vpc_cidr must be a valid CIDR block."
  }
}

variable "region" {
  description = "AWS region name (e.g. us-east-1). Used for resource naming."
  type        = string
}

variable "environment" {
  description = "Deployment environment (production | staging)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "environment must be one of: production, staging, development."
  }
}

variable "availability_zones" {
  description = "List of AZ names in the target region. Exactly 3 required for HA."
  type        = list(string)

  validation {
    condition     = length(var.availability_zones) == 3
    error_message = "Exactly 3 availability zones are required for HA configuration."
  }
}

variable "public_subnet_cidrs" {
  description = "List of 3 CIDR blocks for public subnets (one per AZ)"
  type        = list(string)

  validation {
    condition     = length(var.public_subnet_cidrs) == 3
    error_message = "Exactly 3 public subnet CIDRs required."
  }
}

variable "private_subnet_cidrs" {
  description = "List of 3 CIDR blocks for private subnets (one per AZ)"
  type        = list(string)

  validation {
    condition     = length(var.private_subnet_cidrs) == 3
    error_message = "Exactly 3 private subnet CIDRs required."
  }
}

variable "enable_flow_logs" {
  description = "Enable VPC Flow Logs to CloudWatch Logs"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use one NAT gateway shared across all AZs (uses 1 EIP instead of 3)"
  type        = bool
  default     = true
}
