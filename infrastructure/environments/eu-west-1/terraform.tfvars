###############################################################################
# Environment: eu-west-1 - terraform.tfvars
###############################################################################

vpc_cidr             = "10.1.0.0/16"
availability_zones   = ["eu-west-1a", "eu-west-1b", "eu-west-1c"]
public_subnet_cidrs  = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
private_subnet_cidrs = ["10.1.10.0/24", "10.1.11.0/24", "10.1.12.0/24"]

state_bucket_arn   = "arn:aws:s3:::quantumbank-terraform-state"
dynamodb_table_arn = "arn:aws:dynamodb:eu-west-1:577137986953:table/quantumbank-terraform-locks"

certificate_arn = ""

github_org  = "AK24-EM"
github_repo = "QuantumBank"

sns_alert_arn = ""

single_nat_gateway = true
