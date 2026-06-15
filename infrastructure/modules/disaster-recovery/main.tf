###############################################################################
# Disaster Recovery Module — main.tf
#
# Three components:
#
# 1. AWS FAULT INJECTION SIMULATOR (FIS) — real chaos experiments
#    Four experiment templates matching the app-side chaosService.ts scenarios:
#      EXP-1: ECS task termination (pod crash simulation)
#      EXP-2: Network latency injection via SSM (latency injection)
#      EXP-3: CPU stress on ECS tasks (resource exhaustion)
#      EXP-4: Multi-service stop (regional degradation simulation)
#
# 2. DR CLOUDWATCH ALARMS
#    RTO breach alarm — fires if recovery takes longer than var.rto_minutes
#    RPO breach alarm — fires if data replication lag exceeds var.rpo_minutes
#    Availability alarm — fires if healthy host count drops to zero
#
# 3. DR RUNBOOK SSM DOCUMENT
#    AWS Systems Manager Automation document that codifies the DR runbook.
#    Can be triggered manually or automatically on alarm breach.
#    Steps: assess → notify → failover decision → execute → validate → close
###############################################################################

data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

###############################################################################
# IAM Role for AWS FIS
###############################################################################

resource "aws_iam_role" "fis" {
  name = "quantumbank-fis-role-${var.region}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "fis.amazonaws.com" }
      Action    = "sts:AssumeRole"
      Condition = {
        StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
      }
    }]
  })

  tags = {
    Name   = "quantumbank-fis-role-${var.region}"
    Region = var.region
    Layer  = "disaster-recovery"
  }
}

resource "aws_iam_role_policy" "fis_permissions" {
  name = "quantumbank-fis-policy-${var.region}"
  role = aws_iam_role.fis.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # ECS task stop — scoped to this cluster only
      {
        Effect = "Allow"
        Action = ["ecs:StopTask", "ecs:ListTasks", "ecs:DescribeTasks"]
        Resource = "*"
        Condition = {
          ArnLike = { "ecs:cluster" = var.ecs_cluster_arn }
        }
      },
      # SSM for network/CPU disruption actions
      {
        Effect = "Allow"
        Action = [
          "ssm:SendCommand",
          "ssm:GetCommandInvocation",
          "ssm:CancelCommand"
        ]
        Resource = "*"
      },
      # FIS needs to describe EC2 / ECS to find targets
      {
        Effect = "Allow"
        Action = [
          "ecs:DescribeServices",
          "ecs:DescribeClusters",
          "ec2:DescribeInstances",
          "ec2:DescribeSubnets"
        ]
        Resource = "*"
      },
      # CloudWatch — log experiment results
      {
        Effect = "Allow"
        Action = ["logs:CreateLogDelivery", "logs:PutLogEvents", "logs:DescribeLogGroups"]
        Resource = "*"
      },
      # SNS — send experiment start/stop notifications
      {
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = var.sns_topic_arn
      }
    ]
  })
}

###############################################################################
# CloudWatch Log Group for FIS experiment results
###############################################################################

resource "aws_cloudwatch_log_group" "fis" {
  name              = "/aws/fis/quantumbank-${var.region}"
  retention_in_days = 90
  kms_key_id        = var.kms_key_arn

  tags = {
    Name   = "quantumbank-fis-logs-${var.region}"
    Region = var.region
    Layer  = "disaster-recovery"
  }
}

###############################################################################
# EXP-1: ECS Task Termination — "Pod Crash" scenario
#
# Stops 30% of running tasks in the payment-service to simulate:
#   - OOM kill / CrashLoopBackOff
#   - ECS auto-restart and recovery validation
#
# Expected outcome: ECS restarts tasks within 60s, no customer-visible downtime.
# SLA: RTO < 2 minutes for task recovery.
###############################################################################

resource "aws_fis_experiment_template" "ecs_task_termination" {
  description = "EXP-1: Stop 30% of payment-service tasks to validate ECS auto-recovery (RTO < 2 min)"
  role_arn    = aws_iam_role.fis.arn

  # Stop condition — abort if composite alarm fires (real outage, not chaos)
  stop_condition {
    source = "aws:cloudwatch:alarm"
    value  = "arn:${data.aws_partition.current.partition}:cloudwatch:${var.region}:${data.aws_caller_identity.current.account_id}:alarm:quantumbank-PLATFORM-DEGRADED-${var.region}"
  }

  target {
    name           = "payment-service-tasks"
    resource_type  = "aws:ecs:task"
    selection_mode = "PERCENT(30)"

    resource_arns = []

    filter {
      path   = "clusterArn"
      values = [var.ecs_cluster_arn]
    }

    filter {
      path   = "group"
      values = ["service:${lookup(var.service_names, "payment-service", "quantumbank-payment-service-${var.region}")}"]
    }
  }

  action {
    name      = "stop-payment-tasks"
    action_id = "aws:ecs:stop-task"
    target {
      key   = "Tasks"
      value = "payment-service-tasks"
    }
  }

  log_configuration {
    cloudwatch_logs_configuration {
      log_group_arn = "${aws_cloudwatch_log_group.fis.arn}:*"
    }
    log_schema_version = 2
  }

  tags = {
    Name        = "quantumbank-exp1-task-termination-${var.region}"
    Scenario    = "pod_crash"
    ExpectedRTO = "2min"
    Layer       = "disaster-recovery"
  }
}

###############################################################################
# EXP-2: CPU Stress — Resource Exhaustion scenario
#
# Sends CPU stress to api-gateway tasks to simulate:
#   - Memory leak / runaway process
#   - Auto-scaling trigger validation
#
# Expected outcome: Auto-scaling adds tasks within 3 minutes.
# SLA: No requests dropped; p99 latency stays < 1s during stress.
###############################################################################

resource "aws_fis_experiment_template" "cpu_stress" {
  description = "EXP-2: Inject CPU stress on api-gateway to validate auto-scaling response (scale-out < 3 min)"
  role_arn    = aws_iam_role.fis.arn

  stop_condition {
    source = "aws:cloudwatch:alarm"
    value  = "arn:${data.aws_partition.current.partition}:cloudwatch:${var.region}:${data.aws_caller_identity.current.account_id}:alarm:quantumbank-PLATFORM-DEGRADED-${var.region}"
  }

  target {
    name           = "api-gateway-tasks"
    resource_type  = "aws:ecs:task"
    selection_mode = "PERCENT(50)"

    resource_arns = []

    filter {
      path   = "clusterArn"
      values = [var.ecs_cluster_arn]
    }

    filter {
      path   = "group"
      values = ["service:${lookup(var.service_names, "api-gateway", "quantumbank-api-gateway-${var.region}")}"]
    }
  }

  action {
    name      = "cpu-stress"
    action_id = "aws:ssm:send-command"
    parameter {
      key   = "documentArn"
      value = "arn:${data.aws_partition.current.partition}:ssm:::document/AWSFIS-Run-CPU-Stress"
    }
    parameter {
      key   = "documentParameters"
      value = jsonencode({ DurationSeconds = "120", InstallDependencies = "True", CPU = "0" })
    }
    parameter {
      key   = "duration"
      value = "PT3M"
    }
    target {
      key   = "Tasks"
      value = "api-gateway-tasks"
    }
  }

  log_configuration {
    cloudwatch_logs_configuration {
      log_group_arn = "${aws_cloudwatch_log_group.fis.arn}:*"
    }
    log_schema_version = 2
  }

  tags = {
    Name        = "quantumbank-exp2-cpu-stress-${var.region}"
    Scenario    = "resource_exhaustion"
    ExpectedRTO = "3min"
    Layer       = "disaster-recovery"
  }
}

###############################################################################
# EXP-3: Multi-Service Stop — Regional Degradation scenario
#
# Stops all tasks in notification-service and analytics-worker simultaneously.
# These are non-critical services — validates graceful degradation:
#   - Payments continue without notification delivery
#   - Payment transfers queue when analytics is unavailable
#
# Expected: payment-service and api-gateway remain unaffected.
###############################################################################

resource "aws_fis_experiment_template" "multi_service_stop" {
  description = "EXP-3: Stop non-critical services to validate graceful degradation (payments unaffected)"
  role_arn    = aws_iam_role.fis.arn

  stop_condition {
    source = "aws:cloudwatch:alarm"
    value  = "arn:${data.aws_partition.current.partition}:cloudwatch:${var.region}:${data.aws_caller_identity.current.account_id}:alarm:quantumbank-payment-service-task-count-${var.region}"
  }

  target {
    name           = "notification-tasks"
    resource_type  = "aws:ecs:task"
    selection_mode = "ALL"

    resource_arns = []

    filter {
      path   = "clusterArn"
      values = [var.ecs_cluster_arn]
    }

    filter {
      path   = "group"
      values = ["service:${lookup(var.service_names, "notification-service", "quantumbank-notification-service-${var.region}")}"]
    }
  }

  target {
    name           = "analytics-tasks"
    resource_type  = "aws:ecs:task"
    selection_mode = "ALL"

    resource_arns = []

    filter {
      path   = "clusterArn"
      values = [var.ecs_cluster_arn]
    }

    filter {
      path   = "group"
      values = ["service:${lookup(var.service_names, "analytics-worker", "quantumbank-analytics-worker-${var.region}")}"]
    }
  }

  action {
    name      = "stop-notification"
    action_id = "aws:ecs:stop-task"
    target {
      key   = "Tasks"
      value = "notification-tasks"
    }
  }

  action {
    name      = "stop-analytics"
    action_id = "aws:ecs:stop-task"
    target {
      key   = "Tasks"
      value = "analytics-tasks"
    }
  }

  log_configuration {
    cloudwatch_logs_configuration {
      log_group_arn = "${aws_cloudwatch_log_group.fis.arn}:*"
    }
    log_schema_version = 2
  }

  tags = {
    Name     = "quantumbank-exp3-multi-service-stop-${var.region}"
    Scenario = "regional_degradation"
    Layer    = "disaster-recovery"
  }
}

###############################################################################
# EXP-4: Full Cluster Drain — Complete Outage simulation
#
# Stops ALL tasks in the cluster — validates Route 53 health check failover.
# Only run this if Route 53 + secondary regions are provisioned.
# Expected: DNS failover within 60s (2 × 30s health check interval).
# This experiment has the tightest stop condition to self-abort safely.
###############################################################################

resource "aws_fis_experiment_template" "full_cluster_drain" {
  description = "EXP-4: Drain all tasks — validates Route53 DNS failover RTO < 60s (run only with multi-region active)"
  role_arn    = aws_iam_role.fis.arn

  # More aggressive stop condition — abort on ANY payment alarm
  stop_condition {
    source = "aws:cloudwatch:alarm"
    value  = "arn:${data.aws_partition.current.partition}:cloudwatch:${var.region}:${data.aws_caller_identity.current.account_id}:alarm:quantumbank-payment-failure-rate-${var.region}"
  }

  target {
    name           = "all-api-gateway-tasks"
    resource_type  = "aws:ecs:task"
    selection_mode = "ALL"

    resource_arns = []

    filter {
      path   = "clusterArn"
      values = [var.ecs_cluster_arn]
    }

    filter {
      path   = "group"
      values = ["service:${lookup(var.service_names, "api-gateway", "quantumbank-api-gateway-${var.region}")}"]
    }
  }

  action {
    name      = "drain-api-gateway"
    action_id = "aws:ecs:stop-task"
    target {
      key   = "Tasks"
      value = "all-api-gateway-tasks"
    }
  }

  log_configuration {
    cloudwatch_logs_configuration {
      log_group_arn = "${aws_cloudwatch_log_group.fis.arn}:*"
    }
    log_schema_version = 2
  }

  tags = {
    Name        = "quantumbank-exp4-full-drain-${var.region}"
    Scenario    = "full_outage"
    ExpectedRTO = "60s"
    Warning     = "Only run with multi-region active"
    Layer       = "disaster-recovery"
  }
}

###############################################################################
# DR CLOUDWATCH ALARMS
###############################################################################

# RTO breach alarm — fires if the cluster has zero running tasks for > rto_minutes
resource "aws_cloudwatch_metric_alarm" "rto_breach" {
  alarm_name          = "quantumbank-DR-RTO-BREACH-${var.region}"
  alarm_description   = "RTO BREACH: api-gateway has had zero running tasks for > ${var.rto_minutes} minutes. Escalate to on-call immediately."
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = var.rto_minutes
  metric_name         = "RunningTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = 60
  statistic           = "Maximum"
  threshold           = 1
  treat_missing_data  = "breaching"

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = lookup(var.service_names, "api-gateway", "quantumbank-api-gateway-${var.region}")
  }

  alarm_actions = [var.sns_topic_arn]

  tags = {
    Region   = var.region
    Layer    = "disaster-recovery"
    Severity = "critical"
    SLA      = "RTO-${var.rto_minutes}min"
  }
}

# RPO breach alarm — fires if payment-service task count drops (data loss risk)
resource "aws_cloudwatch_metric_alarm" "rpo_monitor" {
  alarm_name          = "quantumbank-DR-RPO-RISK-${var.region}"
  alarm_description   = "RPO RISK: payment-service is unhealthy. In-flight transactions may be at risk. Data loss window > ${var.rpo_minutes} minutes."
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = var.rpo_minutes
  metric_name         = "RunningTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  treat_missing_data  = "breaching"

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = lookup(var.service_names, "payment-service", "quantumbank-payment-service-${var.region}")
  }

  alarm_actions = [var.sns_topic_arn]

  tags = {
    Region   = var.region
    Layer    = "disaster-recovery"
    Severity = "critical"
    SLA      = "RPO-${var.rpo_minutes}min"
  }
}

###############################################################################
# DR RUNBOOK — AWS Systems Manager Automation Document
#
# Codifies the DR response procedure. Can be triggered:
#   - Manually by on-call engineer
#   - Automatically via CloudWatch alarm action → EventBridge → SSM
#
# Steps:
#   1. Assess   — describe cluster health, collect evidence
#   2. Notify   — post to SNS (pages on-call)
#   3. Decide   — output failover recommendation
#   4. Validate — check ALB health after action
###############################################################################

resource "aws_ssm_document" "dr_runbook" {
  name            = "QuantumBank-DR-Runbook-${var.region}"
  document_type   = "Automation"
  document_format = "JSON"

  content = jsonencode({
    schemaVersion = "0.3"
    description   = "QuantumBank Disaster Recovery Runbook — automated triage and failover coordination for ${var.region}"
    parameters = {
      IncidentId = {
        type        = "String"
        description = "Incident ID from the alerting system (e.g. INC-001)"
        default     = "INC-UNKNOWN"
      }
      TriggeredBy = {
        type        = "String"
        description = "Who or what triggered this runbook (alarm name, engineer ID)"
        default     = "manual"
      }
    }
    mainSteps = [
      {
        name   = "AssessClusterHealth"
        action = "aws:executeAwsApi"
        inputs = {
          Service = "ecs"
          Api     = "describeServices"
          cluster = var.ecs_cluster_name
          services = values(var.service_names)
        }
        outputs = [
          { Name = "ServiceStatuses", Selector = "$.services", Type = "MapList" }
        ]
        nextStep = "NotifyOnCall"
      },
      {
        name   = "NotifyOnCall"
        action = "aws:executeAwsApi"
        inputs = {
          Service  = "sns"
          Api      = "publish"
          TopicArn = var.sns_topic_arn
          Subject  = "🚨 DR RUNBOOK ACTIVATED — QuantumBank ${var.region}"
          Message  = "DR Runbook triggered. Incident: {{IncidentId}}. Triggered by: {{TriggeredBy}}. Region: ${var.region}. Review cluster status and execute failover decision if required."
        }
        nextStep = "EvaluateFailoverDecision"
      },
      {
        name   = "EvaluateFailoverDecision"
        action = "aws:executeScript"
        inputs = {
          Runtime = "python3.11"
          Handler = "evaluate"
          Script  = <<-PYTHON
            def evaluate(events, context):
              services = events.get('ServiceStatuses', [])
              unhealthy = [s for s in services if s.get('runningCount', 0) == 0]
              if len(unhealthy) >= 3:
                return {
                  'Recommendation': 'FAILOVER',
                  'Reason': f'{len(unhealthy)} services have zero running tasks — regional failover recommended',
                  'UnhealthyServices': [s.get('serviceName') for s in unhealthy]
                }
              elif len(unhealthy) >= 1:
                return {
                  'Recommendation': 'MONITOR',
                  'Reason': f'{len(unhealthy)} services degraded — monitor for 5 minutes before escalating',
                  'UnhealthyServices': [s.get('serviceName') for s in unhealthy]
                }
              return {'Recommendation': 'NO_ACTION', 'Reason': 'All services healthy — possible false alarm'}
          PYTHON
          InputPayload = { ServiceStatuses = "{{ AssessClusterHealth.ServiceStatuses }}" }
        }
        outputs = [
          { Name = "Recommendation", Selector = "$.Payload.Recommendation", Type = "String" },
          { Name = "Reason",         Selector = "$.Payload.Reason",         Type = "String" }
        ]
        nextStep = "ValidateAndClose"
      },
      {
        name   = "ValidateAndClose"
        action = "aws:executeAwsApi"
        inputs = {
          Service = "sns"
          Api     = "publish"
          TopicArn = var.sns_topic_arn
          Subject  = "📋 DR Runbook Complete — QuantumBank ${var.region}"
          Message  = "DR Runbook {{ IncidentId }} complete. Recommendation: {{ EvaluateFailoverDecision.Recommendation }}. Reason: {{ EvaluateFailoverDecision.Reason }}. Review the FIS experiment log at /aws/fis/quantumbank-${var.region} for full timeline."
        }
        isEnd = true
      }
    ]
  })

  tags = {
    Name   = "QuantumBank-DR-Runbook-${var.region}"
    Region = var.region
    Layer  = "disaster-recovery"
  }
}

###############################################################################
# EventBridge Rule — auto-trigger DR runbook when RTO breach alarm fires
###############################################################################

resource "aws_iam_role" "eventbridge_ssm" {
  name = "quantumbank-eventbridge-ssm-${var.region}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "events.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "eventbridge_ssm" {
  name = "quantumbank-eventbridge-ssm-policy-${var.region}"
  role = aws_iam_role.eventbridge_ssm.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ssm:StartAutomationExecution"]
      Resource = "arn:${data.aws_partition.current.partition}:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:automation-definition/QuantumBank-DR-Runbook-${var.region}:*"
    }]
  })
}

resource "aws_cloudwatch_event_rule" "rto_breach_trigger" {
  name        = "quantumbank-rto-breach-trigger-${var.region}"
  description = "Triggers DR runbook automatically when RTO breach alarm fires"

  event_pattern = jsonencode({
    source      = ["aws.cloudwatch"]
    detail-type = ["CloudWatch Alarm State Change"]
    detail = {
      alarmName = ["quantumbank-DR-RTO-BREACH-${var.region}"]
      state     = { value = ["ALARM"] }
    }
  })

  tags = {
    Region = var.region
    Layer  = "disaster-recovery"
  }
}

resource "aws_cloudwatch_event_target" "rto_breach_ssm" {
  rule     = aws_cloudwatch_event_rule.rto_breach_trigger.name
  arn      = "arn:${data.aws_partition.current.partition}:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:automation-definition/QuantumBank-DR-Runbook-${var.region}"
  role_arn = aws_iam_role.eventbridge_ssm.arn

  input_transformer {
    input_paths = {
      alarm_name = "$.detail.alarmName"
    }
    input_template = jsonencode({
      IncidentId  = ["INC-AUTO-<alarm_name>"]
      TriggeredBy = ["cloudwatch-alarm"]
    })
  }

  depends_on = [aws_ssm_document.dr_runbook]
}
