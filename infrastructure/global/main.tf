###############################################################################
# Global DNS - main.tf
#
# Wires up the Route 53 latency records using remote states from regional deployments.
###############################################################################

# Read regional ALBs outputs from remote state
data "terraform_remote_state" "us_east_1" {
  backend = "s3"
  config = {
    bucket         = var.state_bucket_name
    key            = "environments/us-east-1/terraform.tfstate"
    region         = var.state_bucket_region
    dynamodb_table = var.dynamodb_table_name
  }
}

data "terraform_remote_state" "eu_west_1" {
  backend = "s3"
  config = {
    bucket         = var.state_bucket_name
    key            = "environments/eu-west-1/terraform.tfstate"
    region         = var.state_bucket_region
    dynamodb_table = var.dynamodb_table_name
  }
}

data "terraform_remote_state" "ap_south_1" {
  backend = "s3"
  config = {
    bucket         = var.state_bucket_name
    key            = "environments/ap-south-1/terraform.tfstate"
    region         = var.state_bucket_region
    dynamodb_table = var.dynamodb_table_name
  }
}

# Invoke Route 53 module
module "global_dns" {
  source = "../modules/route53"

  domain_name = var.domain_name

  regional_endpoints = {
    us-east-1 = {
      dns_name       = data.terraform_remote_state.us_east_1.outputs.alb_dns_name
      zone_id        = data.terraform_remote_state.us_east_1.outputs.alb_zone_id
      route53_region = "us-east-1"
    }
    eu-west-1 = {
      dns_name       = data.terraform_remote_state.eu_west_1.outputs.alb_dns_name
      zone_id        = data.terraform_remote_state.eu_west_1.outputs.alb_zone_id
      route53_region = "eu-west-1"
    }
    ap-south-1 = {
      dns_name       = data.terraform_remote_state.ap_south_1.outputs.alb_dns_name
      zone_id        = data.terraform_remote_state.ap_south_1.outputs.alb_zone_id
      route53_region = "ap-south-1"
    }
  }

  # Fail over after 2 consecutive failures (Route 53 checks every 30s → ~60s RTO)
  health_check_failure_threshold = 2

  # HTTP-only until ACM certs are issued — update to 443 / HTTPS when certificate_arn is set
  health_check_port     = 80
  health_check_protocol = "HTTP"
}
