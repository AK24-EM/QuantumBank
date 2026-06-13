###############################################################################
# Environment: eu-west-1 — providers.tf
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
    bucket         = "quantumbank-terraform-state"
    key            = "environments/eu-west-1/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "quantumbank-terraform-locks"
    encrypt        = true
    profile        = "quantumbank"
  }
}

provider "aws" {
  region  = "eu-west-1"
  profile = "quantumbank"

  default_tags {
    tags = {
      Project     = "quantumbank"
      Environment = "production"
      Region      = "eu-west-1"
      ManagedBy   = "terraform"
    }
  }
}
