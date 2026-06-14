# QuantumBank — Disaster Recovery Runbook

**Version:** 1.0  
**Last reviewed:** 2026-06-14  
**Owner:** Platform Engineering  
**RTO:** 30 minutes | **RPO:** 5 minutes

---

## How to use this runbook

Each scenario follows the same structure:

1. **Detect** — what triggers this scenario (alarm, alert, customer report)
2. **Assess** — how to confirm the scope within 5 minutes
3. **Contain** — immediate action to stop the bleeding
4. **Recover** — restore service to full health
5. **Validate** — confirm SLA is met before closing
6. **Post-mortem** — what to document within 24 hours

**On-call escalation path:**
```
L1: On-call engineer (PagerDuty → SNS → quantumbank-alerts-ap-south-1)
L2: Platform Engineering lead (+15 min if not ack'd)
L3: Engineering Director (+30 min if RTO is breached)
Regulatory: Compliance officer must be notified within 1 hour of any payment outage
```

---

## SCENARIO 1: Regional Service Outage (ECS Task Crash / OOM)

**Trigger:** `quantumbank-DR-RTO-BREACH-ap-south-1` alarm, or `quantumbank-payment-service-task-count-ap-south-1` alarm.

### Detect
- CloudWatch alarm fires → SNS → email/PagerDuty
- DR Runbook auto-triggers via EventBridge → SSM Automation

### Assess (< 5 minutes)
```bash
# Check ECS service health
aws ecs describe-services \
  --cluster quantumbank-ap-south-1 \
  --services quantumbank-payment-service-ap-south-1 \
  --query "services[0].{running:runningCount,desired:desiredCount,pending:pendingCount}"

# Check recent stopped tasks for crash reason
aws ecs list-tasks \
  --cluster quantumbank-ap-south-1 \
  --family quantumbank-payment-service-ap-south-1 \
  --desired-status STOPPED

# Check CloudWatch logs for OOM / error
aws logs filter-log-events \
  --log-group-name /quantumbank/ap-south-1/payment-service \
  --start-time $(date -d '30 minutes ago' +%s000) \
  --filter-pattern "ERROR"
```

### Contain (< 10 minutes)
ECS deployment circuit breaker and auto-restart handle this automatically.  
If tasks are stuck in `PENDING`:
```bash
# Force new deployment — replaces all tasks
aws ecs update-service \
  --cluster quantumbank-ap-south-1 \
  --service quantumbank-payment-service-ap-south-1 \
  --force-new-deployment
```

### Recover
ECS auto-scaling will restart tasks. In-flight transfers are queued by the payment service's degraded-mode logic and will reprocess on recovery.

If memory leak is confirmed:
```bash
# Roll back to previous task definition revision
PREV_REVISION=$(aws ecs describe-task-definition \
  --task-definition quantumbank-payment-service-ap-south-1 \
  --query "taskDefinition.revision" --output text)
PREV_REVISION=$((PREV_REVISION - 1))

aws ecs update-service \
  --cluster quantumbank-ap-south-1 \
  --service quantumbank-payment-service-ap-south-1 \
  --task-definition quantumbank-payment-service-ap-south-1:${PREV_REVISION}
```

### Validate
- All ECS services show `runningCount == desiredCount`
- ALB `HealthyHostCount` > 0 in CloudWatch
- No `TRANSFER_FAILED` spike in payment-service logs
- RTO alarm returns to `OK` state

**SLA:** Recovery within 30 minutes. Regulatory notification required if payment downtime > 1 hour.

---

## SCENARIO 2: Database Replication Failure (MongoDB / DocumentDB)

**Trigger:** `mongodb-exporter` alert, replication lag > 30s, or manual detection of write failures.

### Detect
- `quantumbank-payment-failure-rate-ap-south-1` alarm fires
- Payment transfers returning `status: queued` instead of `status: completed`
- MongoDB Atlas alert for replica set election

### Assess (< 5 minutes)
```bash
# Check payment failure rate in last 5 minutes
aws cloudwatch get-metric-statistics \
  --namespace "QuantumBank/ap-south-1/payment-service" \
  --metric-name PaymentFailureCount \
  --start-time $(date -d '10 minutes ago' -u +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 --statistics Sum

# Check compliance audit log for queued transfers
aws logs filter-log-events \
  --log-group-name /quantumbank/ap-south-1/payment-service \
  --filter-pattern "TRANSFER_QUEUED"
```

### Contain (< 5 minutes)
The payment service automatically enters `platformMode = 'degraded'` and queues transfers when the DB is unreachable.  
No manual action needed for containment — the queue is durable (written to SQS).

### Recover
**If Atlas primary is unreachable:** Atlas auto-elects a new primary. Monitor Atlas dashboard for election completion (typically < 30 seconds).

**If replication lag > 5 minutes (RPO risk):**
```bash
# Notify compliance officer — potential data loss window
aws sns publish \
  --topic-arn arn:aws:sns:ap-south-1:577137986953:quantumbank-alerts-ap-south-1 \
  --subject "COMPLIANCE ALERT: DB RPO Risk — QuantumBank ap-south-1" \
  --message "MongoDB replication lag has exceeded RPO threshold of 5 minutes. In-flight transactions may be at risk. Compliance review required."
```

**Process queued transfers after recovery:**
The scheduler service automatically detects `platformMode` returning to `normal` and processes the queue. Monitor `TRANSFER_QUEUED` → `completed` transitions in logs.

### Validate
- MongoDB Atlas shows all replicas healthy, replication lag < 5s
- `platformMode` returns to `normal` in application config
- Queued transfers processed: check `QB-REC-*` reference numbers in payment logs
- No open incidents after 15 minutes of stable operation

**SLA:** DB recovery within 15 minutes. Queued transfer processing within 30 minutes of recovery.

---

## SCENARIO 3: Payment Network / Rail Failure (NEFT / RTGS / IMPS / SWIFT)

**Trigger:** External payment rail returns errors, `TRANSFER_FAILED` spike in payment logs.

### Detect
- `quantumbank-payment-failure-rate-ap-south-1` alarm
- Customer complaints about failed transfers on specific rail

### Assess (< 10 minutes)
```bash
# Which rail is failing?
aws logs filter-log-events \
  --log-group-name /quantumbank/ap-south-1/payment-service \
  --filter-pattern "TRANSFER_FAILED" \
  --start-time $(date -d '30 minutes ago' +%s000) | \
  grep -o '"rail":"[^"]*"' | sort | uniq -c | sort -rn
```

### Contain
Payment rail failures are isolated per rail — other rails continue working. Customers can retry on an alternative rail:

| Failed Rail | Alternative | Impact |
|-------------|-------------|--------|
| NEFT        | IMPS        | Immediate settlement instead of batch |
| IMPS        | NEFT        | 2-4h settlement instead of instant |
| RTGS        | IMPS (< $2k) | Use IMPS for transfers below RTGS threshold |
| SWIFT       | No alternative | International transfers paused |

Publish status page update within 15 minutes of confirmed rail failure.

### Recover
Rail failures are external (RBI/NPCI/correspondent bank). Monitor official status:
- NEFT/RTGS/IMPS: https://www.rbi.org.in
- SWIFT: https://www.swift.com/network

Retry logic is built into `paymentService.ts` — automatic retries for transient failures.  
For extended outage (> 30 minutes): enable manual transfer queue drain in admin panel.

### Validate
- `successRate` returns to baseline for affected rail in payment logs
- `TRANSFER_FAILED` rate drops below threshold alarm
- Queued transfers on affected rail processed successfully

**SLA:** Notification within 15 minutes. Resolution dependent on rail provider. Customer communication required within 30 minutes.

---

## SCENARIO 4: Failed Deployment (Zero-Day / Health Check Failure)

**Trigger:** `argocd` / ECS deployment circuit breaker fires during a release.

### Detect
- ECS deployment circuit breaker triggers automatic rollback
- `quantumbank-{service}-task-count-ap-south-1` alarm fires
- New deployment shows `status: rolling_back` in platform dashboard

### Assess (< 2 minutes)
```bash
# Check deployment events
aws ecs describe-services \
  --cluster quantumbank-ap-south-1 \
  --services quantumbank-payment-service-ap-south-1 \
  --query "services[0].events[:5]"

# Check new task definition health check failure reason
aws ecs describe-tasks \
  --cluster quantumbank-ap-south-1 \
  --tasks $(aws ecs list-tasks \
    --cluster quantumbank-ap-south-1 \
    --desired-status STOPPED \
    --family quantumbank-payment-service-ap-south-1 \
    --query "taskArns[0]" --output text)
```

### Contain
ECS deployment circuit breaker + rollback handles this automatically.  
The `app-deploy.yml` pipeline waits for `services-stable` before marking success.

For a zero-day vulnerability requiring emergency rollback:
```bash
# Immediate rollback to last known good image
aws ecs update-service \
  --cluster quantumbank-ap-south-1 \
  --service quantumbank-payment-service-ap-south-1 \
  --task-definition quantumbank-payment-service-ap-south-1:PREV_REVISION \
  --force-new-deployment

# Tag the vulnerable image as quarantined in ECR
aws ecr put-image-tag-mutability \
  --repository-name quantumbank/payment-service \
  --image-tag-mutability MUTABLE

# Retag bad image to quarantine it
aws ecr batch-delete-image \
  --repository-name quantumbank/payment-service \
  --image-ids imageTag=$BAD_SHA
```

### Recover
1. Fix the failing health check or vulnerability in a new branch
2. Run security scan pipeline (`.github/workflows/security-scan.yml`) on the fix
3. Get explicit approval from a second engineer before re-deploying
4. Deploy using `app-deploy.yml` — monitor `Verify Service Stability Health Check` step

### Validate
- All services show `status: running` (not `rolling_back` or `failed`)
- No health check failures in CloudWatch for 10 minutes after deploy
- Trivy scan on new image shows no new CRITICAL CVEs

**SLA:** Rollback within 3 minutes (ECS auto-rollback). Patched re-deploy within 4 hours for critical CVE.

---

## SCENARIO 5: Zero-Day Security Vulnerability Mid-Deployment

**Trigger:** Security researcher disclosure, Trivy/Semgrep scan finding CRITICAL severity, or AWS GuardDuty alert.

### Immediate Actions (within 15 minutes)

1. **Stop all deployments:** Cancel any in-progress pipelines
   ```bash
   # Disable deployment workflows via GitHub API
   gh workflow disable app-deploy.yml
   ```

2. **Isolate affected service:**
   ```bash
   # Scale down vulnerable service (keep 1 instance for investigation)
   aws ecs update-service \
     --cluster quantumbank-ap-south-1 \
     --service quantumbank-{affected-service}-ap-south-1 \
     --desired-count 1
   ```

3. **Rotate secrets immediately** if credential exposure is suspected:
   ```bash
   aws secretsmanager rotate-secret \
     --secret-id quantumbank/{service}/db-password
   ```

4. **Notify compliance officer** — regulatory disclosure may be required within 72 hours (GDPR/RBI guidelines)

### Investigation
- Check CloudTrail for unauthorized API calls in the 24 hours before detection
- Check X-Ray service map for unusual inter-service communication patterns
- Review `quantumbank-unauthorized-api-calls-ap-south-1` CloudWatch alarm history

### Recovery
1. Apply patch in isolated branch
2. Full security scan: `gh workflow run security-scan.yml`
3. Manual review by security lead
4. Staged rollout: deploy to non-critical services first
5. Monitor for 30 minutes before full rollout

**SLA:** Containment within 1 hour. Patch deployed within 4 hours for CRITICAL. Regulatory notification within 72 hours if customer data was accessed.

---

## Chaos Engineering Schedule

| Week | Experiment | Scope | Responsible |
|------|-----------|-------|-------------|
| 1 | EXP-1: Task Termination | payment-service (30% tasks) | Platform Engineering |
| 2 | EXP-3: Multi-Service Stop | notification + analytics | Platform Engineering |
| 3 | EXP-2: CPU Stress | api-gateway | Platform Engineering |
| Monthly | EXP-4: Full Cluster Drain | api-gateway (requires multi-region) | Engineering Director approval |

**How to run a chaos experiment:**
1. Go to GitHub Actions → "Chaos Engineering & DR Validation"
2. Click "Run workflow"
3. Select experiment and type `CONFIRM` in the confirmation field
4. Monitor results in the workflow summary and CloudWatch

**FIS experiment logs:**  
CloudWatch → Log Groups → `/aws/fis/quantumbank-ap-south-1`

**DR Runbook (automated):**  
AWS Systems Manager → Documents → `QuantumBank-DR-Runbook-ap-south-1`

---

## SLA Reference

| Scenario | RTO | RPO | Regulatory Notification |
|----------|-----|-----|------------------------|
| ECS Task Crash | 30 min | N/A | > 1 hour payment downtime |
| DB Replication Failure | 15 min | 5 min | > 30 min data risk |
| Payment Rail Failure | External | N/A | Within 30 min |
| Failed Deployment | 3 min (auto) | N/A | None (auto-rollback) |
| Zero-Day Security | 1 hour contain, 4 hour patch | N/A | Within 72 hours (GDPR) |
| Full Regional Outage | 60 sec DNS failover | 5 min | Within 30 min |
