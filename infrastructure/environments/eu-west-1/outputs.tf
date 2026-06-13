###############################################################################
# Environment: eu-west-1 — outputs.tf
###############################################################################

output "vpc_id" {
  value = module.vpc.vpc_id
}

output "alb_dns_name" {
  value = module.alb.alb_dns_name
}

output "alb_zone_id" {
  value = module.alb.alb_zone_id
}

output "cluster_name" {
  value = module.ecs_cluster.cluster_name
}
