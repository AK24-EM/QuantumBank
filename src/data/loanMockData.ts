import type { AmortizationRow, LoanAccount, LoanApplication } from '../types/loans';
import { generateAmortizationSchedule, calculateEMI } from '../services/loanService';

// ─── Active loan accounts ─────────────────────────────────────────────────────

export const loanAccounts: LoanAccount[] = [
  {
    id: 'loan-home-001',
    applicationId: 'app-seed-1',
    product: 'home',
    accountNumber: 'QB-HL-8821-0091',
    principalAmount: 4500000,
    disbursedAmount: 4500000,
    outstandingPrincipal: 3842000,
    interestRate: 8.5,
    tenure: 240,          // 20 years
    remainingTenure: 196,
    emiAmount: calculateEMI(4500000, 8.5, 240),
    nextDueDate: '2026-07-05',
    lastPaymentDate: '2026-06-05',
    disbursedOn: '2010-07-05',
    maturityDate: '2030-07-05',
    status: 'active',
    linkedAccountId: 'acc-savings',
    autoDebitEnabled: true,
    missedEmiCount: 0,
    totalPenalty: 0,
    currency: 'INR',
  },
  {
    id: 'loan-personal-001',
    applicationId: 'app-seed-2',
    product: 'personal',
    accountNumber: 'QB-PL-3342-7712',
    principalAmount: 500000,
    disbursedAmount: 500000,
    outstandingPrincipal: 312500,
    interestRate: 11.5,
    tenure: 48,
    remainingTenure: 30,
    emiAmount: calculateEMI(500000, 11.5, 48),
    nextDueDate: '2026-07-15',
    lastPaymentDate: '2026-06-15',
    disbursedOn: '2024-01-15',
    maturityDate: '2028-01-15',
    status: 'active',
    linkedAccountId: 'acc-current',
    autoDebitEnabled: false,
    missedEmiCount: 0,
    totalPenalty: 0,
    currency: 'INR',
  },
  {
    id: 'loan-vehicle-001',
    applicationId: 'app-seed-3',
    product: 'vehicle',
    accountNumber: 'QB-VL-9901-4456',
    principalAmount: 800000,
    disbursedAmount: 800000,
    outstandingPrincipal: 124000,
    interestRate: 9.0,
    tenure: 60,
    remainingTenure: 9,
    emiAmount: calculateEMI(800000, 9.0, 60),
    nextDueDate: '2026-06-28',
    lastPaymentDate: '2026-05-28',
    disbursedOn: '2021-09-28',
    maturityDate: '2026-09-28',
    status: 'overdue',
    linkedAccountId: 'acc-current',
    autoDebitEnabled: false,
    missedEmiCount: 1,
    totalPenalty: 1240,     // 1% of outstanding for overdue
    currency: 'INR',
  },
];

// ─── Pre-seeded payment status rows for home loan ─────────────────────────────

function buildPaidRows(count: number): Pick<AmortizationRow, 'emiNumber' | 'status' | 'paidOn' | 'penaltyApplied'>[] {
  const rows = [];
  for (let i = 1; i <= count; i++) {
    const d = new Date('2010-08-05');
    d.setMonth(d.getMonth() + i - 1);
    rows.push({
      emiNumber: i,
      status: 'paid' as const,
      paidOn: d.toISOString().slice(0, 10),
    });
  }
  return rows;
}

const homeLoanPaidRows = buildPaidRows(44); // 44 EMIs paid

export function getHomeLoanSchedule() {
  return generateAmortizationSchedule(loanAccounts[0], homeLoanPaidRows);
}

export function getPersonalLoanSchedule() {
  const paidRows = buildPaidRows(18);
  return generateAmortizationSchedule(loanAccounts[1], paidRows);
}

export function getVehicleLoanSchedule() {
  const paidRows = buildPaidRows(50);
  // Mark EMI 51 as overdue
  paidRows.push({ emiNumber: 51, status: 'overdue' });
  return generateAmortizationSchedule(loanAccounts[2], paidRows);
}

// ─── Past applications ────────────────────────────────────────────────────────

export const pastApplications: LoanApplication[] = [
  {
    id: 'app-seed-1',
    product: 'home',
    requestedAmount: 4500000,
    tenure: 240,
    purpose: 'Purchase of residential property',
    employmentType: 'salaried',
    annualIncome: 1800000,
    monthlyObligations: 0,
    employmentYears: 5,
    status: 'disbursed',
    submittedAt: '2010-07-01T10:00:00Z',
    reviewedAt: '2010-07-03T14:00:00Z',
    creditScore: {
      score: 780,
      band: 'excellent',
      eligible: true,
      maxEligibleAmount: 4500000,
      indicativeRate: 8.5,
      rationale: ['Excellent income coverage (FOIR < 30%)', 'Salaried employment'],
    },
    offeredRate: 8.5,
    offeredAmount: 4500000,
    offeredTenure: 240,
    referenceId: 'QB-LOAN-SEED001',
  },
  {
    id: 'app-seed-2',
    product: 'personal',
    requestedAmount: 500000,
    tenure: 48,
    purpose: 'Home renovation',
    employmentType: 'salaried',
    annualIncome: 2000000,
    monthlyObligations: 39000,
    employmentYears: 7,
    status: 'disbursed',
    submittedAt: '2024-01-10T09:00:00Z',
    reviewedAt: '2024-01-12T11:00:00Z',
    creditScore: {
      score: 755,
      band: 'excellent',
      eligible: true,
      maxEligibleAmount: 500000,
      indicativeRate: 11.5,
      rationale: ['Good income coverage', 'Salaried employment', 'Long-standing relationship'],
    },
    offeredRate: 11.5,
    offeredAmount: 500000,
    offeredTenure: 48,
    referenceId: 'QB-LOAN-SEED002',
  },
  {
    id: 'app-seed-3',
    product: 'vehicle',
    requestedAmount: 800000,
    tenure: 60,
    purpose: 'Purchase of passenger vehicle',
    employmentType: 'salaried',
    annualIncome: 1500000,
    monthlyObligations: 30000,
    employmentYears: 4,
    status: 'disbursed',
    submittedAt: '2021-09-20T10:00:00Z',
    reviewedAt: '2021-09-22T15:00:00Z',
    creditScore: {
      score: 720,
      band: 'good',
      eligible: true,
      maxEligibleAmount: 800000,
      indicativeRate: 9.0,
      rationale: ['Good income coverage', 'Salaried employment'],
    },
    offeredRate: 9.0,
    offeredAmount: 800000,
    offeredTenure: 60,
    referenceId: 'QB-LOAN-SEED003',
  },
];
