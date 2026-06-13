import type { AccountTier, PaymentLimits, RailConfig } from '../types/payments';

export const COOLING_PERIOD_MS = 4 * 60 * 60 * 1000;
export const RTGS_THRESHOLD = 2000;
export const DEMO_PIN = '1234';

export const TIER_LIMITS: Record<AccountTier, PaymentLimits> = {
  standard: { tier: 'standard', dailyLimit: 10000, perTransactionLimit: 5000, externalDailyLimit: 5000 },
  premium: { tier: 'premium', dailyLimit: 50000, perTransactionLimit: 25000, externalDailyLimit: 25000 },
  platinum: { tier: 'platinum', dailyLimit: 200000, perTransactionLimit: 100000, externalDailyLimit: 100000 },
};

export const DEFAULT_USER_TIER: AccountTier = 'premium';

export const RAIL_CONFIGS: RailConfig[] = [
  {
    rail: 'neft',
    label: 'NEFT',
    description: 'Batch-processed transfers with standard settlement windows',
    settlementWindow: '2–4 hours (batch cycles at 11AM, 2PM, 5PM)',
    minAmount: 1,
    maxAmount: 500000,
    successRate: 0.95,
    available247: false,
  },
  {
    rail: 'rtgs',
    label: 'RTGS',
    description: 'Real-time gross settlement for high-value transfers',
    settlementWindow: 'Immediate (real-time)',
    minAmount: RTGS_THRESHOLD,
    maxAmount: 1000000,
    successRate: 0.98,
    available247: true,
    rtgsThreshold: RTGS_THRESHOLD,
  },
  {
    rail: 'imps',
    label: 'IMPS',
    description: 'Instant payment service — 24/7 availability',
    settlementWindow: 'Immediate (< 30 seconds)',
    minAmount: 1,
    maxAmount: 500000,
    successRate: 0.97,
    available247: true,
  },
  {
    rail: 'swift',
    label: 'SWIFT Wire',
    description: 'International wire via correspondent bank routing',
    settlementWindow: '1–3 business days',
    minAmount: 100,
    maxAmount: 5000000,
    successRate: 0.90,
    available247: false,
  },
];

export let chaosMode = false;
export let platformMode: 'normal' | 'degraded' = 'normal';

export function setChaosMode(enabled: boolean) {
  chaosMode = enabled;
}

export function setPlatformMode(mode: 'normal' | 'degraded') {
  platformMode = mode;
}

export function getEffectiveSuccessRate(baseRate: number): number {
  return chaosMode ? baseRate * 0.4 : baseRate;
}

export function generateReferenceNumber(prefix = 'QB-PAY'): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function simulateEncryption(data: string): string {
  return `enc:${btoa(data).slice(0, 20)}...`;
}
