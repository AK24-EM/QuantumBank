export type RegionStatus = 'healthy' | 'degraded' | 'outage' | 'recovering';
export type IncidentSeverity = 'critical' | 'warning' | 'info';
export type IncidentStatus = 'firing' | 'resolved' | 'investigating';
export type PlatformTab = 'health' | 'deployments' | 'incidents' | 'chaos' | 'infrastructure';

export interface TerraformModule {
  name: string;
  path: string;
  resources: number;
  status: 'applied' | 'pending' | 'drift';
  lastApplied: string;
}

export interface TerraformState {
  workspace: string;
  backend: string;
  bucket: string;
  dynamoTable: string;
  totalResources: number;
  lastRun: string;
  modules: TerraformModule[];
}

export type ChaosScenario =
  | 'pod_crash'
  | 'network_latency'
  | 'db_replication_failure'
  | 'failed_deployment';

export interface CloudRegion {
  id: string;
  code: string;
  name: string;
  location: string;
  status: RegionStatus;
  latencyMs: number;
  activePods: number;
  totalPods: number;
  cpuUsage: number;
  memoryUsage: number;
  mapX: number;
  mapY: number;
}

export interface ServiceDeployment {
  id: string;
  service: string;
  version: string;
  deployedAt: string;
  engineer: string;
  commitSha: string;
  commitMessage: string;
  commitUrl: string;
  status: 'running' | 'rolling_back' | 'failed';
  region: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  firedAt: string;
  resolvedAt?: string;
  rootCause?: string;
  impactDurationMin?: number;
  affectedRegions: string[];
  alertSource: string;
  description: string;
}

export interface ChaosActionLog {
  id: string;
  scenario: ChaosScenario;
  triggeredBy: string;
  triggeredAt: string;
  parameters: Record<string, string>;
  systemResponse: string;
  status: 'running' | 'completed' | 'rolled_back';
}

export interface PlatformMetrics {
  regions: CloudRegion[];
  totalPods: number;
  healthyRegions: number;
  avgLatencyMs: number;
  fetchedAt: string;
  source: 'prometheus+k8s';
}
