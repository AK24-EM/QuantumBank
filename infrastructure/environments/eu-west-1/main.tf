###############################################################################
# Environment: eu-west-1 - main.tf
#
# Secondary AWS Region deployment root.
###############################################################################

locals {
  region      = "eu-west-1"
  environment = "production"
}

module "vpc" {
  source = "../../modules/vpc"

  vpc_cidr             = var.vpc_cidr
  region               = local.region
  environment          = local.environment
  availability_zones   = var.availability_zones
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  enable_flow_logs     = true
}

module "security_groups" {
  source = "../../modules/security-groups"

  vpc_id      = module.vpc.vpc_id
  region      = local.region
  environment = local.environment
}

module "iam" {
  source = "../../modules/iam"

  region             = local.region
  environment        = local.environment
  state_bucket_arn   = var.state_bucket_arn
  dynamodb_table_arn = var.dynamodb_table_arn
  github_org         = var.github_org
  github_repo        = var.github_repo
}

module "alb" {
  source = "../../modules/alb"

  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  alb_sg_id         = module.security_groups.alb_sg_id
  certificate_arn   = var.certificate_arn
  region            = local.region
  environment       = local.environment
  sns_alert_arn     = var.sns_alert_arn
}

module "ecs_cluster" {
  source = "../../modules/ecs-cluster"

  region                  = local.region
  environment             = local.environment
  vpc_id                  = module.vpc.vpc_id
  private_subnet_ids      = module.vpc.private_subnet_ids
  ecs_sg_id               = module.security_groups.ecs_sg_id
  task_execution_role_arn = module.iam.ecs_task_execution_role_arn
  task_role_arn           = module.iam.ecs_task_role_arn
  target_group_arn        = module.alb.target_group_arn
}
