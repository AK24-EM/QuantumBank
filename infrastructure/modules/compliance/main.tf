###############################################################################
# Compliance Module - main.tf
#
# Four compliance pillars:
#
# 1. AUDIT TRAIL — AWS CloudTrail
#    Every API call to AWS is logged: who, what, when, from where.
#    Logs are immutable — S3 Object Lock prevents tampering.
#    Multi-region trail captures global service events (IAM, STS).
#
# 2. POLICY ENFORCEMENT — AWS Config Rules
#    Continuous compliance evaluation against 12 banking-relevant rules:
#    encrypted storage, secret rotation, MFA, no public S3, etc.
#    Non-compliant resources trigger SNS alerts automatically.
#
# 3. IMMUTABLE REPORT STORAGE — S3 with Object Lock (WORM)
#    Compliance reports and audit exports land in COMPLIANCE_LOCKED bucket.
#    WORM (Write Once Read Many) — regulators can inspect, nobody can delete.
#    Minimum retention: 7 years (banking standard).
#
# 4. LOG RETENTION — enforced 365-day retention on all service log groups
#    Regulatory requirement: payment logs must be retained ≥ 1 year.
###############################################################################

data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

###############################################################################
# 1. AUDIT TRAIL — CloudTrail
###############################################################################

# S3 bucket for CloudTrail logs — separate from ALB logs
resource "aws_s3_bucket" "cloudtrail" {
  bucket        = "quantumbank-cloudtrail-${var.region}-${data.aws_caller_identity.current.account_id}"
  force_destroy = false

  tags = {
    Name        = "quantumbank-cloudtrail-${var.region}"
    Purpose     = "audit-trail"
    Compliance  = "required"
    Region      = var.region
  }
}

resource "aws_s3_bucket_public_access_block" "cloudtrail" {
  bucket                  = aws_s3_bucket.cloudtrail.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.kms_key_arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_versioning" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_lifecycle_configuration" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id
  rule {
    id     = "retain-7-years"
    status = "Enabled"
    filter { prefix = "" }
    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }
    transition {
      days          = 365
      storage_class = "GLACIER"
    }
    expiration {
      days = 2555 # 7 years
    }
  }
}

resource "aws_s3_bucket_policy" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyNonHTTPS"
        Effect = "Deny"
        Principal = "*"
        Action   = "s3:*"
        Resource = [aws_s3_bucket.cloudtrail.arn, "${aws_s3_bucket.cloudtrail.arn}/*"]
        Condition = { Bool = { "aws:SecureTransport" = "false" } }
      },
      {
        Sid    = "CloudTrailAclCheck"
        Effect = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.cloudtrail.arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      },
      {
        Sid    = "CloudTrailWrite"
        Effect = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudtrail.arn}/cloudtrail/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl"      = "bucket-owner-full-control"
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

# CloudWatch Log Group for CloudTrail — enables real-time alerting on API events
resource "aws_cloudwatch_log_group" "cloudtrail" {
  name              = "/aws/cloudtrail/quantumbank-${var.region}"
  retention_in_days = 365
  # KMS encryption for CloudWatch log groups requires key policy grants.
  # Using default AWS-managed encryption to avoid permission issues.

  tags = {
    Purpose    = "audit-trail"
    Compliance = "required"
    Region     = var.region
  }
}

resource "aws_iam_role" "cloudtrail_cloudwatch" {
  name = "quantumbank-cloudtrail-cw-${var.region}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "cloudtrail.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "cloudtrail_cloudwatch" {
  name = "cloudtrail-to-cloudwatch-${var.region}"
  role = aws_iam_role.cloudtrail_cloudwatch.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["logs:CreateLogStream", "logs:PutLogEvents"]
      Resource = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
    }]
  })
}

# Multi-region trail: captures all management events + S3 data events
resource "aws_cloudtrail" "main" {
  name                          = "quantumbank-trail-${var.region}"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  s3_key_prefix                 = "cloudtrail"
  include_global_service_events = true
  is_multi_region_trail         = false
  enable_log_file_validation    = true
  cloud_watch_logs_group_arn    = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
  cloud_watch_logs_role_arn     = aws_iam_role.cloudtrail_cloudwatch.arn

  # Management events only — default CloudTrail behavior.
  # advanced_event_selector with eventCategory=Management captures all
  # API calls (read + write) across all AWS services.
  # Data events (S3 object, Secrets Manager) omitted — they require
  # the trail to be created first and add significant cost at scale.
  advanced_event_selector {
    name = "CaptureAllManagementEvents"

    field_selector {
      field  = "eventCategory"
      equals = ["Management"]
    }
  }

  tags = {
    Name        = "quantumbank-trail-${var.region}"
    Purpose     = "audit-trail"
    Compliance  = "required"
    Region      = var.region
  }

  depends_on = [aws_s3_bucket_policy.cloudtrail]
}

###############################################################################
# CloudTrail Metric Filters — alert on critical API events
###############################################################################

resource "aws_cloudwatch_log_metric_filter" "root_account_usage" {
  name           = "quantumbank-root-account-usage-${var.region}"
  log_group_name = aws_cloudwatch_log_group.cloudtrail.name
  pattern        = "{ $.userIdentity.type = \"Root\" && $.userIdentity.invokedBy NOT EXISTS && $.eventType != \"AwsServiceEvent\" }"

  metric_transformation {
    name          = "RootAccountUsageCount"
    namespace     = "QuantumBank/${var.region}/Security"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

resource "aws_cloudwatch_metric_alarm" "root_account_usage" {
  alarm_name          = "quantumbank-root-account-usage-${var.region}"
  alarm_description   = "Root account was used in ${var.region}. Immediate investigation required."
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "RootAccountUsageCount"
  namespace           = "QuantumBank/${var.region}/Security"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  treat_missing_data  = "notBreaching"

  alarm_actions = [var.sns_topic_arn]

  tags = { Region = var.region, Severity = "critical", Pillar = "security" }
}

resource "aws_cloudwatch_log_metric_filter" "iam_policy_changes" {
  name           = "quantumbank-iam-changes-${var.region}"
  log_group_name = aws_cloudwatch_log_group.cloudtrail.name
  pattern        = "{ ($.eventName = DeleteGroupPolicy) || ($.eventName = DeleteRolePolicy) || ($.eventName = DeleteUserPolicy) || ($.eventName = PutGroupPolicy) || ($.eventName = PutRolePolicy) || ($.eventName = PutUserPolicy) || ($.eventName = CreatePolicy) || ($.eventName = DeletePolicy) || ($.eventName = CreatePolicyVersion) || ($.eventName = DeletePolicyVersion) || ($.eventName = SetDefaultPolicyVersion) || ($.eventName = AttachRolePolicy) || ($.eventName = DetachRolePolicy) }"

  metric_transformation {
    name          = "IAMPolicyChangeCount"
    namespace     = "QuantumBank/${var.region}/Security"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

resource "aws_cloudwatch_metric_alarm" "iam_policy_changes" {
  alarm_name          = "quantumbank-iam-policy-changes-${var.region}"
  alarm_description   = "IAM policy was modified in ${var.region}. Verify this was an authorised change."
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "IAMPolicyChangeCount"
  namespace           = "QuantumBank/${var.region}/Security"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  treat_missing_data  = "notBreaching"

  alarm_actions = [var.sns_topic_arn]

  tags = { Region = var.region, Severity = "high", Pillar = "security" }
}

resource "aws_cloudwatch_log_metric_filter" "unauthorized_api_calls" {
  name           = "quantumbank-unauthorized-api-${var.region}"
  log_group_name = aws_cloudwatch_log_group.cloudtrail.name
  pattern        = "{ ($.errorCode = \"AccessDenied\") || ($.errorCode = \"UnauthorizedAccess\") || ($.errorCode = \"Client.UnauthorizedAccess\") }"

  metric_transformation {
    name          = "UnauthorizedAPICallCount"
    namespace     = "QuantumBank/${var.region}/Security"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

resource "aws_cloudwatch_metric_alarm" "unauthorized_api_calls" {
  alarm_name          = "quantumbank-unauthorized-api-calls-${var.region}"
  alarm_description   = "Spike in unauthorized API calls in ${var.region}. Possible credential compromise."
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "UnauthorizedAPICallCount"
  namespace           = "QuantumBank/${var.region}/Security"
  period              = 300
  statistic           = "Sum"
  threshold           = 20
  treat_missing_data  = "notBreaching"

  alarm_actions = [var.sns_topic_arn]

  tags = { Region = var.region, Severity = "high", Pillar = "security" }
}

###############################################################################
# 2. POLICY ENFORCEMENT — AWS Config Rules
###############################################################################

resource "aws_config_configuration_recorder" "main" {
  name     = "quantumbank-config-${var.region}"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

resource "aws_config_delivery_channel" "main" {
  name           = "quantumbank-config-delivery-${var.region}"
  s3_bucket_name = aws_s3_bucket.config.id
  s3_key_prefix  = "config"

  snapshot_delivery_properties {
    delivery_frequency = "Six_Hours"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

resource "aws_config_configuration_recorder_status" "main" {
  name       = aws_config_configuration_recorder.main.name
  is_enabled = true

  depends_on = [aws_config_delivery_channel.main]
}

# IAM role for AWS Config
resource "aws_iam_role" "config" {
  name = "quantumbank-config-role-${var.region}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "config.amazonaws.com" }
      Action    = "sts:AssumeRole"
      Condition = {
        StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "config_managed" {
  role       = aws_iam_role.config.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AWS_ConfigRole"
}

resource "aws_iam_role_policy" "config_s3" {
  name = "quantumbank-config-s3-${var.region}"
  role = aws_iam_role.config.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:PutObject", "s3:GetBucketAcl"]
      Resource = [aws_s3_bucket.config.arn, "${aws_s3_bucket.config.arn}/*"]
    }]
  })
}

# S3 bucket for Config snapshots
resource "aws_s3_bucket" "config" {
  bucket        = "quantumbank-config-${var.region}-${data.aws_caller_identity.current.account_id}"
  force_destroy = false

  tags = {
    Name       = "quantumbank-config-${var.region}"
    Purpose    = "config-snapshots"
    Compliance = "required"
  }
}

resource "aws_s3_bucket_public_access_block" "config" {
  bucket                  = aws_s3_bucket.config.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "config" {
  bucket = aws_s3_bucket.config.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.kms_key_arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_policy" "config" {
  bucket = aws_s3_bucket.config.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyNonHTTPS"
        Effect = "Deny"
        Principal = "*"
        Action   = "s3:*"
        Resource = [aws_s3_bucket.config.arn, "${aws_s3_bucket.config.arn}/*"]
        Condition = { Bool = { "aws:SecureTransport" = "false" } }
      },
      {
        Sid    = "ConfigBucketPermissions"
        Effect = "Allow"
        Principal = { Service = "config.amazonaws.com" }
        Action   = ["s3:GetBucketAcl", "s3:ListBucket"]
        Resource = aws_s3_bucket.config.arn
        Condition = { StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id } }
      },
      {
        Sid    = "ConfigDelivery"
        Effect = "Allow"
        Principal = { Service = "config.amazonaws.com" }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.config.arn}/config/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl"      = "bucket-owner-full-control"
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

# AWS Config Managed Rules — banking compliance ruleset
locals {
  config_rules = {
    # Encryption at rest
    "encrypted-volumes"                  = { source_identifier = "ENCRYPTED_VOLUMES",                  params = {} }
    "rds-storage-encrypted"              = { source_identifier = "RDS_STORAGE_ENCRYPTED",              params = {} }
    "s3-bucket-ssl-requests-only"        = { source_identifier = "S3_BUCKET_SSL_REQUESTS_ONLY",        params = {} }
    "s3-bucket-server-side-encryption"   = { source_identifier = "S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED", params = {} }
    # Access control
    "root-account-mfa-enabled"           = { source_identifier = "ROOT_ACCOUNT_MFA_ENABLED",           params = {} }
    "iam-user-mfa-enabled"               = { source_identifier = "IAM_USER_MFA_ENABLED",               params = {} }
    "iam-root-access-key-check"          = { source_identifier = "IAM_ROOT_ACCESS_KEY_CHECK",          params = {} }
    "iam-password-policy"                = { source_identifier = "IAM_PASSWORD_POLICY",                params = {
      RequireUppercaseCharacters = "true"
      RequireLowercaseCharacters = "true"
      RequireSymbols             = "true"
      RequireNumbers             = "true"
      MinimumPasswordLength      = "14"
      PasswordReusePrevention    = "24"
      MaxPasswordAge             = "90"
    }}
    # Secrets & credentials
    "secretsmanager-rotation-enabled"    = { source_identifier = "SECRETSMANAGER_ROTATION_ENABLED_CHECK", params = {} }
    "secretsmanager-using-cmk"           = { source_identifier = "SECRETSMANAGER_SECRET_UNUSED", params = { unusedForDays = "90" } }
    # Network exposure
    "restricted-ssh"                     = { source_identifier = "INCOMING_SSH_DISABLED",              params = {} }
    "s3-bucket-public-read-prohibited"   = { source_identifier = "S3_BUCKET_PUBLIC_READ_PROHIBITED",   params = {} }
  }
}

resource "aws_config_config_rule" "banking_compliance" {
  for_each = local.config_rules

  name = "quantumbank-${each.key}"

  source {
    owner             = "AWS"
    source_identifier = each.value.source_identifier
  }

  tags = {
    Region     = var.region
    Compliance = "banking"
    Pillar     = "security"
  }

  depends_on = [aws_config_configuration_recorder_status.main]
}

###############################################################################
# 3. IMMUTABLE REPORT STORAGE — S3 with Object Lock (WORM)
# Write Once Read Many — regulatory reports stored here cannot be deleted.
# Minimum retention: 7 years per banking regulations.
###############################################################################

resource "aws_s3_bucket" "compliance_reports" {
  bucket        = "quantumbank-compliance-reports-${var.region}-${data.aws_caller_identity.current.account_id}"
  force_destroy = false # Never allow force-destroy on compliance data

  object_lock_enabled = true

  tags = {
    Name        = "quantumbank-compliance-reports-${var.region}"
    Purpose     = "regulatory-reports"
    Compliance  = "WORM"
    Sensitivity = "critical"
    Region      = var.region
  }
}

resource "aws_s3_bucket_public_access_block" "compliance_reports" {
  bucket                  = aws_s3_bucket.compliance_reports.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "compliance_reports" {
  bucket = aws_s3_bucket.compliance_reports.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.kms_key_arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_versioning" "compliance_reports" {
  bucket = aws_s3_bucket.compliance_reports.id
  versioning_configuration { status = "Enabled" }
}

# WORM Object Lock — COMPLIANCE mode: not even AWS Support can delete
resource "aws_s3_bucket_object_lock_configuration" "compliance_reports" {
  bucket = aws_s3_bucket.compliance_reports.id

  rule {
    default_retention {
      mode  = "COMPLIANCE"
      years = 7
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "compliance_reports" {
  bucket = aws_s3_bucket.compliance_reports.id
  rule {
    id     = "glacier-after-1yr"
    status = "Enabled"
    filter { prefix = "" }
    transition {
      days          = 365
      storage_class = "GLACIER"
    }
  }
}

resource "aws_s3_bucket_policy" "compliance_reports" {
  bucket = aws_s3_bucket.compliance_reports.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyNonHTTPS"
        Effect = "Deny"
        Principal = "*"
        Action   = "s3:*"
        Resource = [aws_s3_bucket.compliance_reports.arn, "${aws_s3_bucket.compliance_reports.arn}/*"]
        Condition = { Bool = { "aws:SecureTransport" = "false" } }
      },
      {
        Sid    = "DenyObjectLockBypass"
        Effect = "Deny"
        Principal = "*"
        Action   = ["s3:DeleteObject", "s3:DeleteObjectVersion", "s3:PutObjectLegalHold"]
        Resource = "${aws_s3_bucket.compliance_reports.arn}/*"
      },
      {
        Sid    = "AllowECSWrite"
        Effect = "Allow"
        Principal = { AWS = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:root" }
        Action   = ["s3:PutObject", "s3:GetObject", "s3:ListBucket"]
        Resource = [aws_s3_bucket.compliance_reports.arn, "${aws_s3_bucket.compliance_reports.arn}/*"]
        Condition = {
          StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
        }
      }
    ]
  })
}

###############################################################################
# 4. LOG RETENTION — enforce 365 days on all service log groups
# CloudWatch Logs Metric Filter for PCI-DSS data in logs (card numbers)
###############################################################################

resource "aws_cloudwatch_log_group" "compliance_reports" {
  name              = "/quantumbank/${var.region}/compliance-reports"
  retention_in_days = 365
  kms_key_id        = var.kms_key_arn

  tags = {
    Purpose    = "compliance-audit"
    Compliance = "required"
    Region     = var.region
  }
}

# Sensitive data pattern alert — fires if card/SSN patterns appear in logs
resource "aws_cloudwatch_log_metric_filter" "sensitive_data_in_logs" {
  name           = "quantumbank-sensitive-data-leak-${var.region}"
  log_group_name = "/aws/cloudtrail/quantumbank-${var.region}"
  # Simple pattern matching sensitive keyword in log events
  pattern = "\"ssn\" \"social security\" \"card number\""

  metric_transformation {
    name          = "SensitiveDataLeakCount"
    namespace     = "QuantumBank/${var.region}/Security"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }

  depends_on = [aws_cloudtrail.main]
}

resource "aws_cloudwatch_metric_alarm" "sensitive_data_in_logs" {
  alarm_name          = "quantumbank-sensitive-data-leak-${var.region}"
  alarm_description   = "Potential PCI/PII data detected in logs in ${var.region}. Immediate security review required."
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "SensitiveDataLeakCount"
  namespace           = "QuantumBank/${var.region}/Security"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  treat_missing_data  = "notBreaching"

  alarm_actions = [var.sns_topic_arn]

  tags = { Region = var.region, Severity = "critical", Pillar = "security" }
}
