// ─── Loan domain types ────────────────────────────────────────────────────────

export type LoanProduct = 'home' | 'personal' | 'vehicle' | 'education' | 'business';
export type LoanStatus =
  | 'active'
  | 'closed'
  | 'overdue'
  | 'npa'           // Non-Performing Asset
  | 'foreclosed';
export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'disbursed';
export type EmploymentType = 'salaried' | 'self_employed' | 'business_owner' | 'retired';
export type EMIStatus = 'paid' | 'due' | 'overdue' | 'partial' | 'waived';
export type LoanTab = 'overview' | 'schedule' | 'payments' | 'prepayment' | 'closure';

// ─── Credit Scoring ────────────────────────────────────────────────────────────

export interface CreditScoreInput {
  annualIncome: number;
  monthlyObligations: number;  // existing EMIs/rent
  employmentType: EmploymentType;
  employmentYears: number;
  requestedAmount: number;
  tenure: number;              // months
  accountAgeMonths: number;    // how long customer has been with the bank
  existingLoansCount: number;
}

export interface CreditScoreResult {
  score: number;              // 300–900
  band: 'poor' | 'fair' | 'good' | 'excellent';
  eligible: boolean;
  maxEligibleAmount: number;
  indicativeRate: number;     // annual %
  rationale: string[];        // human-readable factors
}

// ─── Loan Application ─────────────────────────────────────────────────────────

export interface LoanApplication {
  id: string;
  product: LoanProduct;
  requestedAmount: number;
  tenure: number;             // months
  purpose: string;
  employmentType: EmploymentType;
  annualIncome: number;
  monthlyObligations: number;
  employmentYears: number;
  status: ApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  creditScore: CreditScoreResult;
  offeredRate?: number;
  offeredAmount?: number;
  offeredTenure?: number;
  rejectionReason?: string;
  referenceId: string;
}

// ─── Loan Account ─────────────────────────────────────────────────────────────

export interface LoanAccount {
  id: string;
  applicationId: string;
  product: LoanProduct;
  accountNumber: string;
  principalAmount: number;
  disbursedAmount: number;
  outstandingPrincipal: number;
  interestRate: number;         // annual %
  tenure: number;               // original months
  remainingTenure: number;
  emiAmount: number;
  nextDueDate: string;
  lastPaymentDate?: string;
  disbursedOn: string;
  maturityDate: string;
  status: LoanStatus;
  linkedAccountId: string;      // for auto-debit
  autoDebitEnabled: boolean;
  missedEmiCount: number;
  totalPenalty: number;
  currency: string;
}

// ─── Amortization ─────────────────────────────────────────────────────────────

export interface AmortizationRow {
  emiNumber: number;
  dueDate: string;
  emiAmount: number;
  principalComponent: number;
  interestComponent: number;
  outstandingBalance: number;
  cumulativeInterest: number;
  status: EMIStatus;
  paidOn?: string;
  penaltyApplied?: number;
}

export interface AmortizationSchedule {
  loanId: string;
  totalEMIs: number;
  totalPayable: number;
  totalInterest: number;
  rows: AmortizationRow[];
}

// ─── EMI Payment ──────────────────────────────────────────────────────────────

export interface EMIPaymentRequest {
  loanId: string;
  amount: number;
  fromAccountId: string;
  pin: string;
  note?: string;
}

export interface EMIPaymentResult {
  success: boolean;
  referenceNumber?: string;
  message: string;
  penaltyWaived?: number;
  outstandingAfter?: number;
}

// ─── Prepayment ───────────────────────────────────────────────────────────────

export interface PrepaymentSimulation {
  currentOutstanding: number;
  prepaymentAmount: number;
  newOutstanding: number;
  interestSaved: number;
  tenureReduction: number;      // months saved
  newTenure: number;
  newEmi?: number;              // if tenure is kept same, EMI reduces
  prepaymentPenalty: number;    // % of prepayment amount
  netSavings: number;
}

// ─── Closure ──────────────────────────────────────────────────────────────────

export interface LoanClosureResult {
  success: boolean;
  referenceNumber: string;
  closedOn: string;
  finalAmount: number;
  nocId: string;                // No-Objection Certificate ID
  message: string;
}

// ─── Product Config ───────────────────────────────────────────────────────────

export interface LoanProductConfig {
  product: LoanProduct;
  label: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  minTenure: number;            // months
  maxTenure: number;
  baseRate: number;             // annual %
  processingFee: number;        // % of loan amount
  prepaymentPenalty: number;    // % of outstanding (0 = nil)
  overdueRate: number;          // penalty rate per day on overdue EMI
  icon: string;
}
