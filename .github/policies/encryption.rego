# QuantumBank OPA Policy — Encryption Enforcement
# Namespace: quantumbank
#
# Enforces that all storage resources in production have encryption enabled.
# Violations are DENY — they block the plan from applying.

package quantumbank

import rego.v1

# ── S3 buckets must have SSE enabled ─────────────────────────────────────────

deny contains msg if {
  resource := input.resource_changes[_]
  resource.type == "aws_s3_bucket_server_side_encryption_configuration"
  count(resource.change.after.rule) == 0
  msg := sprintf(
    "DENY: S3 bucket '%s' has no server-side encryption configuration",
    [resource.address]
  )
}

# ── CloudWatch Log Groups must be encrypted with KMS ─────────────────────────

deny contains msg if {
  resource := input.resource_changes[_]
  resource.type == "aws_cloudwatch_log_group"
  not resource.change.after.kms_key_id
  # Compliance and CloudTrail log groups must be KMS-encrypted
  contains(resource.address, "compliance")
  msg := sprintf(
    "DENY: CloudWatch Log Group '%s' must be encrypted with a KMS key (compliance requirement)",
    [resource.address]
  )
}

# ── SNS topics must be encrypted ─────────────────────────────────────────────

deny contains msg if {
  resource := input.resource_changes[_]
  resource.type == "aws_sns_topic"
  not resource.change.after.kms_master_key_id
  msg := sprintf(
    "DENY: SNS topic '%s' is not encrypted. Set kms_master_key_id.",
    [resource.address]
  )
}

# ── DynamoDB tables must have SSE enabled ────────────────────────────────────

deny contains msg if {
  resource := input.resource_changes[_]
  resource.type == "aws_dynamodb_table"
  not resource.change.after.server_side_encryption[_].enabled
  msg := sprintf(
    "DENY: DynamoDB table '%s' does not have server-side encryption enabled",
    [resource.address]
  )
}

# ── Warn: KMS keys should have rotation enabled ──────────────────────────────

warn contains msg if {
  resource := input.resource_changes[_]
  resource.type == "aws_kms_key"
  not resource.change.after.enable_key_rotation
  msg := sprintf(
    "WARN: KMS key '%s' does not have automatic key rotation enabled",
    [resource.address]
  )
}
