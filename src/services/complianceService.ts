import type { ComplianceEvent } from '../types/payments';
import { generateReferenceNumber } from '../config/paymentConfig';

const events: ComplianceEvent[] = [];

export function logComplianceEvent(
  type: string,
  description: string,
  metadata: Record<string, string> = {},
): ComplianceEvent {
  const event: ComplianceEvent = {
    id: generateReferenceNumber('QB-COMP'),
    type,
    description,
    timestamp: new Date().toISOString(),
    metadata,
  };
  events.unshift(event);
  if (events.length > 100) events.pop();
  return event;
}

export function getComplianceEvents(): ComplianceEvent[] {
  return [...events];
}
