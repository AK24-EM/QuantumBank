###############################################################################
# Disaster Recovery Module — Outputs
###############################################################################

output "fis_role_arn" {
  description = "IAM role ARN used by AWS FIS experiments"
  value       = aws_iam_role.fis.arn
}

output "experiment_ids" {
  description = "Map of experiment name to FIS experiment template ID"
  value = {
    ecs_task_termination = aws_fis_experiment_template.ecs_task_termination.id
    cpu_stress           = aws_fis_experiment_template.cpu_stress.id
    multi_service_stop   = aws_fis_experiment_template.multi_service_stop.id
    full_cluster_drain   = aws_fis_experiment_template.full_cluster_drain.id
  }
}

output "dr_runbook_name" {
  description = "SSM Automation document name for the DR runbook"
  value       = aws_ssm_document.dr_runbook.name
}

output "rto_alarm_name" {
  description = "CloudWatch alarm name for RTO breach detection"
  value       = aws_cloudwatch_metric_alarm.rto_breach.alarm_name
}

output "rpo_alarm_name" {
  description = "CloudWatch alarm name for RPO risk detection"
  value       = aws_cloudwatch_metric_alarm.rpo_monitor.alarm_name
}

output "fis_log_group_name" {
  description = "CloudWatch log group where FIS experiment results are written"
  value       = aws_cloudwatch_log_group.fis.name
}
