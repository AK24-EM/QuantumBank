#!/usr/bin/env bash
###############################################################################
# QuantumBank Infrastructure — Local Dev Script
# Runs Terraform against LocalStack (FREE — no AWS costs)
#
# Usage:
#   ./localrun.sh init        — init against LocalStack
#   ./localrun.sh plan        — plan against LocalStack
#   ./localrun.sh apply       — apply against LocalStack
#   ./localrun.sh destroy     — destroy LocalStack resources
#   ./localrun.sh start       — start LocalStack container
#   ./localrun.sh stop        — stop LocalStack container
#   ./localrun.sh status      — check LocalStack health
###############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/localstack/docker-compose.yml"
ENV_DIR="$SCRIPT_DIR/environments/ap-south-1"
LOCAL_BACKEND="$SCRIPT_DIR/localstack/backend-local.tf"

# LocalStack AWS credentials (fake — LocalStack accepts any value)
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=ap-south-1
export TF_VAR_environment=local

# LocalStack endpoint overrides for tflocal
export AWS_ENDPOINT_URL=http://localhost:4566

check_localstack() {
  if ! curl -sf http://localhost:4566/_localstack/health > /dev/null 2>&1; then
    echo "❌ LocalStack is not running. Start it with: ./localrun.sh start"
    exit 1
  fi
  echo "✅ LocalStack is healthy"
}

cmd="${1:-help}"

case "$cmd" in
  start)
    echo "🚀 Starting LocalStack..."
    docker compose -f "$COMPOSE_FILE" up -d
    echo "⏳ Waiting for LocalStack to be ready..."
    for i in {1..30}; do
      if curl -sf http://localhost:4566/_localstack/health > /dev/null 2>&1; then
        echo "✅ LocalStack is ready!"
        break
      fi
      sleep 2
      echo "  Waiting... ($i/30)"
    done
    # Create the state bucket in LocalStack
    echo "📦 Creating state bucket in LocalStack..."
    AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test \
      aws --endpoint-url=http://localhost:4566 \
          s3 mb s3://quantumbank-terraform-state \
          --region ap-south-1 2>/dev/null || echo "  Bucket already exists"
    AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test \
      aws --endpoint-url=http://localhost:4566 \
          dynamodb create-table \
          --table-name quantumbank-terraform-locks \
          --attribute-definitions AttributeName=LockID,AttributeType=S \
          --key-schema AttributeName=LockID,KeyType=HASH \
          --billing-mode PAY_PER_REQUEST \
          --region ap-south-1 2>/dev/null || echo "  DynamoDB table already exists"
    echo "✅ LocalStack setup complete!"
    ;;

  stop)
    echo "🛑 Stopping LocalStack..."
    docker compose -f "$COMPOSE_FILE" down
    echo "✅ LocalStack stopped"
    ;;

  status)
    echo "🔍 Checking LocalStack status..."
    curl -s http://localhost:4566/_localstack/health | python3 -m json.tool 2>/dev/null || \
      echo "❌ LocalStack is not running"
    ;;

  init)
    check_localstack
    echo "🔧 Initializing Terraform against LocalStack..."
    # Copy local backend override
    cp "$LOCAL_BACKEND" "$ENV_DIR/backend-override.tf"
    terraform -chdir="$ENV_DIR" init -reconfigure \
      -backend-config="access_key=test" \
      -backend-config="secret_key=test" \
      -backend-config="endpoint=http://localhost:4566" \
      -backend-config="skip_credentials_validation=true" \
      -backend-config="skip_metadata_api_check=true" \
      -backend-config="force_path_style=true"
    echo "✅ Terraform initialized against LocalStack"
    ;;

  plan)
    check_localstack
    echo "📋 Running Terraform plan against LocalStack..."
    terraform -chdir="$ENV_DIR" plan -out=local.tfplan
    ;;

  apply)
    check_localstack
    echo "⚡ Applying Terraform against LocalStack (FREE!)..."
    if [ -f "$ENV_DIR/local.tfplan" ]; then
      terraform -chdir="$ENV_DIR" apply "local.tfplan"
    else
      terraform -chdir="$ENV_DIR" apply -auto-approve
    fi
    echo "✅ Applied! All resources running in LocalStack (no AWS costs)"
    ;;

  destroy)
    check_localstack
    echo "💥 Destroying LocalStack resources..."
    terraform -chdir="$ENV_DIR" destroy -auto-approve
    echo "✅ All resources destroyed"
    ;;

  help|*)
    echo ""
    echo "QuantumBank Local Dev — Terraform + LocalStack"
    echo "================================================"
    echo "Usage: ./localrun.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start    — Start LocalStack container + create state bucket"
    echo "  stop     — Stop LocalStack container"
    echo "  status   — Check LocalStack health"
    echo "  init     — Initialize Terraform against LocalStack"
    echo "  plan     — Run terraform plan against LocalStack"
    echo "  apply    — Apply infrastructure (FREE — no AWS costs)"
    echo "  destroy  — Destroy all local resources"
    echo ""
    echo "For REAL AWS deployment (costs money):"
    echo "  terraform -chdir=environments/ap-south-1 apply ap-south-1.tfplan"
    echo ""
    ;;
esac
