###############################################################################
# Secrets Module - Outputs
###############################################################################

output "kms_key_arn" {
  description = "KMS key ARN used to encrypt all secrets"
  value       = aws_kms_key.secrets.arn
}

output "kms_key_id" {
  description = "KMS key ID"
  value       = aws_kms_key.secrets.key_id
}

output "kms_alias_arn" {
  description = "KMS key alias ARN"
  value       = aws_kms_alias.secrets.arn
}

output "mongodb_uri_secret_arn" {
  description = "Secrets Manager ARN for MongoDB URI"
  value       = aws_secretsmanager_secret.mongodb_uri.arn
}

output "redis_url_secret_arn" {
  description = "Secrets Manager ARN for Redis URL"
  value       = aws_secretsmanager_secret.redis_url.arn
}

output "jwt_secret_arn" {
  description = "Secrets Manager ARN for JWT signing secret"
  value       = aws_secretsmanager_secret.jwt_secret.arn
}

output "jwt_refresh_secret_arn" {
  description = "Secrets Manager ARN for JWT refresh secret"
  value       = aws_secretsmanager_secret.jwt_refresh_secret.arn
}

output "service_db_secret_arns" {
  description = "Map of service name to DB password secret ARN"
  value       = { for k, v in aws_secretsmanager_secret.service_db_password : k => v.arn }
}
