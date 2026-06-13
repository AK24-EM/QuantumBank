import type {
  Beneficiary, ExternalTransferRequest, InternalTransferRequest,
  PaymentResult, QueuedTransfer, TransferStatus,
} from '../types/payments';
import type { Account } from '../types';
import {
  COOLING_PERIOD_MS, DEFAULT_USER_TIER, DEMO_PIN, TIER_LIMITS,
  generateReferenceNumber, getEffectiveSuccessRate, platformMode,
  RAIL_CONFIGS, RTGS_THRESHOLD, simulateEncryption,
} from '../config/paymentConfig';
import { logComplianceEvent } from './complianceService';

export interface PaymentContext {
  accounts: Account[];
  dailyUsage: { internalTotal: number; externalTotal: number };
  tier?: typeof DEFAULT_USER_TIER;
}

function getTransferableAccounts(accounts: Account[]) {
  return accounts.filter((a) => !a.isLiability && a.status === 'active');
}

function validatePin(pin: string): boolean {
  return pin === DEMO_PIN;
}

function validateLimits(
  amount: number,
  ctx: PaymentContext,
  isExternal: boolean,
): { valid: boolean; error?: string } {
  const tier = ctx.tier ?? DEFAULT_USER_TIER;
  const limits = TIER_LIMITS[tier];

  if (amount > limits.perTransactionLimit) {
    return { valid: false, error: `Amount exceeds per-transaction limit of $${limits.perTransactionLimit.toLocaleString()}` };
  }

  const dailyTotal = isExternal
    ? ctx.dailyUsage.externalTotal + amount
    : ctx.dailyUsage.internalTotal + amount;
  const dailyLimit = isExternal ? limits.externalDailyLimit : limits.dailyLimit;

  if (dailyTotal > dailyLimit) {
    return { valid: false, error: `Transfer would exceed daily limit of $${dailyLimit.toLocaleString()}` };
  }

  return { valid: true };
}

function simulateRailOutcome(rail: typeof RAIL_CONFIGS[0]['rail']): { success: boolean; settlementEta?: string } {
  const config = RAIL_CONFIGS.find((r) => r.rail === rail)!;
  const success = Math.random() < getEffectiveSuccessRate(config.successRate);
  return {
    success,
    settlementEta: config.settlementWindow,
  };
}

export async function processInternalTransfer(
  req: InternalTransferRequest,
  ctx: PaymentContext,
): Promise<{ result: PaymentResult; queuedTransfer?: QueuedTransfer }> {
  const start = performance.now();
  await delay(300 + Math.random() * 400);

  if (!validatePin(req.pin)) {
    return { result: { success: false, status: 'failed', message: 'Invalid transaction PIN' } };
  }

  const transferable = getTransferableAccounts(ctx.accounts);
  const from = transferable.find((a) => a.id === req.fromAccountId);
  const to = transferable.find((a) => a.id === req.toAccountId);

  if (!from || !to) {
    return { result: { success: false, status: 'failed', message: 'Invalid source or destination account' } };
  }
  if (from.id === to.id) {
    return { result: { success: false, status: 'failed', message: 'Source and destination must differ' } };
  }
  if (from.balance < req.amount) {
    return { result: { success: false, status: 'failed', message: 'Insufficient balance' } };
  }

  const limitCheck = validateLimits(req.amount, ctx, false);
  if (!limitCheck.valid) {
    return { result: { success: false, status: 'failed', message: limitCheck.error! } };
  }

  const ref = generateReferenceNumber('QB-INT');
  const latency = Math.round(performance.now() - start);

  if (platformMode === 'degraded') {
    const queued: QueuedTransfer = {
      id: `q-${Date.now()}`,
      type: 'internal',
      amount: req.amount,
      fromAccountId: req.fromAccountId,
      toLabel: to.name,
      referenceNote: req.referenceNote,
      queuedAt: new Date().toISOString(),
      status: 'queued',
    };
    logComplianceEvent('TRANSFER_QUEUED', 'Internal transfer queued due to degraded regional mode', {
      reference: ref, amount: String(req.amount), region: 'us-east-1',
    });
    return {
      result: {
        success: true,
        referenceNumber: ref,
        status: 'queued',
        message: 'Transfer queued — platform is in degraded mode. Will process automatically on recovery.',
        queued: true,
        processingRegion: 'us-east-1',
        apiLatencyMs: latency,
      },
      queuedTransfer: queued,
    };
  }

  logComplianceEvent('INTERNAL_TRANSFER', 'Atomic internal transfer completed', {
    reference: ref, amount: String(req.amount), from: from.accountNumber, to: to.accountNumber,
  });

  return {
    result: {
      success: true,
      referenceNumber: ref,
      status: 'completed',
      message: `Transfer of $${req.amount.toLocaleString()} completed instantly`,
      processingRegion: 'us-east-1',
      apiLatencyMs: latency,
      complianceEventId: ref,
    },
  };
}

export async function processExternalTransfer(
  req: ExternalTransferRequest,
  beneficiary: Beneficiary,
  ctx: PaymentContext,
): Promise<{ result: PaymentResult; queuedTransfer?: QueuedTransfer }> {
  const start = performance.now();
  await delay(500 + Math.random() * 800);

  if (!validatePin(req.pin)) {
    return { result: { success: false, status: 'failed', message: 'Invalid transaction PIN' } };
  }

  const now = Date.now();
  if (new Date(beneficiary.coolingUntil).getTime() > now) {
    const remaining = Math.ceil((new Date(beneficiary.coolingUntil).getTime() - now) / 60000);
    logComplianceEvent('COOLING_PERIOD_BLOCK', 'Transfer blocked — beneficiary in cooling period', {
      beneficiaryId: beneficiary.id, remainingMinutes: String(remaining),
    });
    return {
      result: {
        success: false,
        status: 'failed',
        message: `Beneficiary in mandatory 4-hour cooling period. ${remaining} minutes remaining.`,
      },
    };
  }

  const from = getTransferableAccounts(ctx.accounts).find((a) => a.id === req.fromAccountId);
  if (!from) return { result: { success: false, status: 'failed', message: 'Invalid source account' } };
  if (from.balance < req.amount) {
    return { result: { success: false, status: 'failed', message: 'Insufficient balance' } };
  }

  const limitCheck = validateLimits(req.amount, ctx, true);
  if (!limitCheck.valid) {
    return { result: { success: false, status: 'failed', message: limitCheck.error! } };
  }

  const railConfig = RAIL_CONFIGS.find((r) => r.rail === req.rail)!;
  if (req.amount < railConfig.minAmount) {
    return { result: { success: false, status: 'failed', message: `Minimum amount for ${railConfig.label} is $${railConfig.minAmount}` } };
  }
  if (req.rail === 'rtgs' && req.amount < RTGS_THRESHOLD) {
    return { result: { success: false, status: 'failed', message: `RTGS requires minimum transfer of $${RTGS_THRESHOLD.toLocaleString()}` } };
  }

  const ref = generateReferenceNumber('QB-EXT');
  const latency = Math.round(performance.now() - start);

  if (platformMode === 'degraded') {
    const queued: QueuedTransfer = {
      id: `q-${Date.now()}`,
      type: 'external',
      amount: req.amount,
      fromAccountId: req.fromAccountId,
      toLabel: beneficiary.name,
      referenceNote: req.referenceNote,
      queuedAt: new Date().toISOString(),
      status: 'queued',
    };
    return {
      result: {
        success: true, referenceNumber: ref, status: 'queued', queued: true,
        message: `External ${railConfig.label} transfer queued due to regional degradation.`,
        settlementEta: railConfig.settlementWindow, processingRegion: 'us-east-1', apiLatencyMs: latency,
      },
      queuedTransfer: queued,
    };
  }

  const outcome = simulateRailOutcome(req.rail);
  if (!outcome.success) {
    logComplianceEvent('TRANSFER_FAILED', `${railConfig.label} transfer failed — chaos/rail rejection`, { reference: ref });
    return {
      result: {
        success: false, referenceNumber: ref, status: 'failed',
        message: `${railConfig.label} transfer failed. Please retry or contact support.`,
        processingRegion: 'us-east-1', apiLatencyMs: latency,
      },
    };
  }

  const status: TransferStatus = req.rail === 'neft' || req.rail === 'swift' ? 'pending' : 'completed';
  logComplianceEvent('EXTERNAL_TRANSFER', `${railConfig.label} transfer initiated`, {
    reference: ref, rail: req.rail, beneficiary: beneficiary.id,
  });

  return {
    result: {
      success: true, referenceNumber: ref, status,
      message: status === 'pending'
        ? `${railConfig.label} transfer submitted. Settlement: ${railConfig.settlementWindow}`
        : `${railConfig.label} transfer completed instantly`,
      settlementEta: railConfig.settlementWindow,
      processingRegion: req.rail === 'swift' ? 'eu-west-1' : 'ap-south-1',
      apiLatencyMs: latency,
    },
  };
}

export function createBeneficiary(data: Omit<Beneficiary, 'id' | 'encryptedAt' | 'createdAt' | 'coolingUntil'>): Beneficiary {
  const now = new Date();
  const beneficiary: Beneficiary = {
    ...data,
    id: `ben-${Date.now()}`,
    encryptedAt: simulateEncryption(data.accountNumber),
    createdAt: now.toISOString(),
    coolingUntil: new Date(now.getTime() + COOLING_PERIOD_MS).toISOString(),
  };
  logComplianceEvent('BENEFICIARY_ADDED', 'New external beneficiary added — 4hr cooling period enforced', {
    beneficiaryId: beneficiary.id, name: beneficiary.name,
  });
  return beneficiary;
}

export function isBeneficiaryTransferable(beneficiary: Beneficiary): boolean {
  return new Date(beneficiary.coolingUntil).getTime() <= Date.now();
}

export function getCoolingRemainingMs(beneficiary: Beneficiary): number {
  return Math.max(0, new Date(beneficiary.coolingUntil).getTime() - Date.now());
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function processQueuedTransfer(transfer: QueuedTransfer): Promise<QueuedTransfer> {
  await delay(1500 + Math.random() * 1000);
  const success = Math.random() < 0.95;
  return {
    ...transfer,
    status: success ? 'completed' : 'failed',
    referenceNumber: success ? generateReferenceNumber('QB-REC') : undefined,
  };
}
