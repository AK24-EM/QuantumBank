###############################################################################
# QuantumBank - Bootstrap Module
# Creates the S3 remote-state bucket and DynamoDB lock table.
# Apply ONCE before all other environment modules.
#
#   cd infrastructure/bootstrap
#   terraform init
#   terraform apply
###############################################################################

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region  = var.aws_region
  profile = "quantumbank"

  default_tags {
    tags = {
      Project     = "quantumbank"
      ManagedBy   = "terraform"
      Environment = "production"
      Module      = "bootstrap"
    }
  }
}

###############################################################################
# Data
###############################################################################

data "aws_caller_identity" "current" {}

###############################################################################
# S3 - Remote State Bucket
###############################################################################

resource "aws_s3_bucket" "tf_state" {
  bucket = "quantumbank-tf-state-${data.aws_caller_identity.current.account_id}"

  # Protect against accidental destruction
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "tf_state" {
  bucket                  = aws_s3_bucket.tf_state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyNonHTTPS"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.tf_state.arn,
          "${aws_s3_bucket.tf_state.arn}/*"
        ]
        Condition = {
          Bool = { "aws:SecureTransport" = "false" }
        }
      },
      {
        Sid       = "DenyDeleteBucket"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:DeleteBucket"
        Resource  = aws_s3_bucket.tf_state.arn
      }
    ]
  })
}

resource "aws_s3_bucket_lifecycle_configuration" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  rule {
    id     = "expire-old-state-versions"
    status = "Enabled"
    filter { prefix = "" }
    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

###############################################################################
# DynamoDB - State Locking Table
###############################################################################

resource "aws_dynamodb_table" "tf_locks" {
  name         = "quantumbank-tf-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  lifecycle {
    prevent_destroy = true
  }
}

###############################################################################
# CloudWatch - S3 bucket access log bucket
###############################################################################

resource "aws_s3_bucket" "tf_state_access_logs" {
  bucket = "quantumbank-tf-state-logs-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "tf_state_access_logs" {
  bucket                  = aws_s3_bucket.tf_state_access_logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_logging" "tf_state" {
  bucket        = aws_s3_bucket.tf_state.id
  target_bucket = aws_s3_bucket.tf_state_access_logs.id
  target_prefix = "state-access-logs/"
}
