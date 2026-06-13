###############################################################################
# Environment: ap-south-1 — terraform.tfvars
###############################################################################

vpc_cidr             = "10.2.0.0/16"
availability_zones   = ["ap-south-1a", "ap-south-1b", "ap-south-1c"]
public_subnet_cidrs  = ["10.2.1.0/24", "10.2.2.0/24", "10.2.3.0/24"]
private_subnet_cidrs = ["10.2.10.0/24", "10.2.11.0/24", "10.2.12.0/24"]

state_bucket_arn   = "arn:aws:s3:::quantumbank-terraform-state"
dynamodb_table_arn = "arn:aws:dynamodb:ap-south-1:577137986953:table/quantumbank-terraform-locks"
certificate_arn    = "arn:aws:acm:ap-south-1:577137986953:certificate/hij54321-0987-6543-2109-defabc098765"

github_org    = "quantumbank"
github_repo   = "new-repository"
sns_alert_arn = "arn:aws:sns:ap-south-1:577137986953:quantumbank-alerts"
