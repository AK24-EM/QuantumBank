export type PaymentRail = 'neft' | 'rtgs' | 'imps' | 'swift';
export type PaymentTab = 'internal' | 'external' | 'beneficiaries' | 'scheduled' | 'limits';
export type AccountTier = 'standard' | 'premium' | 'platinum';
export type PlatformMode = 'normal' | 'degraded';
export type TransferStatus = 'completed' | 'pending' | 'queued' | 'failed' | 'processing';
export type ScheduleFrequency = 'once' | 'weekly' | 'monthly';
export type LimitRequestStatus = 'pending' | 'approved' | 'rejected';

export interface PaymentLimits {
  tier: AccountTier;
  dailyLimit: number;
  perTransactionLimit: number;
  externalDailyLimit: number;
}

export interface RailConfig {
  rail: PaymentRail;
  label: string;
  description: string;
  settlementWindow: string;
  minAmount: number;
  maxAmount: number;
  successRate: number;
  available247: boolean;
  rtgsThreshold?: number;
}

export interface Beneficiary {
  id: string;
  name: string;
  accountNumber: string;
  bankName: string;
  ifscCode: string;
  rail: PaymentRail;
  nickname?: string;
  encryptedAt: string;
  createdAt: string;
  coolingUntil: string;
}

export interface InternalTransferRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  referenceNote?: string;
  pin: string;
}

export interface ExternalTransferRequest {
  fromAccountId: string;
  beneficiaryId: string;
  amount: number;
  rail: PaymentRail;
  referenceNote?: string;
  pin: string;
}

export interface PaymentResult {
  success: boolean;
  referenceNumber?: string;
  status: TransferStatus;
  message: string;
  queued?: boolean;
  settlementEta?: string;
  processingRegion?: string;
  apiLatencyMs?: number;
  complianceEventId?: string;
}

export interface QueuedTransfer {
  id: string;
  type: 'internal' | 'external';
  amount: number;
  fromAccountId: string;
  toLabel: string;
  referenceNote?: string;
  queuedAt: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  referenceNumber?: string;
}

export interface ScheduledPayment {
  id: string;
  name: string;
  fromAccountId: string;
  toAccountId?: string;
  beneficiaryId?: string;
  amount: number;
  frequency: ScheduleFrequency;
  nextDue: string;
  isInternal: boolean;
  rail?: PaymentRail;
  active: boolean;
  retryCount: number;
  lastRun?: string;
  lastStatus?: 'success' | 'failed' | 'pending';
}

export interface PaymentNotification {
  id: string;
  type: 'success' | 'failure' | 'queued' | 'scheduled' | 'compliance';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface LimitIncreaseRequest {
  id: string;
  requestedDailyLimit: number;
  justification: string;
  status: LimitRequestStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewerNote?: string;
}

export interface ComplianceEvent {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  metadata: Record<string, string>;
}

export interface DailyUsage {
  date: string;
  internalTotal: number;
  externalTotal: number;
}
