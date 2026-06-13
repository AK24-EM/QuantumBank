###############################################################################
# Route 53 Module - main.tf
#
# Global DNS routing & failover. Created ONCE (typically in us-east-1).
# Sets up:
#   - Hosted Zone (optional / data source)
#   - Latency-based Routing alias records pointing to each regional ALB
#   - Route 53 Health Checks monitoring each regional endpoint
#   - Automatic DNS failover if health check fails
###############################################################################

###############################################################################
# Hosted Zone
###############################################################################

data "aws_route53_zone" "primary" {
  name         = var.domain_name
  private_zone = false
}

###############################################################################
# Route 53 Health Checks - one per regional endpoint
###############################################################################

resource "aws_route53_health_check" "regional" {
  for_each = var.regional_endpoints

  fqdn              = each.value.dns_name
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = var.health_check_failure_threshold
  request_interval  = 30

  tags = {
    Name   = "quantumbank-hc-${each.key}"
    Region = each.key
  }
}

###############################################################################
# Latency-Based Alias Records (A and AAAA)
###############################################################################

resource "aws_route53_record" "api_latency_ipv4" {
  for_each = var.regional_endpoints

  zone_id = data.aws_route53_zone.primary.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  set_identifier = "api-latency-${each.key}"
  latency_routing_policy {
    region = each.value.route53_region
  }

  alias {
    name                   = each.value.dns_name
    zone_id                = each.value.zone_id
    evaluate_target_health = true
  }

  health_check_id = aws_route53_health_check.regional[each.key].id
}

resource "aws_route53_record" "api_latency_ipv6" {
  for_each = var.regional_endpoints

  zone_id = data.aws_route53_zone.primary.zone_id
  name    = "api.${var.domain_name}"
  type    = "AAAA"

  set_identifier = "api-latency-${each.key}-v6"
  latency_routing_policy {
    region = each.value.route53_region
  }

  alias {
    name                   = each.value.dns_name
    zone_id                = each.value.zone_id
    evaluate_target_health = true
  }

  health_check_id = aws_route53_health_check.regional[each.key].id
}
