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
