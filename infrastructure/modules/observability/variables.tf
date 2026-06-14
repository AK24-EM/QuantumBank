###############################################################################
# Observability Module - Variables
#
# Three-pillar observability stack:
#   Metrics  → CloudWatch dashboards + ECS/ALB/custom alarms
#   Logs     → CloudWatch Logs Insights + metric filters on error patterns
#   Traces   → AWS X-Ray sampling rules + service map (daemon already in tasks)
#   Alerting → SNS topic → email + composite alarms for noise reduction
###############################################################################

variable "region" {
  description = "AWS region this observability stack is deployed in"
  type        = string
}

variable "environment" {
  description = "Deployment environment (production | staging)"
  type        = string
  default     = "production"
}

variable "account_id" {
  description = "AWS account ID (used to construct resource ARNs)"
  type        = string
}

# ── Service references (passed from ecs-cluster module outputs) ─────────────

variable "ecs_cluster_name" {
  description = "Name of the ECS Fargate cluster to monitor"
  type        = string
}

variable "service_names" {
  description = "Map of logical service key → ECS service name"
  type        = map(string)
}

variable "log_group_names" {
  description = "Map of logical service key → CloudWatch log group name"
  type        = map(string)
}

# ── ALB references (passed from alb module outputs) ──────────────────────────

variable "alb_arn_suffix" {
  description = "ALB ARN suffix for CloudWatch metric dimensions"
  type        = string
}

variable "target_group_arn_suffix" {
  description = "Target group ARN suffix for CloudWatch metric dimensions"
  type        = string
}

# ── Alerting ──────────────────────────────────────────────────────────────────

variable "alert_email" {
  description = "Email address to receive SNS alarm notifications"
  type        = string
  default     = ""
}

# ── Thresholds (override defaults per environment) ───────────────────────────

variable "alb_5xx_threshold" {
  description = "ALB 5XX error count threshold per minute before alerting"
  type        = number
  default     = 20
}

variable "alb_p99_latency_threshold_seconds" {
  description = "ALB P99 response time threshold in seconds"
  type        = number
  default     = 0.5
}

variable "ecs_cpu_threshold" {
  description = "ECS service CPU utilisation % threshold for alarm"
  type        = number
  default     = 80
}

variable "ecs_memory_threshold" {
  description = "ECS service memory utilisation % threshold for alarm"
  type        = number
  default     = 85
}

variable "error_log_threshold" {
  description = "Number of ERROR log entries per 5 minutes before alerting"
  type        = number
  default     = 50
}

variable "payment_failure_threshold" {
  description = "Number of PAYMENT_FAILED compliance events per 5 minutes before alerting"
  type        = number
  default     = 10
}

variable "xray_throttle_threshold" {
  description = "X-Ray throttle rate % threshold for payment-service alarm"
  type        = number
  default     = 5
}
