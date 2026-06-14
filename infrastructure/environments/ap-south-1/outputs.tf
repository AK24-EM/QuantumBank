###############################################################################
# Environment: ap-south-1 - outputs.tf
###############################################################################

output "vpc_id" {
  value = module.vpc.vpc_id
}

output "alb_dns_name" {
  value = module.alb.alb_dns_name
}

output "alb_zone_id" {
  value = module.alb.alb_zone_id
}

output "cluster_name" {
  value = module.ecs_cluster.cluster_name
}

# ── Observability outputs ────────────────────────────────────────────────────

output "sns_alerts_topic_arn" {
  description = "SNS topic ARN for CloudWatch alarms"
  value       = module.observability.sns_topic_arn
}

output "dashboard_url" {
  description = "CloudWatch dashboard URL"
  value       = module.observability.dashboard_url
}

output "composite_alarm_name" {
  description = "Platform Degraded composite alarm name"
  value       = module.observability.composite_alarm_name
}

# ── Security & Compliance outputs ────────────────────────────────────────────

output "kms_key_arn" {
  description = "KMS CMK ARN for secrets and log encryption"
  value       = module.secrets.kms_key_arn
}

output "compliance_reports_bucket" {
  description = "WORM-locked S3 bucket for regulatory reports"
  value       = module.compliance.compliance_reports_bucket_name
}

output "cloudtrail_name" {
  description = "CloudTrail audit trail name"
  value       = module.compliance.cloudtrail_name
}
