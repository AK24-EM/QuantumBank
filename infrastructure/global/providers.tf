###############################################################################
# Global DNS — providers.tf
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
    key            = "global/dns/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "quantumbank-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region  = "us-east-1" # DNS setup runs in us-east-1 (global)
  profile = "quantumbank"

  default_tags {
    tags = {
      Project     = "quantumbank"
      Environment = "production"
      Region      = "global"
      ManagedBy   = "terraform"
    }
  }
}
