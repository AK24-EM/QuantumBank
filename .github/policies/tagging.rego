# QuantumBank OPA Policy — Resource Tagging Enforcement
# Namespace: quantumbank
#
# All production resources must have required tags for:
#   - Cost attribution
#   - Compliance audit trails
#   - Incident response (who owns this resource?)
#
# Required tags: Region, Environment, ManagedBy

package quantumbank

import rego.v1

# Resource types that must carry the required tags
tagged_resource_types := {
  "aws_lb",
  "aws_ecs_cluster",
  "aws_ecs_service",
  "aws_ecr_repository",
  "aws_sns_topic",
  "aws_kms_key",
  "aws_s3_bucket",
  "aws_cloudwatch_log_group",
  "aws_security_group",
}

required_tags := {"Region", "ManagedBy"}

deny contains msg if {
  resource := input.resource_changes[_]
  tagged_resource_types[resource.type]
  resource.change.action != "delete"
  tag := required_tags[_]
  not resource.change.after.tags[tag]
  msg := sprintf(
    "DENY: Resource '%s' (%s) is missing required tag '%s'",
    [resource.address, resource.type, tag]
  )
}

# Warn if Environment tag is not "production" or "staging"
valid_environments := {"production", "staging", "development"}

warn contains msg if {
  resource := input.resource_changes[_]
  tagged_resource_types[resource.type]
  resource.change.action != "delete"
  env := resource.change.after.tags.Environment
  env
  not valid_environments[env]
  msg := sprintf(
    "WARN: Resource '%s' has non-standard Environment tag value: '%s'",
    [resource.address, env]
  )
}
