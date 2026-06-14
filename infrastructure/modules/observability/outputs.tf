###############################################################################
# Observability Module - Outputs
###############################################################################

output "sns_topic_arn" {
  description = "ARN of the SNS alerts topic — pass back to tfvars as sns_alert_arn"
  value       = aws_sns_topic.alerts.arn
}

output "sns_topic_name" {
  description = "Name of the SNS alerts topic"
  value       = aws_sns_topic.alerts.name
}

output "dashboard_name" {
  description = "CloudWatch Dashboard name"
  value       = aws_cloudwatch_dashboard.main.dashboard_name
}

output "dashboard_url" {
  description = "Direct URL to the CloudWatch Dashboard"
  value       = "https://${var.region}.console.aws.amazon.com/cloudwatch/home?region=${var.region}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

output "composite_alarm_name" {
  description = "Name of the composite 'Platform Degraded' alarm"
  value       = aws_cloudwatch_composite_alarm.platform_degraded.alarm_name
}

output "xray_sampling_rule_names" {
  description = "Map of service key to X-Ray sampling rule name"
  value       = { for k, v in aws_xray_sampling_rule.services : k => v.rule_name }
}

output "log_insights_query_ids" {
  description = "Map of saved CloudWatch Logs Insights query names to IDs"
  value = {
    payment_errors   = aws_cloudwatch_query_definition.payment_errors.query_definition_id
    api_latency      = aws_cloudwatch_query_definition.api_latency.query_definition_id
    all_errors_5min  = aws_cloudwatch_query_definition.all_errors_5min.query_definition_id
    compliance_audit = aws_cloudwatch_query_definition.compliance_audit.query_definition_id
    xray_slow_traces = aws_cloudwatch_query_definition.xray_slow_traces.query_definition_id
  }
}
