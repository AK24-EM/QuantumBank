###############################################################################
# Environment: ap-south-1 - terraform.tfvars
###############################################################################

vpc_cidr             = "10.2.0.0/16"
availability_zones   = ["ap-south-1a", "ap-south-1b", "ap-south-1c"]
public_subnet_cidrs  = ["10.2.1.0/24", "10.2.2.0/24", "10.2.3.0/24"]
private_subnet_cidrs = ["10.2.10.0/24", "10.2.11.0/24", "10.2.12.0/24"]

state_bucket_arn   = "arn:aws:s3:::quantumbank-terraform-state"
dynamodb_table_arn = "arn:aws:dynamodb:ap-south-1:577137986953:table/quantumbank-terraform-locks"

# Set after ACM certificate is issued; empty = HTTP-only ALB on port 80
certificate_arn = ""

github_org  = "AK24-EM"
github_repo = "QuantumBank"

# Optional; leave empty until SNS topic is created
sns_alert_arn = ""
