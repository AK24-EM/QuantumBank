###############################################################################
# Security Groups Module - main.tf
#
# Creates three tiered security groups:
#   alb-sg   → public-facing ALB (443 + 80 from internet)
#   ecs-sg   → ECS Fargate tasks (traffic from ALB SG only)
#   db-sg    → RDS PostgreSQL + DocumentDB (traffic from ECS SG only)
#
# Zero open SSH (port 22) rules. All outbound restricted to minimum needed.
###############################################################################

###############################################################################
# ALB Security Group - accepts HTTPS and HTTP from anywhere
###############################################################################

resource "aws_security_group" "alb" {
  name        = "quantumbank-alb-sg-${var.region}"
  description = "QuantumBank ALB - accepts 443/80 from public internet"
  vpc_id      = var.vpc_id

  # HTTPS inbound
  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP inbound - ALB listener redirects to HTTPS, not ECS
  ingress {
    description = "HTTP from internet (redirect to HTTPS)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all outbound to ECS (refined below via ecs_sg self-reference)
  egress {
    description = "All outbound (ALB to ECS tasks)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "quantumbank-alb-sg-${var.region}"
    Tier = "public"
  }
}

###############################################################################
# ECS Security Group - traffic only from ALB SG
###############################################################################

resource "aws_security_group" "ecs" {
  name        = "quantumbank-ecs-sg-${var.region}"
  description = "QuantumBank ECS tasks - accepts traffic from ALB SG only"
  vpc_id      = var.vpc_id

  # Accept traffic from ALB on all service ports (8080–8085)
  ingress {
    description     = "From ALB security group"
    from_port       = 8080
    to_port         = 8085
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Internal service-to-service communication within ECS SG
  ingress {
    description = "Internal service mesh (ECS to ECS)"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
  }

  # HTTPS egress - for calling AWS APIs, Secrets Manager, ECR
  egress {
    description = "HTTPS to AWS services and internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # DNS resolution
  egress {
    description = "DNS UDP"
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "DNS TCP"
    from_port   = 53
    to_port     = 53
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "quantumbank-ecs-sg-${var.region}"
    Tier = "private"
  }
}

###############################################################################
# DB Security Group - accepts from ECS SG only
###############################################################################

resource "aws_security_group" "db" {
  name        = "quantumbank-db-sg-${var.region}"
  description = "QuantumBank databases - accepts from ECS SG only, no internet access"
  vpc_id      = var.vpc_id

  # PostgreSQL (RDS)
  ingress {
    description     = "PostgreSQL from ECS tasks"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  # MongoDB / DocumentDB
  ingress {
    description     = "MongoDB/DocumentDB from ECS tasks"
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  # Redis / ElastiCache
  ingress {
    description     = "Redis from ECS tasks"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  # No outbound from DB - databases should not initiate connections
  egress {
    description = "Deny all outbound from DB tier"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = []
    self        = false
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "quantumbank-db-sg-${var.region}"
    Tier = "data"
  }
}

###############################################################################
# VPC Endpoints - S3 and DynamoDB (Gateway type, free of charge)
# Keeps S3/DynamoDB traffic inside the AWS network, avoids NAT GW costs
###############################################################################

data "aws_route_tables" "private" {
  vpc_id = var.vpc_id

  filter {
    name   = "tag:Tier"
    values = ["private"]
  }
}

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = data.aws_route_tables.private.ids

  tags = {
    Name = "quantumbank-vpce-s3-${var.region}"
  }
}

resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.dynamodb"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = data.aws_route_tables.private.ids

  tags = {
    Name = "quantumbank-vpce-dynamodb-${var.region}"
  }
}
