###############################################################################
# Global DNS — main.tf
#
# Wires up the Route 53 latency records using remote states from regional deployments.
###############################################################################

# Read regional ALBs outputs from remote state
data "terraform_remote_state" "us_east_1" {
  backend = "s3"
  config = {
    bucket         = var.state_bucket_name
    key            = "environments/us-east-1/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "quantumbank-terraform-locks"
  }
}

data "terraform_remote_state" "eu_west_1" {
  backend = "s3"
  config = {
    bucket         = var.state_bucket_name
    key            = "environments/eu-west-1/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "quantumbank-terraform-locks"
  }
}

data "terraform_remote_state" "ap_south_1" {
  backend = "s3"
  config = {
    bucket         = var.state_bucket_name
    key            = "environments/ap-south-1/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "quantumbank-terraform-locks"
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

  health_check_failure_threshold = 2
}
