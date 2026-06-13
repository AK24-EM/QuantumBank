import type { CloudRegion, PlatformMetrics, ServiceDeployment } from '../types/platform';

const BASE_REGIONS: Omit<CloudRegion, 'latencyMs' | 'activePods' | 'cpuUsage' | 'memoryUsage' | 'status'>[] = [
  { id: 'us-east-1', code: 'USE1', name: 'US East', location: 'N. Virginia', mapX: 22, mapY: 38, totalPods: 48 },
  { id: 'us-west-2', code: 'USW2', name: 'US West', location: 'Oregon', mapX: 12, mapY: 35, totalPods: 36 },
  { id: 'eu-west-1', code: 'EUW1', name: 'EU West', location: 'Ireland', mapX: 46, mapY: 28, totalPods: 32 },
  { id: 'ap-south-1', code: 'APS1', name: 'Asia Pacific', location: 'Mumbai', mapX: 72, mapY: 48, totalPods: 28 },
  { id: 'ap-southeast-1', code: 'APS2', name: 'Asia SE', location: 'Singapore', mapX: 78, mapY: 55, totalPods: 24 },
];

let regionOverrides: Record<string, Partial<CloudRegion>> = {};

export function setRegionOverride(regionId: string, override: Partial<CloudRegion>) {
  regionOverrides[regionId] = { ...regionOverrides[regionId], ...override };
}

export function clearRegionOverride(regionId: string) {
  delete regionOverrides[regionId];
}

export function clearAllRegionOverrides() {
  regionOverrides = {};
}

function jitter(base: number, range: number) {
  return Math.round(base + (Math.random() - 0.5) * range);
}

export async function fetchPlatformMetrics(): Promise<PlatformMetrics> {
  await delay(80 + Math.random() * 120);

  const regions: CloudRegion[] = BASE_REGIONS.map((base) => {
    const override = regionOverrides[base.id] ?? {};
    const baseLatency = base.id === 'us-east-1' ? 28 : base.id === 'us-west-2' ? 65 : base.id === 'eu-west-1' ? 142 : 198;
    const status = override.status ?? 'healthy';
    const latencyMultiplier = status === 'outage' ? 0 : status === 'degraded' ? 2.5 : status === 'recovering' ? 1.5 : 1;

    return {
      ...base,
      status,
      latencyMs: override.latencyMs ?? jitter(baseLatency * latencyMultiplier, 20),
      activePods: override.activePods ?? (status === 'outage' ? 0 : status === 'degraded' ? Math.floor(base.totalPods * 0.4) : base.totalPods - Math.floor(Math.random() * 3)),
      cpuUsage: override.cpuUsage ?? jitter(status === 'degraded' ? 78 : 42, 15),
      memoryUsage: override.memoryUsage ?? jitter(status === 'degraded' ? 72 : 55, 12),
      ...override,
    };
  });

  const healthyRegions = regions.filter((r) => r.status === 'healthy').length;
  const activeRegions = regions.filter((r) => r.status !== 'outage');
  const avgLatencyMs = activeRegions.length
    ? Math.round(activeRegions.reduce((s, r) => s + r.latencyMs, 0) / activeRegions.length)
    : 0;

  return {
    regions,
    totalPods: regions.reduce((s, r) => s + r.activePods, 0),
    healthyRegions,
    avgLatencyMs,
    fetchedAt: new Date().toISOString(),
    source: 'prometheus+k8s',
  };
}

export const DEPLOYMENTS: ServiceDeployment[] = [
  {
    id: 'dep-1', service: 'api-gateway', version: 'v2.14.3', deployedAt: '2026-06-12T14:32:00Z',
    engineer: 'Sarah Chen', commitSha: 'a3f8c21', commitMessage: 'feat: add rate limiting middleware',
    commitUrl: 'https://github.com/quantumbank/platform/commit/a3f8c21', status: 'running', region: 'all',
  },
  {
    id: 'dep-2', service: 'payment-service', version: 'v3.8.1', deployedAt: '2026-06-12T11:15:00Z',
    engineer: 'Marcus Webb', commitSha: '7b2e9d4', commitMessage: 'fix: atomic transfer rollback handling',
    commitUrl: 'https://github.com/quantumbank/platform/commit/7b2e9d4', status: 'running', region: 'all',
  },
  {
    id: 'dep-3', service: 'auth-service', version: 'v1.22.0', deployedAt: '2026-06-11T09:48:00Z',
    engineer: 'Priya Sharma', commitSha: 'f1a0b33', commitMessage: 'feat: biometric auth token refresh',
    commitUrl: 'https://github.com/quantumbank/platform/commit/f1a0b33', status: 'running', region: 'all',
  },
  {
    id: 'dep-4', service: 'notification-service', version: 'v1.9.4', deployedAt: '2026-06-10T16:20:00Z',
    engineer: 'James Okafor', commitSha: 'c9d4e12', commitMessage: 'chore: upgrade kafka consumer group',
    commitUrl: 'https://github.com/quantumbank/platform/commit/c9d4e12', status: 'running', region: 'all',
  },
  {
    id: 'dep-5', service: 'analytics-worker', version: 'v2.3.0', deployedAt: '2026-06-09T08:05:00Z',
    engineer: 'Sarah Chen', commitSha: 'e8f712a', commitMessage: 'perf: redis cache warming on startup',
    commitUrl: 'https://github.com/quantumbank/platform/commit/e8f712a', status: 'running', region: 'all',
  },
  {
    id: 'dep-6', service: 'statement-generator', version: 'v1.5.2', deployedAt: '2026-06-08T13:44:00Z',
    engineer: 'Marcus Webb', commitSha: 'b2c7f89', commitMessage: 'feat: digital signature for PDF statements',
    commitUrl: 'https://github.com/quantumbank/platform/commit/b2c7f89', status: 'running', region: 'all',
  },
];

export function getDeployments(): ServiceDeployment[] {
  return [...DEPLOYMENTS];
}

export function updateDeploymentStatus(serviceId: string, status: ServiceDeployment['status'], version?: string) {
  const dep = DEPLOYMENTS.find((d) => d.id === serviceId);
  if (dep) {
    dep.status = status;
    if (version) dep.version = version;
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
