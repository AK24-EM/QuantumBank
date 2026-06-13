###############################################################################
# Environment: eu-west-1 - terraform.tfvars
###############################################################################

vpc_cidr             = "10.1.0.0/16"
availability_zones   = ["eu-west-1a", "eu-west-1b", "eu-west-1c"]
public_subnet_cidrs  = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
private_subnet_cidrs = ["10.1.10.0/24", "10.1.11.0/24", "10.1.12.0/24"]

state_bucket_arn   = "arn:aws:s3:::quantumbank-tf-state-production"
dynamodb_table_arn = "arn:aws:dynamodb:us-east-1:123456789012:table/quantumbank-tf-locks"
certificate_arn    = "arn:aws:acm:eu-west-1:123456789012:certificate/xyz98765-4321-0987-6543-fedcba654321"

github_org    = "quantumbank"
github_repo   = "new-repository"
sns_alert_arn = "arn:aws:sns:eu-west-1:123456789012:quantumbank-alerts"
