import type { ScheduledPayment, PaymentNotification } from '../types/payments';
import { generateReferenceNumber } from '../config/paymentConfig';
import { logComplianceEvent } from './complianceService';

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 2000;

export function computeNextDue(frequency: ScheduledPayment['frequency'], from: Date = new Date()): string {
  const next = new Date(from);
  if (frequency === 'weekly') next.setDate(next.getDate() + 7);
  else if (frequency === 'monthly') next.setMonth(next.getMonth() + 1);
  else next.setDate(next.getDate() + 1);
  return next.toISOString().slice(0, 10);
}

export async function processDuePayment(
  payment: ScheduledPayment,
): Promise<{ payment: ScheduledPayment; notification: PaymentNotification }> {
  await delay(800 + Math.random() * 500);

  const success = payment.retryCount >= MAX_RETRIES ? false : Math.random() < 0.88;
  const now = new Date().toISOString();

  if (success) {
    const updated: ScheduledPayment = {
      ...payment,
      lastRun: now,
      lastStatus: 'success',
      retryCount: 0,
      nextDue: computeNextDue(payment.frequency),
    };
    logComplianceEvent('SCHEDULED_PAYMENT_SUCCESS', `Standing instruction "${payment.name}" processed`, {
      paymentId: payment.id, amount: String(payment.amount),
    });
    return {
      payment: updated,
      notification: {
        id: `notif-${Date.now()}`,
        type: 'scheduled',
        title: 'Scheduled Payment Successful',
        message: `"${payment.name}" — $${payment.amount.toLocaleString()} processed successfully.`,
        timestamp: now,
        read: false,
      },
    };
  }

  const newRetryCount = payment.retryCount + 1;
  const backoffMs = BASE_BACKOFF_MS * Math.pow(2, payment.retryCount);

  if (newRetryCount >= MAX_RETRIES) {
    const updated: ScheduledPayment = { ...payment, lastRun: now, lastStatus: 'failed', retryCount: newRetryCount, active: false };
    logComplianceEvent('SCHEDULED_PAYMENT_FAILED', `Standing instruction "${payment.name}" failed after max retries`, {
      paymentId: payment.id,
    });
    return {
      payment: updated,
      notification: {
        id: `notif-${Date.now()}`,
        type: 'failure',
        title: 'Scheduled Payment Failed',
        message: `"${payment.name}" failed after ${MAX_RETRIES} retries. Payment deactivated.`,
        timestamp: now,
        read: false,
      },
    };
  }

  const updated: ScheduledPayment = { ...payment, lastRun: now, lastStatus: 'failed', retryCount: newRetryCount };
  return {
    payment: updated,
    notification: {
      id: `notif-${Date.now()}`,
      type: 'failure',
      title: 'Scheduled Payment Retry',
      message: `"${payment.name}" failed. Retry ${newRetryCount}/${MAX_RETRIES} in ${backoffMs / 1000}s.`,
      timestamp: now,
      read: false,
    },
  };
}

export function createScheduledPayment(
  data: Omit<ScheduledPayment, 'id' | 'retryCount' | 'active' | 'nextDue'>,
): ScheduledPayment {
  return {
    ...data,
    id: generateReferenceNumber('QB-SCH'),
    retryCount: 0,
    active: true,
    nextDue: computeNextDue(data.frequency),
  };
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
