# QuantumBank OPA Policy — IAM Security Enforcement
# Namespace: quantumbank
#
# Prevents overly-permissive IAM policies from reaching production.
# Banking requirement: least-privilege must be enforced at the policy level.

package quantumbank

import rego.v1

# ── No wildcard (*) Action in IAM policies ───────────────────────────────────

deny contains msg if {
  resource := input.resource_changes[_]
  resource.type == "aws_iam_role_policy"
  policy := json.unmarshal(resource.change.after.policy)
  statement := policy.Statement[_]
  statement.Effect == "Allow"
  statement.Action == "*"
  # Exception: permission boundaries are allowed to have Allow * (they rely on Deny to restrict)
  not contains(resource.address, "boundary")
  msg := sprintf(
    "DENY: IAM policy '%s' grants Action: '*' — use least-privilege specific actions",
    [resource.address]
  )
}

# ── No wildcard Resource in sensitive-action policies ────────────────────────

sensitive_actions := {
  "iam:*",
  "sts:AssumeRole",
  "secretsmanager:*",
  "kms:*",
}

warn contains msg if {
  resource := input.resource_changes[_]
  resource.type == "aws_iam_role_policy"
  policy := json.unmarshal(resource.change.after.policy)
  statement := policy.Statement[_]
  statement.Effect == "Allow"
  action := statement.Action[_]
  sensitive_actions[action]
  statement.Resource == "*"
  msg := sprintf(
    "WARN: IAM policy '%s' grants sensitive action '%s' on Resource: '*' — scope to specific ARNs",
    [resource.address, action]
  )
}

# ── IAM roles must not allow AssumeRole from all principals ──────────────────

deny contains msg if {
  resource := input.resource_changes[_]
  resource.type == "aws_iam_role"
  policy := json.unmarshal(resource.change.after.assume_role_policy)
  statement := policy.Statement[_]
  statement.Effect == "Allow"
  statement.Principal == "*"
  msg := sprintf(
    "DENY: IAM role '%s' allows AssumeRole from all principals ('*') — restrict to specific services or accounts",
    [resource.address]
  )
}

# ── ECS task roles must have a permission boundary ───────────────────────────

warn contains msg if {
  resource := input.resource_changes[_]
  resource.type == "aws_iam_role"
  contains(resource.address, "ecs_task")
  not contains(resource.address, "execution")
  not resource.change.after.permissions_boundary
  msg := sprintf(
    "WARN: ECS task IAM role '%s' has no permission boundary — privilege escalation risk",
    [resource.address]
  )
}
