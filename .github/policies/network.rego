# QuantumBank OPA Policy — Network Security Enforcement
# Namespace: quantumbank
#
# Enforces network security controls on security groups and S3 buckets.

package quantumbank

import rego.v1

# ── No security groups allowing unrestricted inbound SSH (port 22) ───────────

deny contains msg if {
  resource := input.resource_changes[_]
  resource.type == "aws_security_group"
  ingress := resource.change.after.ingress[_]
  ingress.from_port <= 22
  ingress.to_port >= 22
  cidr := ingress.cidr_blocks[_]
  cidr == "0.0.0.0/0"
  msg := sprintf(
    "DENY: Security group '%s' allows unrestricted SSH (port 22) from 0.0.0.0/0",
    [resource.address]
  )
}

# ── No security groups allowing unrestricted RDP (port 3389) ─────────────────

deny contains msg if {
  resource := input.resource_changes[_]
  resource.type == "aws_security_group"
  ingress := resource.change.after.ingress[_]
  ingress.from_port <= 3389
  ingress.to_port >= 3389
  cidr := ingress.cidr_blocks[_]
  cidr == "0.0.0.0/0"
  msg := sprintf(
    "DENY: Security group '%s' allows unrestricted RDP (port 3389) from 0.0.0.0/0",
    [resource.address]
  )
}

# ── No security groups allowing unrestricted database ports from internet ─────

db_ports := {5432, 27017, 6379, 3306, 1521}

deny contains msg if {
  resource := input.resource_changes[_]
  resource.type == "aws_security_group"
  ingress := resource.change.after.ingress[_]
  cidr := ingress.cidr_blocks[_]
  cidr == "0.0.0.0/0"
  some port in db_ports
  ingress.from_port <= port
  ingress.to_port >= port
  msg := sprintf(
    "DENY: Security group '%s' exposes database port %d to 0.0.0.0/0",
    [resource.address, port]
  )
}

# ── S3 buckets must block public access ──────────────────────────────────────

deny contains msg if {
  resource := input.resource_changes[_]
  resource.type == "aws_s3_bucket_public_access_block"
  not resource.change.after.block_public_acls
  msg := sprintf(
    "DENY: S3 bucket '%s' does not block public ACLs",
    [resource.address]
  )
}

deny contains msg if {
  resource := input.resource_changes[_]
  resource.type == "aws_s3_bucket_public_access_block"
  not resource.change.after.restrict_public_buckets
  msg := sprintf(
    "DENY: S3 bucket '%s' does not restrict public bucket policies",
    [resource.address]
  )
}

# ── ALB must drop invalid HTTP headers ───────────────────────────────────────

deny contains msg if {
  resource := input.resource_changes[_]
  resource.type == "aws_lb"
  not resource.change.after.drop_invalid_header_fields
  msg := sprintf(
    "DENY: ALB '%s' must have drop_invalid_header_fields = true (security hardening)",
    [resource.address]
  )
}

# ── ALB must have deletion protection in production ──────────────────────────

warn contains msg if {
  resource := input.resource_changes[_]
  resource.type == "aws_lb"
  not resource.change.after.enable_deletion_protection
  msg := sprintf(
    "WARN: ALB '%s' does not have deletion protection enabled",
    [resource.address]
  )
}
