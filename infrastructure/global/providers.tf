###############################################################################
# Global DNS - providers.tf
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
    key     = "global/dns/terraform.tfstate"
    encrypt = true
  }
}

provider "aws" {
  region = "us-east-1" # Route 53 hosted zones are global; API endpoint is us-east-1

  default_tags {
    tags = {
      Project     = "quantumbank"
      Environment = "production"
      Region      = "global"
      ManagedBy   = "terraform"
    }
  }
}
