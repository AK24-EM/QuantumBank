import type { ChaosActionLog, ChaosScenario, Incident } from '../types/platform';
import {
  setRegionOverride, clearRegionOverride, updateDeploymentStatus, DEPLOYMENTS,
} from './platformService';
import { setPlatformMode, setChaosMode } from '../config/paymentConfig';

let incidentCounter = 0;
let chaosCounter = 0;

export type ChaosCallbacks = {
  onIncident: (incident: Incident) => void;
  onIncidentUpdate: (id: string, updates: Partial<Incident>) => void;
  onChaosLog: (log: ChaosActionLog) => void;
  onDeploymentChange: () => void;
};

let callbacks: ChaosCallbacks | null = null;

export function registerChaosCallbacks(cb: ChaosCallbacks) {
  callbacks = cb;
}

function createIncident(partial: Omit<Incident, 'id' | 'firedAt' | 'status'>): Incident {
  return {
    ...partial,
    id: `INC-${++incidentCounter}-${Date.now().toString(36).toUpperCase()}`,
    firedAt: new Date().toISOString(),
    status: 'firing',
  };
}

function createChaosLog(
  scenario: ChaosScenario,
  triggeredBy: string,
  parameters: Record<string, string>,
  systemResponse: string,
): ChaosActionLog {
  return {
    id: `CHAOS-${++chaosCounter}-${Date.now().toString(36).toUpperCase()}`,
    scenario,
    triggeredBy,
    triggeredAt: new Date().toISOString(),
    parameters,
    systemResponse,
    status: 'running',
  };
}

export async function triggerChaosScenario(
  scenario: ChaosScenario,
  triggeredBy: string,
  params: Record<string, string> = {},
): Promise<ChaosActionLog> {
  switch (scenario) {
    case 'pod_crash':
      return triggerPodCrash(triggeredBy, params.region ?? 'us-east-1');
    case 'network_latency':
      return triggerNetworkLatency(triggeredBy, params);
    case 'db_replication_failure':
      return triggerDbReplicationFailure(triggeredBy, params.region ?? 'us-east-1');
    case 'failed_deployment':
      return triggerFailedDeployment(triggeredBy, params.service ?? 'payment-service');
    default:
      throw new Error(`Unknown scenario: ${scenario}`);
  }
}

async function triggerPodCrash(triggeredBy: string, regionId: string): Promise<ChaosActionLog> {
  const log = createChaosLog('pod_crash', triggeredBy, { region: regionId },
    `CrashLoopBackOff detected in ${regionId}. Kubernetes restarting pods...`);

  callbacks?.onChaosLog(log);

  setRegionOverride(regionId, { status: 'degraded', activePods: 8, cpuUsage: 91 });

  const incident = createIncident({
    title: `Pod Crash — ${regionId}`,
    severity: 'warning',
    affectedRegions: [regionId],
    alertSource: 'kube-state-metrics',
    description: `Multiple pods in CrashLoopBackOff state. Auto-restart initiated.`,
  });
  callbacks?.onIncident(incident);

  await delay(3000);
  setRegionOverride(regionId, { status: 'recovering', activePods: 32 });
  callbacks?.onIncidentUpdate(incident.id, { status: 'investigating' });

  await delay(4000);
  clearRegionOverride(regionId);
  callbacks?.onIncidentUpdate(incident.id, {
    status: 'resolved',
    resolvedAt: new Date().toISOString(),
    rootCause: 'OOM kill due to memory leak in payment-service v3.8.0 sidecar',
    impactDurationMin: 7,
  });

  log.status = 'completed';
  log.systemResponse = `Pods recovered in ${regionId}. All replicas healthy. 7 min impact.`;
  callbacks?.onChaosLog({ ...log });

  return log;
}

async function triggerNetworkLatency(triggeredBy: string, params: Record<string, string>): Promise<ChaosActionLog> {
  const latencyMs = params.latencyMs ?? '800';
  const regionId = params.region ?? 'eu-west-1';

  const log = createChaosLog('network_latency', triggeredBy, { region: regionId, latencyMs },
    `Injecting ${latencyMs}ms latency between services in ${regionId}`);

  callbacks?.onChaosLog(log);
  setChaosMode(true);
  setRegionOverride(regionId, { status: 'degraded', latencyMs: parseInt(latencyMs) });

  const incident = createIncident({
    title: `Elevated Latency — ${regionId}`,
    severity: 'warning',
    affectedRegions: [regionId],
    alertSource: 'prometheus/alertmanager',
    description: `P99 latency exceeded 500ms threshold. Current: ${latencyMs}ms`,
  });
  callbacks?.onIncident(incident);

  await delay(5000);
  setChaosMode(false);
  clearRegionOverride(regionId);
  callbacks?.onIncidentUpdate(incident.id, {
    status: 'resolved',
    resolvedAt: new Date().toISOString(),
    rootCause: 'Chaos engineering: network latency injection test completed',
    impactDurationMin: 5,
  });

  log.status = 'completed';
  log.systemResponse = `Latency injection cleared. P99 returned to baseline.`;
  callbacks?.onChaosLog({ ...log });

  return log;
}

async function triggerDbReplicationFailure(triggeredBy: string, regionId: string): Promise<ChaosActionLog> {
  const log = createChaosLog('db_replication_failure', triggeredBy, { region: regionId },
    `MongoDB replica set lag detected in ${regionId}. Failing over to secondary region.`);

  callbacks?.onChaosLog(log);
  setPlatformMode('degraded');
  setRegionOverride(regionId, { status: 'outage', activePods: 0, latencyMs: 0 });

  const incident = createIncident({
    title: `Regional Outage — ${regionId}`,
    severity: 'critical',
    affectedRegions: [regionId],
    alertSource: 'mongodb-exporter',
    description: `Primary replica unreachable. Replication lag > 30s. Traffic rerouting initiated.`,
  });
  callbacks?.onIncident(incident);

  await delay(2000);
  callbacks?.onIncidentUpdate(incident.id, {
    status: 'investigating',
    description: `Traffic rerouted to us-west-2. Payment transfers queued in affected region.`,
  });

  await delay(6000);
  setRegionOverride(regionId, { status: 'recovering', activePods: 20 });
  callbacks?.onIncidentUpdate(incident.id, { status: 'investigating' });

  await delay(5000);
  setPlatformMode('normal');
  clearRegionOverride(regionId);
  callbacks?.onIncidentUpdate(incident.id, {
    status: 'resolved',
    resolvedAt: new Date().toISOString(),
    rootCause: 'Network partition between primary and secondary MongoDB nodes. Automatic failover succeeded.',
    impactDurationMin: 13,
  });

  log.status = 'completed';
  log.systemResponse = `Region ${regionId} recovered. Replication healthy. Total impact: 13 minutes.`;
  callbacks?.onChaosLog({ ...log });

  return log;
}

async function triggerFailedDeployment(triggeredBy: string, serviceName: string): Promise<ChaosActionLog> {
  const dep = DEPLOYMENTS.find((d) => d.service === serviceName);
  const prevVersion = dep?.version ?? 'v0.0.0';

  const log = createChaosLog('failed_deployment', triggeredBy, { service: serviceName },
    `Deploying ${serviceName} vNEXT — health checks monitoring...`);

  callbacks?.onChaosLog(log);

  if (dep) {
    updateDeploymentStatus(dep.id, 'running', 'vNEXT-failed');
    callbacks?.onDeploymentChange();
  }

  await delay(2000);

  const incident = createIncident({
    title: `Deployment Failure — ${serviceName}`,
    severity: 'critical',
    affectedRegions: ['all'],
    alertSource: 'argocd',
    description: `Health check failures after deploy. Initiating automated rollback to ${prevVersion}.`,
  });
  callbacks?.onIncident(incident);

  if (dep) updateDeploymentStatus(dep.id, 'rolling_back', prevVersion);
  callbacks?.onDeploymentChange();

  await delay(3000);

  if (dep) updateDeploymentStatus(dep.id, 'running', prevVersion);
  callbacks?.onDeploymentChange();

  callbacks?.onIncidentUpdate(incident.id, {
    status: 'resolved',
    resolvedAt: new Date().toISOString(),
    rootCause: 'New container failed readiness probe. Automated rollback to previous stable version.',
    impactDurationMin: 3,
  });

  log.status = 'rolled_back';
  log.systemResponse = `Rollback to ${prevVersion} completed in 3 minutes. Zero customer-facing downtime.`;
  callbacks?.onChaosLog({ ...log });

  return log;
}

const SEED_INCIDENTS: Incident[] = [
  {
    id: 'INC-SEED-1',
    title: 'Elevated API Latency — ap-south-1',
    severity: 'warning',
    status: 'resolved',
    firedAt: '2026-06-11T03:22:00Z',
    resolvedAt: '2026-06-11T03:41:00Z',
    rootCause: 'Redis cache eviction storm during analytics batch job',
    impactDurationMin: 19,
    affectedRegions: ['ap-south-1'],
    alertSource: 'prometheus/alertmanager',
    description: 'P99 API latency exceeded 400ms for 19 minutes.',
  },
  {
    id: 'INC-SEED-2',
    title: 'Certificate Renewal — eu-west-1',
    severity: 'info',
    status: 'resolved',
    firedAt: '2026-06-10T22:00:00Z',
    resolvedAt: '2026-06-10T22:04:00Z',
    rootCause: 'Scheduled TLS certificate rotation — no impact',
    impactDurationMin: 0,
    affectedRegions: ['eu-west-1'],
    alertSource: 'cert-manager',
    description: 'Automated certificate renewal completed successfully.',
  },
];

export function getSeedIncidents(): Incident[] {
  return [...SEED_INCIDENTS];
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
