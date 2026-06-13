###############################################################################
# ALB Module — Outputs
###############################################################################

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.main.arn
}

output "alb_arn_suffix" {
  description = "ARN suffix for CloudWatch metrics"
  value       = aws_lb.main.arn_suffix
}

output "alb_dns_name" {
  description = "DNS name of the ALB — used in Route 53 latency routing records"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Hosted Zone ID of the ALB — required for Route 53 ALIAS records"
  value       = aws_lb.main.zone_id
}

output "target_group_arn" {
  description = "ARN of the target group — used in ECS service definitions"
  value       = aws_lb_target_group.main.arn
}

output "https_listener_arn" {
  description = "ARN of the HTTPS listener — used to add additional listener rules"
  value       = aws_lb_listener.https.arn
}

output "alb_logs_bucket" {
  description = "S3 bucket storing ALB access logs"
  value       = aws_s3_bucket.alb_logs.bucket
}
