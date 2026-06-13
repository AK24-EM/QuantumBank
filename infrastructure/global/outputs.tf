###############################################################################
# Global DNS - outputs.tf
###############################################################################

output "hosted_zone_id" {
  description = "Hosted Zone ID"
  value       = module.global_dns.hosted_zone_id
}

output "api_endpoint" {
  description = "Active-active latency routing API endpoint"
  value       = module.global_dns.api_fqdn
}

output "health_check_ids" {
  description = "Regional Health check IDs"
  value       = module.global_dns.health_check_ids
}
