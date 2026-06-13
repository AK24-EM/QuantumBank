###############################################################################
# LOCAL BACKEND - uses LocalStack (free)
# Switch between this and the real S3 backend for local vs prod deploys
###############################################################################

terraform {
  backend "s3" {
    bucket                      = "quantumbank-terraform-state"
    key                         = "environments/ap-south-1/terraform.tfstate"
    region                      = "ap-south-1"
    access_key                  = "test"
    secret_key                  = "test"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_requesting_account_id  = true
    use_path_style              = true
    endpoints = {
      s3       = "http://localhost:4566"
      dynamodb = "http://localhost:4566"
    }
  }
}
