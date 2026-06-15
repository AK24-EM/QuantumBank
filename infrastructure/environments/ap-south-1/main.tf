###############################################################################
# Environment: ap-south-1 - main.tf
#
# Primary (active) AWS Region deployment root.
###############################################################################

locals {
  region      = "ap-south-1"
  environment = "production"
}

data "aws_caller_identity" "current" {}

module "vpc" {
  source = "../../modules/vpc"

  vpc_cidr             = var.vpc_cidr
  region               = local.region
  environment          = local.environment
  availability_zones   = var.availability_zones
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  enable_flow_logs     = true
  single_nat_gateway   = var.single_nat_gateway
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

###############################################################################
# Observability Module — Metrics, Logs, Traces, Alerting
###############################################################################

module "observability" {
  source = "../../modules/observability"

  region      = local.region
  environment = local.environment
  account_id  = data.aws_caller_identity.current.account_id

  # ECS references
  ecs_cluster_name = module.ecs_cluster.cluster_name
  service_names    = module.ecs_cluster.service_names
  log_group_names  = module.ecs_cluster.log_group_names

  # ALB references
  alb_arn_suffix          = module.alb.alb_arn_suffix
  target_group_arn_suffix = module.alb.target_group_arn_suffix

  # Alerting — set your email here to receive alarm notifications
  alert_email = var.alert_email
}

###############################################################################
# Secrets Module — AWS Secrets Manager + KMS CMK
###############################################################################

module "secrets" {
  source = "../../modules/secrets"

  region      = local.region
  environment = local.environment
}

###############################################################################
# Disaster Recovery Module — FIS experiments, DR alarms, runbook, EventBridge
###############################################################################

module "disaster_recovery" {
  source = "../../modules/disaster-recovery"

  region           = local.region
  environment      = local.environment
  ecs_cluster_name = module.ecs_cluster.cluster_name
  ecs_cluster_arn  = module.ecs_cluster.cluster_arn
  service_names    = module.ecs_cluster.service_names
  vpc_id           = module.vpc.vpc_id
  sns_topic_arn    = module.observability.sns_topic_arn
  kms_key_arn      = module.secrets.kms_key_arn
  rto_minutes      = 30
  rpo_minutes      = 5
  chaos_enabled    = false # Set true only when running a scheduled chaos day
}
