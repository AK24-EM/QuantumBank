###############################################################################
# IAM Module - main.tf
#
# Creates least-privilege IAM roles for the QuantumBank platform:
#   1. ECSTaskExecutionRole  - lets ECS pull images from ECR, fetch secrets
#   2. ECSTaskRole           - per-task permissions (SQS, S3, CloudWatch, X-Ray)
#   3. TerraformDeployRole   - assumed by CI/CD pipeline (OIDC)
#   4. ChaosEngineeringRole  - admin-only role for chaos experiments
###############################################################################

data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

###############################################################################
# ECS Task Execution Role
# Allows the ECS agent to pull images and fetch secrets - NOT the app itself
###############################################################################

resource "aws_iam_role" "ecs_task_execution" {
  name = "quantumbank-ecs-task-execution-${var.region}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Condition = {
        StringEquals = {
          "aws:SourceAccount" = data.aws_caller_identity.current.account_id
        }
      }
    }]
  })

  tags = {
    Name = "quantumbank-ecs-task-execution-${var.region}"
    Role = "ecs-execution"
  }
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_managed" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Allow reading secrets from Secrets Manager (DB passwords, API keys)
resource "aws_iam_role_policy" "ecs_task_execution_secrets" {
  name = "quantumbank-ecs-execution-secrets-${var.region}"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = "arn:${data.aws_partition.current.partition}:secretsmanager:${var.region}:${data.aws_caller_identity.current.account_id}:secret:quantumbank/*"
      },
      {
        Effect   = "Allow"
        Action   = ["ssm:GetParameters", "ssm:GetParameter"]
        Resource = "arn:${data.aws_partition.current.partition}:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/quantumbank/*"
      },
      {
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      }
    ]
  })
}

###############################################################################
# ECS Task Role
# Permissions the running application itself has at runtime
###############################################################################

resource "aws_iam_role" "ecs_task" {
  name = "quantumbank-ecs-task-${var.region}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Condition = {
        StringEquals = {
          "aws:SourceAccount" = data.aws_caller_identity.current.account_id
        }
        ArnLike = {
          "aws:SourceArn" = "arn:${data.aws_partition.current.partition}:ecs:${var.region}:${data.aws_caller_identity.current.account_id}:*"
        }
      }
    }]
  })

  tags = {
    Name = "quantumbank-ecs-task-${var.region}"
    Role = "ecs-task"
  }
}

resource "aws_iam_role_policy" "ecs_task_permissions" {
  name = "quantumbank-ecs-task-policy-${var.region}"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # CloudWatch Logs
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:${data.aws_partition.current.partition}:logs:${var.region}:${data.aws_caller_identity.current.account_id}:log-group:/quantumbank/*"
      },
      # X-Ray tracing
      {
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords",
          "xray:GetSamplingRules",
          "xray:GetSamplingTargets"
        ]
        Resource = "*"
      },
      # SQS - for async payment processing queues
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl"
        ]
        Resource = "arn:${data.aws_partition.current.partition}:sqs:${var.region}:${data.aws_caller_identity.current.account_id}:quantumbank-*"
      },
      # S3 - statement storage, analytics artifacts
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:GetObjectVersion"
        ]
        Resource = "arn:${data.aws_partition.current.partition}:s3:::quantumbank-*/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = "arn:${data.aws_partition.current.partition}:s3:::quantumbank-*"
      },
      # CloudWatch metrics - application metrics publishing
      {
        Effect   = "Allow"
        Action   = ["cloudwatch:PutMetricData"]
        Resource = "*"
        Condition = {
          StringEquals = { "cloudwatch:namespace" = "QuantumBank" }
        }
      }
    ]
  })
}

###############################################################################
# Permission Boundary - Prevents privilege escalation from ECS roles
###############################################################################

resource "aws_iam_policy" "ecs_boundary" {
  name        = "quantumbank-ecs-boundary-${var.region}"
  description = "Permission boundary for all QuantumBank ECS roles - blocks IAM privilege escalation"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Deny"
        Action   = ["iam:*", "sts:AssumeRole"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = "*"
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_boundary" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = aws_iam_policy.ecs_boundary.arn
}

###############################################################################
# Terraform Deploy Role - assumed by GitHub Actions OIDC
###############################################################################

resource "aws_iam_role" "terraform_deploy" {
  name = "quantumbank-terraform-deploy-${var.region}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRoleWithWebIdentity"
      Effect    = "Allow"
      Principal = { Federated = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com" }
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_org}/${var.github_repo}:*"
        }
      }
    }]
  })

  # Prevent the running pipeline from invalidating its own session by modifying
  # the assume_role_policy mid-apply. Changes to this field take effect on
  # the next run, not the current one.
  lifecycle {
    ignore_changes = [assume_role_policy]
  }

  tags = {
    Name = "quantumbank-terraform-deploy-${var.region}"
    Role = "ci-cd"
  }
}

resource "aws_iam_role_policy" "terraform_deploy_permissions" {
  name = "quantumbank-terraform-deploy-policy-${var.region}"
  role = aws_iam_role.terraform_deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Terraform state backend access
      {
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [
          var.state_bucket_arn,
          "${var.state_bucket_arn}/*"
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"]
        Resource = var.dynamodb_table_arn
      },
      # ECS deployment
      {
        Effect = "Allow"
        Action = [
          "ecs:RegisterTaskDefinition",
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:DescribeTaskDefinition",
          "ecs:ListTaskDefinitions"
        ]
        Resource = "*"
      },
      # ECR push
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:DescribeRepositories"
        ]
        Resource = "*"
      },
      # PassRole - only to ECS task roles
      {
        Effect = "Allow"
        Action = ["iam:PassRole"]
        Resource = [
          aws_iam_role.ecs_task_execution.arn,
          aws_iam_role.ecs_task.arn
        ]
      }
    ]
  })
}

###############################################################################
# Chaos Engineering Role - admin-assumed for controlled experiments
###############################################################################

resource "aws_iam_role" "chaos_engineering" {
  name = "quantumbank-chaos-engineering-${var.region}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { AWS = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:root" }
      Condition = {
        StringEquals = {
          "aws:PrincipalTag/Team" = "platform-engineering"
        }
        Bool = {
          "aws:MultiFactorAuthPresent" = "true"
        }
      }
    }]
  })

  tags = {
    Name        = "quantumbank-chaos-${var.region}"
    Role        = "chaos-engineering"
    Sensitivity = "high"
  }
}

resource "aws_iam_role_policy" "chaos_engineering_permissions" {
  name = "quantumbank-chaos-policy-${var.region}"
  role = aws_iam_role.chaos_engineering.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Stop/start ECS tasks for pod crash simulation
      {
        Effect = "Allow"
        Action = [
          "ecs:StopTask",
          "ecs:ListTasks",
          "ecs:DescribeTasks"
        ]
        Resource = "*"
        Condition = {
          StringEquals = { "ecs:cluster" = "quantumbank-*" }
        }
      },
      # SSM for network latency injection (tc/netem via SSM)
      {
        Effect = "Allow"
        Action = [
          "ssm:SendCommand",
          "ssm:GetCommandInvocation"
        ]
        Resource = "*"
        Condition = {
          StringEquals = { "ssm:resourceTag/Project" = "quantumbank" }
        }
      },
      # FIS - AWS Fault Injection Simulator experiments
      {
        Effect   = "Allow"
        Action   = ["fis:StartExperiment", "fis:GetExperiment", "fis:ListExperiments"]
        Resource = "arn:${data.aws_partition.current.partition}:fis:${var.region}:${data.aws_caller_identity.current.account_id}:experiment-template/*"
      }
    ]
  })
}
