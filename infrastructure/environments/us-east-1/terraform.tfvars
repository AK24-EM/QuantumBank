###############################################################################
# Environment: us-east-1 - terraform.tfvars
# Last updated: 2026-06-13
###############################################################################

vpc_cidr             = "10.0.0.0/16"
availability_zones   = ["us-east-1a", "us-east-1b", "us-east-1c"]
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]

state_bucket_arn   = "arn:aws:s3:::quantumbank-terraform-state"
dynamodb_table_arn = "arn:aws:dynamodb:ap-south-1:577137986953:table/quantumbank-terraform-locks"
certificate_arn    = "arn:aws:acm:us-east-1:577137986953:certificate/abc12345-6789-0123-4567-abcdef123456"

github_org    = "quantumbank"
github_repo   = "new-repository"
sns_alert_arn = "arn:aws:sns:us-east-1:577137986953:quantumbank-alerts"
