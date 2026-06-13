###############################################################################
# Route 53 Module - Outputs
###############################################################################

output "hosted_zone_id" {
  description = "ID of the Route 53 hosted zone"
  value       = data.aws_route53_zone.primary.zone_id
}

output "api_fqdn" {
  description = "Fully qualified domain name of the API endpoint"
  value       = "api.${var.domain_name}"
}

output "health_check_ids" {
  description = "Map of health check IDs for each regional endpoint"
  value       = { for k, v in aws_route53_health_check.regional : k => v.id }
}
