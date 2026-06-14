###############################################################################
# Secrets Module - main.tf
#
# AWS Secrets Manager — one secret per service credential.
# Services pull secrets at container startup via ECS task execution role.
# No plaintext credentials in env vars, code, or task definitions.
#
# Secret naming convention: quantumbank/{service}/{secret-name}
# This matches the IAM policy in the iam module:
#   secretsmanager:GetSecretValue on quantumbank/* 
#
# Rotation:
#   - DB passwords: 30-day auto-rotation (requires Lambda rotation function)
#   - API keys/tokens: 90-day rotation reminder alarm via CloudWatch
#
# Usage in ECS task definition (already in ecs-cluster/main.tf):
#   secrets = [{ name = "DB_PASSWORD", valueFrom = "<secret_arn>" }]
###############################################################################

data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

locals {
  kms_key = var.kms_key_arn != "" ? var.kms_key_arn : null
}

###############################################################################
# KMS Customer Managed Key for secrets encryption
# Separate from AWS-managed key — gives full audit trail and rotation control
###############################################################################

resource "aws_kms_key" "secrets" {
  description             = "QuantumBank secrets encryption key — ${var.region}"
  deletion_window_in_days = 30
  enable_key_rotation     = true # Annual automatic rotation

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "RootAccountFullAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "SecretsManagerAccess"
        Effect = "Allow"
        Principal = {
          Service = "secretsmanager.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:CallerAccount" = data.aws_caller_identity.current.account_id
          }
        }
      },
      {
        Sid    = "CloudWatchLogsEncryption"
        Effect = "Allow"
        Principal = {
          Service = "logs.${var.region}.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name        = "quantumbank-secrets-key-${var.region}"
    Region      = var.region
    Environment = var.environment
    Purpose     = "secrets-encryption"
  }
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/quantumbank-secrets-${var.region}"
  target_key_id = aws_kms_key.secrets.key_id
}

###############################################################################
# Secrets — one per service credential set
# Initial values are placeholder strings. Real values must be set via:
#   aws secretsmanager put-secret-value --secret-id <arn> --secret-string '...'
# or injected via CI/CD with: -var="mongodb_uri=..."
###############################################################################

resource "aws_secretsmanager_secret" "mongodb_uri" {
  name                    = "quantumbank/shared/mongodb-uri"
  description             = "MongoDB Atlas connection URI for all QuantumBank services"
  kms_key_id              = aws_kms_key.secrets.arn
  recovery_window_in_days = 7

  tags = {
    Name        = "quantumbank-mongodb-uri"
    Service     = "shared"
    Region      = var.region
    Sensitivity = "critical"
  }
}

resource "aws_secretsmanager_secret_version" "mongodb_uri" {
  secret_id = aws_secretsmanager_secret.mongodb_uri.id
  # Populated externally — placeholder prevents Terraform drift errors on first apply.
  # Set real value: aws secretsmanager put-secret-value \
  #   --secret-id quantumbank/shared/mongodb-uri \
  #   --secret-string '{"uri":"mongodb+srv://..."}'
  secret_string = jsonencode({
    uri = var.mongodb_uri != "" ? var.mongodb_uri : "PLACEHOLDER_SET_VIA_CLI"
  })

  lifecycle {
    # Never overwrite secret values that were set externally (e.g., rotated)
    ignore_changes = [secret_string]
  }
}

resource "aws_secretsmanager_secret" "redis_url" {
  name                    = "quantumbank/shared/redis-url"
  description             = "Redis/ElastiCache URL for caching and session storage"
  kms_key_id              = aws_kms_key.secrets.arn
  recovery_window_in_days = 7

  tags = {
    Name        = "quantumbank-redis-url"
    Service     = "shared"
    Region      = var.region
    Sensitivity = "high"
  }
}

resource "aws_secretsmanager_secret_version" "redis_url" {
  secret_id     = aws_secretsmanager_secret.redis_url.id
  secret_string = jsonencode({ url = var.redis_url != "" ? var.redis_url : "PLACEHOLDER_SET_VIA_CLI" })
  lifecycle { ignore_changes = [secret_string] }
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "quantumbank/auth-service/jwt-secret"
  description             = "JWT signing secret — auth-service only"
  kms_key_id              = aws_kms_key.secrets.arn
  recovery_window_in_days = 7

  tags = {
    Name        = "quantumbank-jwt-secret"
    Service     = "auth-service"
    Region      = var.region
    Sensitivity = "critical"
  }
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = jsonencode({ secret = var.jwt_secret != "" ? var.jwt_secret : "PLACEHOLDER_SET_VIA_CLI" })
  lifecycle { ignore_changes = [secret_string] }
}

resource "aws_secretsmanager_secret" "jwt_refresh_secret" {
  name                    = "quantumbank/auth-service/jwt-refresh-secret"
  description             = "JWT refresh token signing secret — auth-service only"
  kms_key_id              = aws_kms_key.secrets.arn
  recovery_window_in_days = 7

  tags = {
    Name        = "quantumbank-jwt-refresh"
    Service     = "auth-service"
    Region      = var.region
    Sensitivity = "critical"
  }
}

resource "aws_secretsmanager_secret_version" "jwt_refresh_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_refresh_secret.id
  secret_string = jsonencode({ secret = var.jwt_refresh_secret != "" ? var.jwt_refresh_secret : "PLACEHOLDER_SET_VIA_CLI" })
  lifecycle { ignore_changes = [secret_string] }
}

# Per-service DB password placeholders — one per service
# Real values set by DBA or rotation Lambda after provisioning
locals {
  service_db_secrets = [
    "api-gateway",
    "payment-service",
    "auth-service",
    "notification-service",
    "analytics-worker",
    "statement-generator",
  ]
}

resource "aws_secretsmanager_secret" "service_db_password" {
  for_each = toset(local.service_db_secrets)

  name                    = "quantumbank/${each.key}/db-password"
  description             = "Database password for ${each.key} — auto-rotated every 30 days"
  kms_key_id              = aws_kms_key.secrets.arn
  recovery_window_in_days = 7

  tags = {
    Name        = "quantumbank-${each.key}-db-password"
    Service     = each.key
    Region      = var.region
    Sensitivity = "critical"
    AutoRotate  = "true"
  }
}

resource "aws_secretsmanager_secret_version" "service_db_password" {
  for_each = toset(local.service_db_secrets)

  secret_id     = aws_secretsmanager_secret.service_db_password[each.key].id
  secret_string = jsonencode({ password = "PLACEHOLDER_SET_VIA_CLI" })
  lifecycle { ignore_changes = [secret_string] }
}

###############################################################################
# CloudWatch Alarm — Secret rotation age
# Fires if any critical secret hasn't been rotated in > 90 days
###############################################################################

resource "aws_cloudwatch_metric_alarm" "secret_rotation_age" {
  alarm_name          = "quantumbank-secret-rotation-overdue-${var.region}"
  alarm_description   = "A QuantumBank secret has not been rotated in > 90 days. Compliance risk."
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ResourceNonCompliantCount"
  namespace           = "AWS/Config"
  period              = 86400 # 24h
  statistic           = "Maximum"
  threshold           = 0
  treat_missing_data  = "notBreaching"

  dimensions = {
    ConfigRuleName = "secretsmanager-rotation-enabled-check"
  }

  tags = {
    Region  = var.region
    Pillar  = "security"
    Purpose = "secret-rotation"
  }
}
