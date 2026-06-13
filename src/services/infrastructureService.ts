import type { TerraformState } from '../types/platform';

const MOCK_STATE: Record<string, TerraformState> = {
  'us-east-1': {
    workspace: 'production',
    backend: 's3 (us-east-1)',
    bucket: 'quantumbank-tf-state-123456789012',
    dynamoTable: 'quantumbank-tf-locks',
    totalResources: 82,
    lastRun: '2026-06-12T14:45:00Z',
    modules: [
      { name: 'vpc', path: 'modules/vpc', resources: 24, status: 'applied', lastApplied: '2026-06-12T14:45:00Z' },
      { name: 'security_groups', path: 'modules/security-groups', resources: 12, status: 'applied', lastApplied: '2026-06-12T14:45:00Z' },
      { name: 'iam', path: 'modules/iam', resources: 8, status: 'applied', lastApplied: '2026-06-12T14:45:00Z' },
      { name: 'alb', path: 'modules/alb', resources: 10, status: 'applied', lastApplied: '2026-06-12T14:45:00Z' },
      { name: 'ecs_cluster', path: 'modules/ecs-cluster', resources: 22, status: 'applied', lastApplied: '2026-06-12T14:45:00Z' },
      { name: 'route53_global', path: 'modules/route53', resources: 6, status: 'applied', lastApplied: '2026-06-12T14:45:00Z' }
    ]
  },
  'eu-west-1': {
    workspace: 'production',
    backend: 's3 (us-east-1)',
    bucket: 'quantumbank-tf-state-123456789012',
    dynamoTable: 'quantumbank-tf-locks',
    totalResources: 76,
    lastRun: '2026-06-12T15:02:00Z',
    modules: [
      { name: 'vpc', path: 'modules/vpc', resources: 24, status: 'applied', lastApplied: '2026-06-12T15:02:00Z' },
      { name: 'security_groups', path: 'modules/security-groups', resources: 12, status: 'applied', lastApplied: '2026-06-12T15:02:00Z' },
      { name: 'iam', path: 'modules/iam', resources: 8, status: 'applied', lastApplied: '2026-06-12T15:02:00Z' },
      { name: 'alb', path: 'modules/alb', resources: 10, status: 'applied', lastApplied: '2026-06-12T15:02:00Z' },
      { name: 'ecs_cluster', path: 'modules/ecs-cluster', resources: 22, status: 'applied', lastApplied: '2026-06-12T15:02:00Z' }
    ]
  },
  'ap-south-1': {
    workspace: 'production',
    backend: 's3 (us-east-1)',
    bucket: 'quantumbank-tf-state-123456789012',
    dynamoTable: 'quantumbank-tf-locks',
    totalResources: 76,
    lastRun: '2026-06-12T15:15:00Z',
    modules: [
      { name: 'vpc', path: 'modules/vpc', resources: 24, status: 'applied', lastApplied: '2026-06-12T15:15:00Z' },
      { name: 'security_groups', path: 'modules/security-groups', resources: 12, status: 'applied', lastApplied: '2026-06-12T15:15:00Z' },
      { name: 'iam', path: 'modules/iam', resources: 8, status: 'applied', lastApplied: '2026-06-12T15:15:00Z' },
      { name: 'alb', path: 'modules/alb', resources: 10, status: 'applied', lastApplied: '2026-06-12T15:15:00Z' },
      { name: 'ecs_cluster', path: 'modules/ecs-cluster', resources: 22, status: 'applied', lastApplied: '2026-06-12T15:15:00Z' }
    ]
  }
};

export async function fetchTerraformState(regionId: string): Promise<TerraformState | null> {
  await new Promise((resolve) => setTimeout(resolve, 300)); // Simulating network latency
  return MOCK_STATE[regionId] || null;
}
