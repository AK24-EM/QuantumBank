###############################################################################
# Environment: eu-west-1 - providers.tf
###############################################################################

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    key     = "environments/eu-west-1/terraform.tfstate"
    encrypt = true
  }
}

provider "aws" {
  region = "eu-west-1"

  default_tags {
    tags = {
      Project     = "quantumbank"
      Environment = "production"
      Region      = "eu-west-1"
      ManagedBy   = "terraform"
    }
  }
}
