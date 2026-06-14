###############################################################################
# ECS Cluster Module - main.tf
#
# Provisions an ECS Fargate cluster per region with 6 microservices
# matching the QuantumBank platform services in platformService.ts:
#
#   api-gateway          - port 8080, 3 desired tasks, ALB-attached
#   payment-service      - port 8081, 3 desired tasks, ALB-attached
#   auth-service         - port 8082, 2 desired tasks, ALB-attached
#   notification-service - port 8083, 2 desired tasks, ALB-attached
#   analytics-worker     - port 8084, 2 desired tasks, internal only
#   statement-generator  - port 8085, 1 desired task,  internal only
#
# All services use:
#   - Fargate launch type (serverless compute)
#   - awsvpc network mode (each task gets its own ENI + private IP)
#   - CloudWatch Container Insights
#   - Auto Scaling (CPU 70% + Memory 80% target tracking)
#   - Service Connect (AWS Cloud Map internal DNS)
###############################################################################

###############################################################################
# ECR Repositories - one per service
###############################################################################

locals {
  services = {
    "api-gateway" = {
      port        = 8080
      desired     = 3
      cpu         = 512
      memory      = 1024
      alb_exposed = true
      min_count   = 2
      max_count   = 20
    }
    "payment-service" = {
      port        = 8081
      desired     = 3
      cpu         = 1024
      memory      = 2048
      alb_exposed = true
      min_count   = 2
      max_count   = 10
    }
    "auth-service" = {
      port        = 8082
      desired     = 2
      cpu         = 512
      memory      = 1024
      alb_exposed = true
      min_count   = 2
      max_count   = 8
    }
    "notification-service" = {
      port        = 8083
      desired     = 2
      cpu         = 256
      memory      = 512
      alb_exposed = true
      min_count   = 1
      max_count   = 6
    }
    "analytics-worker" = {
      port        = 8084
      desired     = 2
      cpu         = 1024
      memory      = 2048
      alb_exposed = false
      min_count   = 1
      max_count   = 8
    }
    "statement-generator" = {
      port        = 8085
      desired     = 1
      cpu         = 512
      memory      = 1024
      alb_exposed = false
      min_count   = 1
      max_count   = 4
    }
  }

  alb_services      = { for k, v in local.services : k => v if v.alb_exposed }
  internal_services = { for k, v in local.services : k => v if !v.alb_exposed }
}

resource "aws_ecr_repository" "services" {
  for_each             = local.services
  name                 = "quantumbank/${each.key}"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  # image_tag_mutability cannot be changed on a repo that already has images.
  # Pre-existing repos imported via imports.tf may have been created as MUTABLE;
  # ignore drift on this field to prevent a mid-apply failure.
  lifecycle {
    ignore_changes = [image_tag_mutability]
  }

  tags = {
    Name    = "quantumbank-ecr-${each.key}"
    Service = each.key
    Region  = var.region
  }
}

resource "aws_ecr_lifecycle_policy" "services" {
  for_each   = local.services
  repository = aws_ecr_repository.services[each.key].name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images older than 30 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 30
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Keep only 20 most recent tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = 20
        }
        action = { type = "expire" }
      }
    ]
  })
}

###############################################################################
# ECS Cluster
###############################################################################

resource "aws_ecs_cluster" "main" {
  name = "quantumbank-${var.region}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name   = "quantumbank-cluster-${var.region}"
    Region = var.region
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 1
  }
}

###############################################################################
# CloudWatch Log Groups - one per service
###############################################################################

resource "aws_cloudwatch_log_group" "services" {
  for_each          = local.services
  name              = "/quantumbank/${var.region}/${each.key}"
  retention_in_days = 30

  tags = {
    Service = each.key
    Region  = var.region
  }
}

###############################################################################
# ECS Task Definitions
###############################################################################

resource "aws_ecs_task_definition" "services" {
  for_each = local.services

  family                   = "quantumbank-${each.key}-${var.region}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = each.value.cpu
  memory                   = each.value.memory
  execution_role_arn       = var.task_execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([
    {
      name      = each.key
      image     = "${aws_ecr_repository.services[each.key].repository_url}:latest"
      essential = true

      portMappings = [{
        containerPort = each.value.port
        protocol      = "tcp"
        name          = each.key # for Service Connect
      }]

      environment = [
        { name = "APP_ENV", value = var.environment },
        { name = "AWS_REGION", value = var.region },
        { name = "SERVICE_NAME", value = each.key },
        { name = "PORT", value = tostring(each.value.port) }
      ]

      secrets = [
        {
          name      = "DB_PASSWORD"
          valueFrom = "arn:aws:secretsmanager:${var.region}:*:secret:quantumbank/${each.key}/db-password"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.services[each.key].name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = each.key
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${each.value.port}/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      # X-Ray sidecar for distributed tracing
      dependsOn = [{
        containerName = "xray-daemon"
        condition     = "START"
      }]
    },
    {
      name      = "xray-daemon"
      image     = "public.ecr.aws/xray/aws-xray-daemon:latest"
      essential = false
      portMappings = [{
        containerPort = 2000
        protocol      = "udp"
      }]
      cpu    = 32
      memory = 64
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.services[each.key].name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "xray"
        }
      }
    }
  ])

  tags = {
    Service = each.key
    Region  = var.region
  }
}

###############################################################################
# ECS Services - ALB-attached (api-gateway, payment, auth, notification)
###############################################################################

resource "aws_ecs_service" "alb_services" {
  for_each = local.alb_services

  name                              = "quantumbank-${each.key}-${var.region}"
  cluster                           = aws_ecs_cluster.main.id
  task_definition                   = aws_ecs_task_definition.services[each.key].arn
  desired_count                     = each.value.desired
  launch_type                       = "FARGATE"
  health_check_grace_period_seconds = 60

  # Prevent Terraform from scaling back tasks managed by Auto Scaling
  lifecycle {
    ignore_changes = [desired_count]
  }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_sg_id]
    assign_public_ip = false
  }

  # Only api-gateway is registered with the ALB target group.
  # Other ALB-attached services communicate internally via Service Connect.
  # Attach a load_balancer block only for api-gateway.
  dynamic "load_balancer" {
    for_each = each.key == "api-gateway" ? [1] : []
    content {
      target_group_arn = var.target_group_arn
      container_name   = each.key
      container_port   = each.value.port
    }
  }

  service_connect_configuration {
    enabled   = true
    namespace = aws_service_discovery_private_dns_namespace.main.arn

    service {
      port_name = each.key
      client_alias {
        dns_name = each.key
        port     = each.value.port
      }
    }
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_controller {
    type = "ECS"
  }

  tags = {
    Service = each.key
    Region  = var.region
  }

  depends_on = [aws_ecr_repository.services]
}

###############################################################################
# ECS Services - Internal (analytics-worker, statement-generator)
###############################################################################

resource "aws_ecs_service" "internal_services" {
  for_each = local.internal_services

  name            = "quantumbank-${each.key}-${var.region}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.services[each.key].arn
  desired_count   = each.value.desired
  launch_type     = "FARGATE"

  lifecycle {
    ignore_changes = [desired_count]
  }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_sg_id]
    assign_public_ip = false
  }

  service_connect_configuration {
    enabled   = true
    namespace = aws_service_discovery_private_dns_namespace.main.arn

    service {
      port_name = each.key
      client_alias {
        dns_name = each.key
        port     = each.value.port
      }
    }
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  tags = {
    Service = each.key
    Region  = var.region
  }

  depends_on = [aws_ecr_repository.services]
}

###############################################################################
# Auto Scaling - per service
###############################################################################

resource "aws_appautoscaling_target" "services" {
  for_each = local.services

  max_capacity       = each.value.max_count
  min_capacity       = each.value.min_count
  resource_id        = "service/${aws_ecs_cluster.main.name}/quantumbank-${each.key}-${var.region}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  depends_on = [
    aws_ecs_service.alb_services,
    aws_ecs_service.internal_services
  ]
}

resource "aws_appautoscaling_policy" "cpu" {
  for_each = local.services

  name               = "quantumbank-${each.key}-cpu-scaling-${var.region}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.services[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.services[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.services[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

resource "aws_appautoscaling_policy" "memory" {
  for_each = local.services

  name               = "quantumbank-${each.key}-memory-scaling-${var.region}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.services[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.services[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.services[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = 80.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

###############################################################################
# Service Discovery - AWS Cloud Map (internal DNS)
###############################################################################

resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "quantumbank.${var.region}.internal"
  description = "QuantumBank internal service mesh - ${var.region}"
  vpc         = var.vpc_id

  tags = {
    Name   = "quantumbank-service-discovery-${var.region}"
    Region = var.region
  }
}
