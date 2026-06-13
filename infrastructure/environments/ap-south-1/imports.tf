###############################################################################
# Import pre-existing AWS resources into Terraform state.
# Safe to keep: Terraform skips import once the resource is already in state.
###############################################################################

import {
  to = module.ecs_cluster.aws_ecr_repository.services["api-gateway"]
  id = "quantumbank/api-gateway"
}
