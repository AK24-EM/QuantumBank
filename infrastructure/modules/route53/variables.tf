###############################################################################
# Route 53 Module - Variables
###############################################################################

variable "domain_name" {
  description = "Primary domain name for the hosted zone (e.g., quantumbank.com)"
  type        = string
}

variable "regional_endpoints" {
  description = "Map of regional configurations with DNS names, zone IDs, and latency routing regions"
  type = map(object({
    dns_name       = string
    zone_id        = string
    route53_region = string
  }))
}

variable "health_check_failure_threshold" {
  description = "Number of consecutive health check failures before considering endpoint unhealthy"
  type        = number
  default     = 2
}

variable "health_check_port" {
  description = "Port for Route 53 health checks (80 for HTTP-only ALB, 443 for HTTPS)"
  type        = number
  default     = 80
}

variable "health_check_protocol" {
  description = "Protocol for Route 53 health checks (HTTP or HTTPS)"
  type        = string
  default     = "HTTP"
}
