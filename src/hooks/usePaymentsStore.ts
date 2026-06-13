import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  Beneficiary, QueuedTransfer, ScheduledPayment, PaymentNotification,
  LimitIncreaseRequest, DailyUsage, PaymentResult,
} from '../types/payments';
import type { Account } from '../types';
import { accounts as initialAccounts } from '../data/mockData';
import {
  createBeneficiary, processInternalTransfer, processExternalTransfer,
  processQueuedTransfer,
} from '../services/paymentService';
import { createScheduledPayment, processDuePayment } from '../services/schedulerService';
import { logComplianceEvent } from '../services/complianceService';
import {
  chaosMode, setChaosMode, setPlatformMode, platformMode,
  DEFAULT_USER_TIER, TIER_LIMITS, COOLING_PERIOD_MS,
} from '../config/paymentConfig';
import { generateReferenceNumber } from '../config/paymentConfig';

const now = Date.now();

const seedBeneficiaries: Beneficiary[] = [
  {
    id: 'ben-seed-1',
    name: 'Rajesh Kumar',
    accountNumber: 'HDFC0001234567',
    bankName: 'HDFC Bank',
    ifscCode: 'HDFC0001234',
    rail: 'imps',
    nickname: 'Landlord',
    encryptedAt: 'enc:SEED...',
    createdAt: new Date(now - COOLING_PERIOD_MS - 86400000).toISOString(),
    coolingUntil: new Date(now - 86400000).toISOString(),
  },
  {
    id: 'ben-seed-2',
    name: 'Global Tech Ltd.',
    accountNumber: 'CHASUS33XXX',
    bankName: 'JPMorgan Chase',
    ifscCode: 'CHASUS33',
    rail: 'swift',
    nickname: 'Vendor Payment',
    encryptedAt: 'enc:SEED...',
    createdAt: new Date(now - COOLING_PERIOD_MS - 172800000).toISOString(),
    coolingUntil: new Date(now - 172800000).toISOString(),
  },
];

export function usePaymentsStore() {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(seedBeneficiaries);
  const [queuedTransfers, setQueuedTransfers] = useState<QueuedTransfer[]>([]);
  const [scheduledPayments, setScheduledPayments] = useState<ScheduledPayment[]>([
    {
      id: 'sch-seed-1', name: 'Monthly Rent', fromAccountId: 'acc-current',
      beneficiaryId: 'ben-seed-1', amount: 1500, frequency: 'monthly',
      nextDue: '2026-06-15', isInternal: false, rail: 'neft', active: true, retryCount: 0,
    },
    {
      id: 'sch-seed-2', name: 'Weekly Savings', fromAccountId: 'acc-current',
      toAccountId: 'acc-savings', amount: 500, frequency: 'weekly',
      nextDue: '2026-06-14', isInternal: true, active: true, retryCount: 0,
    },
  ]);
  const [notifications, setNotifications] = useState<PaymentNotification[]>([]);
  const [limitRequests, setLimitRequests] = useState<LimitIncreaseRequest[]>([]);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage>({
    date: new Date().toISOString().slice(0, 10),
    internalTotal: 1200,
    externalTotal: 450,
  });
  const [degradedMode, setDegradedMode] = useState(platformMode === 'degraded');
  const [chaosEnabled, setChaosEnabled] = useState(chaosMode);
  const recoveryTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const addNotification = useCallback((n: Omit<PaymentNotification, 'id' | 'read'>) => {
    setNotifications((prev) => [{ ...n, id: `notif-${Date.now()}`, read: false }, ...prev].slice(0, 50));
  }, []);

  const toggleDegradedMode = useCallback((enabled: boolean) => {
    setDegradedMode(enabled);
    setPlatformMode(enabled ? 'degraded' : 'normal');
    if (enabled) {
      addNotification({ type: 'queued', title: 'Platform Degraded', message: 'Regional issue detected. Transfers will be queued.', timestamp: new Date().toISOString() });
    } else {
      addNotification({ type: 'success', title: 'Platform Recovered', message: 'Normal operations restored. Processing queued transfers...', timestamp: new Date().toISOString() });
    }
  }, [addNotification]);

  const toggleChaosMode = useCallback((enabled: boolean) => {
    setChaosEnabled(enabled);
    setChaosMode(enabled);
  }, []);

  const processRecoveryQueue = useCallback(async () => {
    const queued = queuedTransfers.filter((t) => t.status === 'queued');
    if (queued.length === 0) return;

    for (const transfer of queued) {
      setQueuedTransfers((prev) =>
        prev.map((t) => (t.id === transfer.id ? { ...t, status: 'processing' } : t)),
      );
      const result = await processQueuedTransfer(transfer);
      setQueuedTransfers((prev) =>
        prev.map((t) => (t.id === transfer.id ? result : t)),
      );

      if (result.status === 'completed' && transfer.type === 'internal') {
        setAccounts((prev) => {
          const updated = [...prev];
          const from = updated.find((a) => a.id === transfer.fromAccountId);
          const toAccount = updated.find((a) => a.name === transfer.toLabel);
          if (from) from.balance -= transfer.amount;
          if (toAccount) toAccount.balance += transfer.amount;
          return updated;
        });
      }

      addNotification({
        type: result.status === 'completed' ? 'success' : 'failure',
        title: result.status === 'completed' ? 'Queued Transfer Completed' : 'Queued Transfer Failed',
        message: result.status === 'completed'
          ? `$${transfer.amount.toLocaleString()} to ${transfer.toLabel} processed on recovery. Ref: ${result.referenceNumber}`
          : `Queued transfer to ${transfer.toLabel} failed during recovery.`,
        timestamp: new Date().toISOString(),
      });
    }
  }, [queuedTransfers, addNotification]);

  useEffect(() => {
    if (!degradedMode && queuedTransfers.some((t) => t.status === 'queued')) {
      processRecoveryQueue();
    }
  }, [degradedMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    recoveryTimer.current = setInterval(() => {
      const due = scheduledPayments.filter((p) => p.active && p.nextDue <= new Date().toISOString().slice(0, 10));
      due.forEach(async (payment) => {
        const { payment: updated, notification } = await processDuePayment(payment);
        setScheduledPayments((prev) => prev.map((p) => (p.id === payment.id ? updated : p)));
        setNotifications((prev) => [notification, ...prev].slice(0, 50));
      });
    }, 30000);
    return () => { if (recoveryTimer.current) clearInterval(recoveryTimer.current); };
  }, [scheduledPayments]);

  const getPaymentContext = useCallback(() => ({
    accounts,
    dailyUsage,
    tier: DEFAULT_USER_TIER,
  }), [accounts, dailyUsage]);

  const applyInternalTransfer = useCallback(async (
    fromId: string, toId: string, amount: number, note: string, pin: string,
  ): Promise<PaymentResult> => {
    const { result, queuedTransfer } = await processInternalTransfer(
      { fromAccountId: fromId, toAccountId: toId, amount, referenceNote: note, pin },
      getPaymentContext(),
    );

    if (result.success && result.status === 'completed') {
      setAccounts((prev) => {
        const updated = [...prev];
        const from = updated.find((a) => a.id === fromId);
        const to = updated.find((a) => a.id === toId);
        if (from) from.balance -= amount;
        if (to) to.balance += amount;
        return updated;
      });
      setDailyUsage((prev) => ({ ...prev, internalTotal: prev.internalTotal + amount }));
    }

    if (queuedTransfer) {
      setQueuedTransfers((prev) => [...prev, queuedTransfer]);
    }

    addNotification({
      type: result.queued ? 'queued' : result.success ? 'success' : 'failure',
      title: result.queued ? 'Transfer Queued' : result.success ? 'Transfer Successful' : 'Transfer Failed',
      message: result.message,
      timestamp: new Date().toISOString(),
    });

    return result;
  }, [getPaymentContext, addNotification]);

  const applyExternalTransfer = useCallback(async (
    fromId: string, beneficiaryId: string, amount: number, rail: Beneficiary['rail'], note: string, pin: string,
  ): Promise<PaymentResult> => {
    const beneficiary = beneficiaries.find((b) => b.id === beneficiaryId);
    if (!beneficiary) return { success: false, status: 'failed', message: 'Beneficiary not found' };

    const { result, queuedTransfer } = await processExternalTransfer(
      { fromAccountId: fromId, beneficiaryId, amount, rail, referenceNote: note, pin },
      beneficiary,
      getPaymentContext(),
    );

    if (result.success && result.status === 'completed') {
      setAccounts((prev) => {
        const updated = [...prev];
        const from = updated.find((a) => a.id === fromId);
        if (from) from.balance -= amount;
        return updated;
      });
      setDailyUsage((prev) => ({ ...prev, externalTotal: prev.externalTotal + amount }));
    }

    if (queuedTransfer) setQueuedTransfers((prev) => [...prev, queuedTransfer]);

    addNotification({
      type: result.queued ? 'queued' : result.success ? 'success' : 'failure',
      title: `${rail.toUpperCase()} Transfer`,
      message: result.message,
      timestamp: new Date().toISOString(),
    });

    return result;
  }, [beneficiaries, getPaymentContext, addNotification]);

  const addBeneficiary = useCallback((data: Omit<Beneficiary, 'id' | 'encryptedAt' | 'createdAt' | 'coolingUntil'>) => {
    const ben = createBeneficiary(data);
    setBeneficiaries((prev) => [...prev, ben]);
    addNotification({
      type: 'compliance',
      title: 'Beneficiary Added',
      message: `${ben.name} added. 4-hour cooling period enforced before transfers.`,
      timestamp: new Date().toISOString(),
    });
    return ben;
  }, [addNotification]);

  const updateBeneficiary = useCallback((id: string, updates: Partial<Beneficiary>) => {
    setBeneficiaries((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  }, []);

  const deleteBeneficiary = useCallback((id: string) => {
    setBeneficiaries((prev) => prev.filter((b) => b.id !== id));
    logComplianceEvent('BENEFICIARY_DELETED', 'External beneficiary removed', { beneficiaryId: id });
  }, []);

  const addScheduledPayment = useCallback((data: Omit<ScheduledPayment, 'id' | 'retryCount' | 'active' | 'nextDue'>) => {
    const payment = createScheduledPayment(data);
    setScheduledPayments((prev) => [...prev, payment]);
    return payment;
  }, []);

  const toggleScheduledPayment = useCallback((id: string) => {
    setScheduledPayments((prev) => prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
  }, []);

  const submitLimitRequest = useCallback((requestedDailyLimit: number, justification: string) => {
    const request: LimitIncreaseRequest = {
      id: generateReferenceNumber('QB-LIM'),
      requestedDailyLimit,
      justification,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };
    setLimitRequests((prev) => [request, ...prev]);
    logComplianceEvent('LIMIT_INCREASE_REQUEST', 'Temporary limit increase requested — pending compliance review', {
      requestId: request.id, requestedLimit: String(requestedDailyLimit),
    });
    addNotification({
      type: 'compliance',
      title: 'Limit Increase Requested',
      message: 'Your request has been routed to a compliance officer for review.',
      timestamp: new Date().toISOString(),
    });
    return request;
  }, [addNotification]);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  return {
    accounts,
    beneficiaries,
    queuedTransfers,
    scheduledPayments,
    notifications,
    limitRequests,
    dailyUsage,
    tier: DEFAULT_USER_TIER,
    limits: TIER_LIMITS[DEFAULT_USER_TIER],
    degradedMode,
    chaosEnabled,
    unreadCount: notifications.filter((n) => !n.read).length,
    toggleDegradedMode,
    toggleChaosMode,
    applyInternalTransfer,
    applyExternalTransfer,
    addBeneficiary,
    updateBeneficiary,
    deleteBeneficiary,
    addScheduledPayment,
    toggleScheduledPayment,
    submitLimitRequest,
    addNotification,
    markNotificationRead,
  };
}

export type PaymentsStore = ReturnType<typeof usePaymentsStore>;
