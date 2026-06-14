###############################################################################
# Compliance Module - Outputs
###############################################################################

output "cloudtrail_name" {
  description = "CloudTrail trail name"
  value       = aws_cloudtrail.main.name
}

output "cloudtrail_arn" {
  description = "CloudTrail trail ARN"
  value       = aws_cloudtrail.main.arn
}

output "cloudtrail_bucket_name" {
  description = "S3 bucket storing CloudTrail logs"
  value       = aws_s3_bucket.cloudtrail.bucket
}

output "compliance_reports_bucket_name" {
  description = "WORM-locked S3 bucket for regulatory reports"
  value       = aws_s3_bucket.compliance_reports.bucket
}

output "compliance_reports_bucket_arn" {
  description = "ARN of the WORM compliance reports bucket"
  value       = aws_s3_bucket.compliance_reports.arn
}

output "config_recorder_name" {
  description = "AWS Config recorder name"
  value       = aws_config_configuration_recorder.main.name
}

output "config_bucket_name" {
  description = "S3 bucket storing AWS Config snapshots"
  value       = aws_s3_bucket.config.bucket
}
