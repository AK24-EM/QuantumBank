###############################################################################
# ALB Module - main.tf
#
# Regional Application Load Balancer with:
#   - HTTPS listener (443) with ACM certificate
#   - HTTP listener (80) → 301 redirect to HTTPS
#   - Target group (IP type for ECS Fargate)
#   - Health checks on /health endpoint
#   - Access logging to S3
#   - Deletion protection enabled
###############################################################################

###############################################################################
# S3 Bucket - ALB Access Logs
###############################################################################

data "aws_elb_service_account" "main" {}
data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "alb_logs" {
  bucket        = "quantumbank-alb-logs-${var.region}-${data.aws_caller_identity.current.account_id}"
  force_destroy = false

  tags = {
    Name    = "quantumbank-alb-logs-${var.region}"
    Purpose = "alb-access-logs"
  }
}

resource "aws_s3_bucket_public_access_block" "alb_logs" {
  bucket                  = aws_s3_bucket.alb_logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id
  rule {
    id     = "expire-alb-logs"
    status = "Enabled"
    filter { prefix = "" }
    expiration { days = 90 }
  }
}

resource "aws_s3_bucket_policy" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { AWS = data.aws_elb_service_account.main.arn }
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.alb_logs.arn}/alb-access-logs/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
      },
      {
        Effect    = "Allow"
        Principal = { Service = "delivery.logs.amazonaws.com" }
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.alb_logs.arn}/alb-access-logs/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
        Condition = { StringEquals = { "s3:x-amz-acl" = "bucket-owner-full-control" } }
      },
      {
        Effect    = "Allow"
        Principal = { Service = "delivery.logs.amazonaws.com" }
        Action    = "s3:GetBucketAcl"
        Resource  = aws_s3_bucket.alb_logs.arn
      }
    ]
  })
}

###############################################################################
# Application Load Balancer
###############################################################################

resource "aws_lb" "main" {
  name               = "quantumbank-alb-${var.region}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_sg_id]
  subnets            = var.public_subnet_ids

  # Cross-zone load balancing (default on for ALB, explicit for clarity)
  enable_cross_zone_load_balancing = true

  # Drop invalid HTTP headers for security
  drop_invalid_header_fields = true

  # Deletion protection - never accidentally destroy the ALB
  enable_deletion_protection = var.environment == "production"

  # WAF integration (Web ACL attached separately if needed)
  # enable_waf_fail_open = false

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.id
    prefix  = "alb-access-logs"
    enabled = true
  }

  idle_timeout = 60

  tags = {
    Name   = "quantumbank-alb-${var.region}"
    Region = var.region
  }
}

###############################################################################
# Target Group - IP type for ECS Fargate (awsvpc network mode)
###############################################################################

resource "aws_lb_target_group" "main" {
  name        = "quantumbank-tg-${var.region}"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  # Graceful deregistration - let in-flight requests complete
  deregistration_delay = 30

  health_check {
    enabled             = true
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 15
    matcher             = "200"
  }

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = false # Stateless services; disabled for active-active
  }

  tags = {
    Name   = "quantumbank-tg-${var.region}"
    Region = var.region
  }

  lifecycle {
    create_before_destroy = true
  }
}

###############################################################################
# Listeners
###############################################################################

locals {
  enable_https = var.certificate_arn != ""
}

# HTTP (80) - forward directly when no ACM cert; otherwise redirect to HTTPS
resource "aws_lb_listener" "http_forward" {
  count = local.enable_https ? 0 : 1

  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }
}

resource "aws_lb_listener" "http_redirect" {
  count = local.enable_https ? 1 : 0

  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# HTTPS (443) - Forward to target group (requires valid ACM certificate)
resource "aws_lb_listener" "https" {
  count = local.enable_https ? 1 : 0

  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }
}

# Listener rule - /health for Route 53 health checks (no auth required)
resource "aws_lb_listener_rule" "health_https" {
  count = local.enable_https ? 1 : 0

  listener_arn = aws_lb_listener.https[0].arn
  priority     = 1

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }

  condition {
    path_pattern {
      values = ["/health"]
    }
  }
}

resource "aws_lb_listener_rule" "health_http" {
  count = local.enable_https ? 0 : 1

  listener_arn = aws_lb_listener.http_forward[0].arn
  priority     = 1

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }

  condition {
    path_pattern {
      values = ["/health"]
    }
  }
}

###############################################################################
# CloudWatch Alarms for ALB
###############################################################################

resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "quantumbank-alb-5xx-${var.region}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 50
  alarm_description   = "ALB 5XX error rate elevated in ${var.region}"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  alarm_actions = var.sns_alert_arn != "" ? [var.sns_alert_arn] : []
}

resource "aws_cloudwatch_metric_alarm" "alb_latency" {
  alarm_name          = "quantumbank-alb-p99-latency-${var.region}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  extended_statistic  = "p99"
  threshold           = 0.5 # 500ms
  alarm_description   = "ALB P99 latency exceeded 500ms in ${var.region}"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  alarm_actions = var.sns_alert_arn != "" ? [var.sns_alert_arn] : []
}
