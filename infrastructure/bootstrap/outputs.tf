###############################################################################
# Bootstrap - Outputs
# Copy these values into each environment's backend.tf
###############################################################################

output "state_bucket_name" {
  description = "S3 bucket name for Terraform remote state"
  value       = aws_s3_bucket.tf_state.bucket
}

output "state_bucket_arn" {
  description = "ARN of the Terraform state S3 bucket (used in IAM policies)"
  value       = aws_s3_bucket.tf_state.arn
}

output "dynamodb_table_name" {
  description = "DynamoDB table name for Terraform state locking"
  value       = aws_dynamodb_table.tf_locks.name
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB lock table (used in IAM policies)"
  value       = aws_dynamodb_table.tf_locks.arn
}

output "aws_account_id" {
  description = "AWS account ID - used in bucket name references"
  value       = data.aws_caller_identity.current.account_id
}
