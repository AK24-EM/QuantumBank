# QuantumBank Layer 1 — Infrastructure Foundation HCL

Production-grade active-active multi-region infrastructure IaC using Terraform on AWS.

## Architecture

This repository provisions:
1. **Multi-Region VPCs** (`us-east-1`, `eu-west-1`, `ap-south-1`) with high-availability layouts (3 public + 3 private subnets, 3 NAT Gateways per region, and VPC Flow Logs).
2. **Three-Tier Security Group Isolation** (ALB accepts HTTPS, ECS Fargate tasks accept from ALB only, Databases accept from ECS only).
3. **IAM Roles & Boundary Policies** (least-privilege runtime + OIDC deployment role for GitHub Actions).
4. **Regional ALBs** with HTTPS certificate validation, TLS 1.3 configuration, and Access logs to S3.
5. **ECS Fargate Clusters** running 6 microservices (`api-gateway`, `payment-service`, `auth-service`, `notification-service`, `analytics-worker`, and `statement-generator`) with Auto Scaling, Distributed X-Ray Tracing, and Service Connect.
6. **Route 53 Global DNS** with latency-based routing, health checks, and active-active automatic failover routing.

---

## Deployment Playbook

Ensure you have your AWS credentials configured and Terraform version `1.8.x` installed.

### Step 1: Bootstrap Remote State
We must create the central S3 state bucket and DynamoDB locking table first.
```bash
cd bootstrap
terraform init
terraform apply
```
This outputs the S3 bucket name. Use it to update the backend configs in each environment.

### Step 2: Provision Regional Environments (Region A, B, and C)
Configure environments. These can be run in parallel:

```bash
# Region A (US East)
cd ../environments/us-east-1
terraform init
terraform apply

# Region B (Europe West)
cd ../environments/eu-west-1
terraform init
terraform apply

# Region C (Asia Pacific)
cd ../environments/ap-south-1
terraform init
terraform apply
```

### Step 3: Global Latency Routing DNS
Once regional ALBs are provisioned, apply global Route 53 latency records:
```bash
cd ../global
terraform init
terraform apply
```

---

## Disaster Recovery Failover Validation (RTO <30s)

If a region suffers a catastrophic event (e.g. database replica replication lag or pod crash loops):
1. Route 53 health check (testing `/health` via HTTPS on port 443 every 30s) will fail after 2 consecutive checks.
2. Route 53 automatically stops sending DNS queries for `api.quantumbank.com` to the unhealthy region's ALB.
3. Traffic is seamlessly absorbed by the surviving active regions based on the nearest latency location.
