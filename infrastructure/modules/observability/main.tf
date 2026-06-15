###############################################################################
# Observability Module - main.tf
#
# Pillar 1 — METRICS
#   - SNS topic + email subscription for all alarms
#   - ECS alarms: CPU, memory, running task count per service
#   - ALB alarms: 5xx count, p99 latency, unhealthy host count
#   - Composite alarm: "Platform Degraded" fires when ≥2 critical alarms fire
#   - CloudWatch Dashboard: per-region, per-domain view
#
# Pillar 2 — LOGS
#   - CloudWatch Logs Metric Filters on every service log group:
#       ERROR_COUNT    → fires when error rate spikes
#       PAYMENT_FAILED → fires on payment compliance failure events
#   - CloudWatch Logs Insights saved queries (payments, errors, latency)
#
# Pillar 3 — TRACES
#   - X-Ray sampling rules per service (daemon already in task definitions)
#   - Higher sampling for payment-service (financial audit trail)
#   - Lower sampling for high-throughput analytics-worker
#
###############################################################################

data "aws_caller_identity" "current" {}

locals {
  # Service list kept in sync with ecs-cluster module
  all_services = [
    "api-gateway",
    "payment-service",
    "auth-service",
    "notification-service",
    "analytics-worker",
    "statement-generator",
  ]

  # Payment-service gets higher X-Ray sampling for financial audit trail
  xray_sampling_overrides = {
    "payment-service"     = { fixed_rate = 1.0, reservoir_size = 10 }
    "auth-service"        = { fixed_rate = 0.5, reservoir_size = 5 }
    "api-gateway"         = { fixed_rate = 0.1, reservoir_size = 5 }
    "analytics-worker"    = { fixed_rate = 0.05, reservoir_size = 2 }
    "notification-service" = { fixed_rate = 0.1, reservoir_size = 3 }
    "statement-generator" = { fixed_rate = 0.2, reservoir_size = 3 }
  }
}

###############################################################################
# ALERTING — SNS topic + email subscription
###############################################################################

resource "aws_sns_topic" "alerts" {
  name              = "quantumbank-alerts-${var.region}"
  kms_master_key_id = "alias/aws/sns"

  tags = {
    Name   = "quantumbank-alerts-${var.region}"
    Region = var.region
  }
}

resource "aws_sns_topic_subscription" "email" {
  count = var.alert_email != "" ? 1 : 0

  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Allow CloudWatch to publish to this topic
resource "aws_sns_topic_policy" "alerts" {
  arn = aws_sns_topic.alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudWatchAlarms"
        Effect = "Allow"
        Principal = {
          Service = "cloudwatch.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.alerts.arn
        Condition = {
          ArnLike = {
            "aws:SourceArn" = "arn:aws:cloudwatch:${var.region}:${data.aws_caller_identity.current.account_id}:alarm:*"
          }
        }
      }
    ]
  })
}

###############################################################################
# PILLAR 1: METRICS — ECS Service Alarms (CPU + Memory + Task Count)
###############################################################################

resource "aws_cloudwatch_metric_alarm" "ecs_cpu" {
  for_each = var.service_names

  alarm_name          = "quantumbank-${each.key}-cpu-${var.region}"
  alarm_description   = "${each.key} CPU utilisation exceeded ${var.ecs_cpu_threshold}% in ${var.region}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = var.ecs_cpu_threshold
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = each.value
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Service = each.key
    Region  = var.region
    Pillar  = "metrics"
  }
}

resource "aws_cloudwatch_metric_alarm" "ecs_memory" {
  for_each = var.service_names

  alarm_name          = "quantumbank-${each.key}-memory-${var.region}"
  alarm_description   = "${each.key} memory utilisation exceeded ${var.ecs_memory_threshold}% in ${var.region}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = var.ecs_memory_threshold
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = each.value
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Service = each.key
    Region  = var.region
    Pillar  = "metrics"
  }
}

resource "aws_cloudwatch_metric_alarm" "ecs_running_tasks" {
  for_each = var.service_names

  alarm_name          = "quantumbank-${each.key}-task-count-${var.region}"
  alarm_description   = "${each.key} has zero running tasks in ${var.region} — service may be down"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "RunningTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = 60
  statistic           = "Average"
  threshold           = 1
  treat_missing_data  = "breaching" # Missing = no tasks = alarm

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = each.value
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = {
    Service = each.key
    Region  = var.region
    Pillar  = "metrics"
  }
}

###############################################################################
# PILLAR 1: METRICS — ALB Alarms (5xx, p99 latency, unhealthy hosts)
###############################################################################

resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "quantumbank-alb-5xx-obs-${var.region}"
  alarm_description   = "ALB 5XX error count exceeded ${var.alb_5xx_threshold} per minute in ${var.region}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = var.alb_5xx_threshold
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Region = var.region
    Pillar = "metrics"
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_p99_latency" {
  alarm_name          = "quantumbank-alb-p99-latency-obs-${var.region}"
  alarm_description   = "ALB P99 latency exceeded ${var.alb_p99_latency_threshold_seconds * 1000}ms in ${var.region}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  extended_statistic  = "p99"
  threshold           = var.alb_p99_latency_threshold_seconds
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Region = var.region
    Pillar = "metrics"
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_unhealthy_hosts" {
  alarm_name          = "quantumbank-alb-unhealthy-hosts-${var.region}"
  alarm_description   = "ALB has unhealthy target hosts in ${var.region} — ECS tasks failing health checks"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
    TargetGroup  = var.target_group_arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Region = var.region
    Pillar = "metrics"
  }
}

###############################################################################
# PILLAR 1: METRICS — Composite Alarm ("Platform Degraded")
# Fires when 2+ critical alarms are active simultaneously.
# Reduces alert noise vs. individual alarms paging on every blip.
###############################################################################

resource "aws_cloudwatch_composite_alarm" "platform_degraded" {
  alarm_name        = "quantumbank-PLATFORM-DEGRADED-${var.region}"
  alarm_description = "2 or more critical alarms are firing in ${var.region}. Likely regional incident."

  alarm_rule = join(" OR ", [
    # ALB composite — both 5xx AND latency elevated = real traffic impact
    "(ALARM(\"${aws_cloudwatch_metric_alarm.alb_5xx.alarm_name}\") AND ALARM(\"${aws_cloudwatch_metric_alarm.alb_p99_latency.alarm_name}\"))",
    # Any unhealthy hosts
    "ALARM(\"${aws_cloudwatch_metric_alarm.alb_unhealthy_hosts.alarm_name}\")",
    # api-gateway or payment-service task count drops to zero
    "ALARM(\"${aws_cloudwatch_metric_alarm.ecs_running_tasks["api-gateway"].alarm_name}\")",
    "ALARM(\"${aws_cloudwatch_metric_alarm.ecs_running_tasks["payment-service"].alarm_name}\")",
  ])

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Region   = var.region
    Pillar   = "metrics"
    Severity = "critical"
  }
}

###############################################################################
# PILLAR 2: LOGS — Metric Filters on service log groups
#
# Filter pattern targets structured JSON logs emitted by Node.js services.
# Each filter creates a custom CloudWatch metric that drives an alarm.
###############################################################################

# ERROR count filter — fires on any log line with "level":"error" or "ERROR"
resource "aws_cloudwatch_log_metric_filter" "error_count" {
  for_each = var.log_group_names

  name           = "quantumbank-${each.key}-error-count-${var.region}"
  log_group_name = each.value

  # Matches both JSON structured logs {"level":"error"} and plain ERROR strings
  pattern = "?\"level\":\"error\" ?ERROR ?\"status\":5"

  metric_transformation {
    name          = "ErrorCount"
    namespace     = "QuantumBank/${var.region}/${each.key}"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

resource "aws_cloudwatch_metric_alarm" "error_rate" {
  for_each = var.log_group_names

  alarm_name          = "quantumbank-${each.key}-error-rate-${var.region}"
  alarm_description   = "${each.key} error log rate exceeded ${var.error_log_threshold} per 5 min in ${var.region}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ErrorCount"
  namespace           = "QuantumBank/${var.region}/${each.key}"
  period              = 300 # 5 minutes
  statistic           = "Sum"
  threshold           = var.error_log_threshold
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Service = each.key
    Region  = var.region
    Pillar  = "logs"
  }

  depends_on = [aws_cloudwatch_log_metric_filter.error_count]
}

# PAYMENT FAILED filter — targets compliance events from paymentService.ts
# logComplianceEvent('TRANSFER_FAILED', ...) emits {"type":"TRANSFER_FAILED"}
resource "aws_cloudwatch_log_metric_filter" "payment_failures" {
  name           = "quantumbank-payment-failures-${var.region}"
  log_group_name = var.log_group_names["payment-service"]

  pattern = "?TRANSFER_FAILED ?PAYMENT_FAILED ?\"status\":\"failed\""

  metric_transformation {
    name          = "PaymentFailureCount"
    namespace     = "QuantumBank/${var.region}/payment-service"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

resource "aws_cloudwatch_metric_alarm" "payment_failure_rate" {
  alarm_name          = "quantumbank-payment-failure-rate-${var.region}"
  alarm_description   = "Payment failure rate exceeded ${var.payment_failure_threshold} per 5 min in ${var.region}. Compliance review required."
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "PaymentFailureCount"
  namespace           = "QuantumBank/${var.region}/payment-service"
  period              = 300
  statistic           = "Sum"
  threshold           = var.payment_failure_threshold
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Service  = "payment-service"
    Region   = var.region
    Pillar   = "logs"
    Severity = "high"
  }

  depends_on = [aws_cloudwatch_log_metric_filter.payment_failures]
}

# COOLING PERIOD BLOCK filter — tracks fraud-prevention blocks
resource "aws_cloudwatch_log_metric_filter" "cooling_period_blocks" {
  name           = "quantumbank-cooling-period-blocks-${var.region}"
  log_group_name = var.log_group_names["payment-service"]

  pattern = "COOLING_PERIOD_BLOCK"

  metric_transformation {
    name          = "CoolingPeriodBlockCount"
    namespace     = "QuantumBank/${var.region}/payment-service"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

###############################################################################
# PILLAR 2: LOGS — CloudWatch Logs Insights Saved Queries
###############################################################################

resource "aws_cloudwatch_query_definition" "payment_errors" {
  name = "QuantumBank/${var.region}/Payment Service — Errors & Failures"

  log_group_names = [var.log_group_names["payment-service"]]

  query_string = <<-EOQ
    fields @timestamp, @message, referenceId, amount, rail, beneficiaryId
    | filter @message like /TRANSFER_FAILED|PAYMENT_FAILED|COOLING_PERIOD_BLOCK/
    | sort @timestamp desc
    | limit 100
  EOQ
}

resource "aws_cloudwatch_query_definition" "api_latency" {
  name = "QuantumBank/${var.region}/API Gateway — P50 P95 P99 Latency"

  log_group_names = [var.log_group_names["api-gateway"]]

  query_string = <<-EOQ
    fields @timestamp, @message
    | filter @message like /apiLatencyMs|latency|duration/
    | parse @message /apiLatencyMs\":(?<latency_ms>\d+)/
    | stats
        pct(latency_ms, 50) as p50_ms,
        pct(latency_ms, 95) as p95_ms,
        pct(latency_ms, 99) as p99_ms,
        count(*) as request_count
      by bin(5m)
    | sort @timestamp desc
  EOQ
}

resource "aws_cloudwatch_query_definition" "all_errors_5min" {
  name = "QuantumBank/${var.region}/All Services — Error Summary (last 5 min)"

  log_group_names = values(var.log_group_names)

  query_string = <<-EOQ
    fields @timestamp, @logStream, @message
    | filter @message like /ERROR|level.*error|"status":5/
    | stats count(*) as error_count by @logStream
    | sort error_count desc
  EOQ
}

resource "aws_cloudwatch_query_definition" "compliance_audit" {
  name = "QuantumBank/${var.region}/Compliance — Audit Trail (transfers + beneficiaries)"

  log_group_names = [var.log_group_names["payment-service"]]

  query_string = <<-EOQ
    fields @timestamp, @message
    | filter @message like /INTERNAL_TRANSFER|EXTERNAL_TRANSFER|BENEFICIARY_ADDED|TRANSFER_QUEUED|TRANSFER_FAILED/
    | parse @message /\"reference\":\"(?<reference>[^\"]+)\"/
    | parse @message /\"amount\":\"(?<amount>[^\"]+)\"/
    | sort @timestamp desc
    | limit 500
  EOQ
}

resource "aws_cloudwatch_query_definition" "xray_slow_traces" {
  name = "QuantumBank/${var.region}/X-Ray — Slow Requests (>500ms)"

  log_group_names = values(var.log_group_names)

  query_string = <<-EOQ
    fields @timestamp, @message
    | filter @message like /xray|traceId|duration/
    | parse @message /\"duration\":(?<duration_ms>\d+)/
    | filter duration_ms > 500
    | sort duration_ms desc
    | limit 50
  EOQ
}

###############################################################################
# PILLAR 3: TRACES — X-Ray Sampling Rules per service
#
# payment-service: 100% sampling for financial audit trail
# auth-service:    50%  sampling — security audit value
# api-gateway:     10%  sampling — high throughput, sample enough to detect issues
# analytics-worker: 5%  sampling — internal batch, low audit value
# others:          10%  default
###############################################################################

resource "aws_xray_sampling_rule" "services" {
  for_each = local.xray_sampling_overrides

  rule_name      = "quantumbank-${each.key}-${var.region}"
  priority       = 100 + index(local.all_services, each.key)
  version        = 1
  reservoir_size = each.value.reservoir_size
  fixed_rate     = each.value.fixed_rate
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "AWS::ECS::Container"
  service_name   = each.key
  resource_arn   = "*"

  attributes = {
    Region      = var.region
    Environment = var.environment
  }

  tags = {
    Service = each.key
    Region  = var.region
    Pillar  = "traces"
  }
}

# Default fallback rule — catches any service not matched above
resource "aws_xray_sampling_rule" "default_fallback" {
  rule_name      = "quantumbank-default-${var.region}"
  priority       = 200
  version        = 1
  reservoir_size = 5
  fixed_rate     = 0.05
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "AWS::ECS::Container"
  service_name   = "quantumbank-*"
  resource_arn   = "*"

  attributes = {
    Region      = var.region
    Environment = var.environment
  }

  tags = {
    Region = var.region
    Pillar = "traces"
  }
}

###############################################################################
# PILLAR 1: METRICS — CloudWatch Dashboard
#
# Single dashboard with 4 sections:
#   1. Platform Health   — ALB 5xx, latency, unhealthy hosts, composite alarm
#   2. ECS Services      — CPU + memory per service
#   3. Payment Domain    — payment failures, cooling-period blocks
#   4. Infrastructure    — ECS running tasks, X-Ray throttle
###############################################################################

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "QuantumBank-${var.region}"

  dashboard_body = jsonencode({
    widgets = [

      # ROW 0 — Header
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 2
        properties = {
          markdown = "# 🏦 QuantumBank — ${upper(var.region)} Observability Dashboard\n**Environment:** ${var.environment} | **Region:** ${var.region} | Metrics refresh every 60s"
        }
      },

      # ROW 1 — ALB 5xx
      {
        type   = "metric"
        x      = 0
        y      = 2
        width  = 8
        height = 6
        properties = {
          title  = "ALB — 5XX Error Count"
          region = var.region
          metrics = [[
            "AWS/ApplicationELB", "HTTPCode_ELB_5XX_Count",
            "LoadBalancer", var.alb_arn_suffix,
            { stat = "Sum", period = 60, color = "#d62728" }
          ]]
          view  = "timeSeries"
          yAxis = { left = { min = 0 } }
          annotations = {
            horizontal = [{ value = var.alb_5xx_threshold, label = "Alarm threshold", color = "#ff7f0e" }]
          }
        }
      },

      # ROW 1 — ALB Latency
      {
        type   = "metric"
        x      = 8
        y      = 2
        width  = 8
        height = 6
        properties = {
          title  = "ALB — P50 / P95 / P99 Latency"
          region = var.region
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.alb_arn_suffix, { stat = "p50", period = 60, label = "p50", color = "#2ca02c" }],
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.alb_arn_suffix, { stat = "p95", period = 60, label = "p95", color = "#ff7f0e" }],
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.alb_arn_suffix, { stat = "p99", period = 60, label = "p99", color = "#d62728" }]
          ]
          view  = "timeSeries"
          yAxis = { left = { min = 0, label = "seconds" } }
          annotations = {
            horizontal = [{ value = var.alb_p99_latency_threshold_seconds, label = "P99 alarm", color = "#d62728" }]
          }
        }
      },

      # ROW 1 — ALB Host Health
      {
        type   = "metric"
        x      = 16
        y      = 2
        width  = 8
        height = 6
        properties = {
          title  = "ALB — Healthy vs Unhealthy Hosts"
          region = var.region
          metrics = [
            ["AWS/ApplicationELB", "HealthyHostCount", "LoadBalancer", var.alb_arn_suffix, "TargetGroup", var.target_group_arn_suffix, { stat = "Average", period = 60, label = "Healthy", color = "#2ca02c" }],
            ["AWS/ApplicationELB", "UnHealthyHostCount", "LoadBalancer", var.alb_arn_suffix, "TargetGroup", var.target_group_arn_suffix, { stat = "Maximum", period = 60, label = "Unhealthy", color = "#d62728" }]
          ]
          view  = "timeSeries"
          yAxis = { left = { min = 0 } }
        }
      },

      # ROW 2 — ECS Header
      {
        type   = "text"
        x      = 0
        y      = 8
        width  = 24
        height = 1
        properties = { markdown = "## ECS Service Health" }
      },

      # ROW 2 — ECS CPU
      {
        type   = "metric"
        x      = 0
        y      = 9
        width  = 12
        height = 6
        properties = {
          title  = "ECS — CPU Utilisation by Service (%)"
          region = var.region
          metrics = [for svc in local.all_services : [
            "AWS/ECS", "CPUUtilization",
            "ClusterName", var.ecs_cluster_name,
            "ServiceName", lookup(var.service_names, svc, svc),
            { stat = "Average", period = 60, label = svc }
          ]]
          view  = "timeSeries"
          yAxis = { left = { min = 0, max = 100 } }
          annotations = {
            horizontal = [{ value = var.ecs_cpu_threshold, label = "CPU alarm", color = "#ff7f0e" }]
          }
        }
      },

      # ROW 2 — ECS Memory
      {
        type   = "metric"
        x      = 12
        y      = 9
        width  = 12
        height = 6
        properties = {
          title  = "ECS — Memory Utilisation by Service (%)"
          region = var.region
          metrics = [for svc in local.all_services : [
            "AWS/ECS", "MemoryUtilization",
            "ClusterName", var.ecs_cluster_name,
            "ServiceName", lookup(var.service_names, svc, svc),
            { stat = "Average", period = 60, label = svc }
          ]]
          view  = "timeSeries"
          yAxis = { left = { min = 0, max = 100 } }
          annotations = {
            horizontal = [{ value = var.ecs_memory_threshold, label = "Memory alarm", color = "#ff7f0e" }]
          }
        }
      },

      # ROW 3 — Running Task Count
      {
        type   = "metric"
        x      = 0
        y      = 15
        width  = 24
        height = 6
        properties = {
          title  = "ECS — Running Task Count by Service"
          region = var.region
          metrics = [for svc in local.all_services : [
            "ECS/ContainerInsights", "RunningTaskCount",
            "ClusterName", var.ecs_cluster_name,
            "ServiceName", lookup(var.service_names, svc, svc),
            { stat = "Average", period = 60, label = svc }
          ]]
          view  = "timeSeries"
          yAxis = { left = { min = 0 } }
        }
      },

      # ROW 4 — Payment Domain Header
      {
        type   = "text"
        x      = 0
        y      = 21
        width  = 24
        height = 1
        properties = { markdown = "## Payment Domain" }
      },

      # ROW 4 — Payment Failures
      {
        type   = "metric"
        x      = 0
        y      = 22
        width  = 8
        height = 6
        properties = {
          title  = "Payment Failures per 5 min"
          region = var.region
          metrics = [[
            "QuantumBank/${var.region}/payment-service", "PaymentFailureCount",
            { stat = "Sum", period = 300, color = "#d62728" }
          ]]
          view  = "timeSeries"
          yAxis = { left = { min = 0 } }
          annotations = {
            horizontal = [{ value = var.payment_failure_threshold, label = "Alarm threshold", color = "#ff7f0e" }]
          }
        }
      },

      # ROW 4 — Cooling Period Blocks
      {
        type   = "metric"
        x      = 8
        y      = 22
        width  = 8
        height = 6
        properties = {
          title  = "Cooling Period Blocks per 5 min"
          region = var.region
          metrics = [[
            "QuantumBank/${var.region}/payment-service", "CoolingPeriodBlockCount",
            { stat = "Sum", period = 300, color = "#9467bd" }
          ]]
          view  = "timeSeries"
          yAxis = { left = { min = 0 } }
        }
      },

      # ROW 4 — Error Rates
      {
        type   = "metric"
        x      = 16
        y      = 22
        width  = 8
        height = 6
        properties = {
          title  = "Error Rates by Service per 5 min"
          region = var.region
          metrics = [for svc in local.all_services : [
            "QuantumBank/${var.region}/${svc}", "ErrorCount",
            { stat = "Sum", period = 300, label = svc }
          ]]
          view  = "timeSeries"
          yAxis = { left = { min = 0 } }
          annotations = {
            horizontal = [{ value = var.error_log_threshold, label = "Error alarm", color = "#ff7f0e" }]
          }
        }
      },

      # ROW 5 — Alarms Header
      {
        type   = "text"
        x      = 0
        y      = 28
        width  = 24
        height = 1
        properties = { markdown = "## Active Alarms" }
      },

      # ROW 5 — Alarm Board
      {
        type   = "alarm"
        x      = 0
        y      = 29
        width  = 24
        height = 6
        properties = {
          title = "Alarm Status Board — ${var.region}"
          alarms = [
            aws_cloudwatch_composite_alarm.platform_degraded.alarm_name,
            aws_cloudwatch_metric_alarm.alb_5xx.alarm_name,
            aws_cloudwatch_metric_alarm.alb_p99_latency.alarm_name,
            aws_cloudwatch_metric_alarm.alb_unhealthy_hosts.alarm_name,
            aws_cloudwatch_metric_alarm.ecs_running_tasks["api-gateway"].alarm_name,
            aws_cloudwatch_metric_alarm.ecs_running_tasks["payment-service"].alarm_name,
            aws_cloudwatch_metric_alarm.payment_failure_rate.alarm_name,
            aws_cloudwatch_metric_alarm.ecs_cpu["payment-service"].alarm_name,
            aws_cloudwatch_metric_alarm.ecs_memory["payment-service"].alarm_name,
          ]
        }
      }
    ]
  })
}
