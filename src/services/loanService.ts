import { jsPDF } from 'jspdf';
import type {
  AmortizationRow,
  AmortizationSchedule,
  CreditScoreInput,
  CreditScoreResult,
  EMIPaymentRequest,
  EMIPaymentResult,
  LoanAccount,
  LoanApplication,
  LoanClosureResult,
  LoanProductConfig,
  PrepaymentSimulation,
} from '../types/loans';
import { DEMO_PIN } from '../config/paymentConfig';
import { logComplianceEvent } from './complianceService';

// ─── Product Configs ──────────────────────────────────────────────────────────

export const LOAN_PRODUCTS: LoanProductConfig[] = [
  {
    product: 'home',
    label: 'Home Loan',
    description: 'Finance your dream home with competitive floating rates',
    minAmount: 500000,
    maxAmount: 50000000,
    minTenure: 60,
    maxTenure: 360,
    baseRate: 8.5,
    processingFee: 0.5,
    prepaymentPenalty: 0,      // RBI mandates nil penalty on floating-rate home loans
    overdueRate: 2,
    icon: '🏠',
  },
  {
    product: 'personal',
    label: 'Personal Loan',
    description: 'Quick unsecured funds for any personal need',
    minAmount: 50000,
    maxAmount: 2500000,
    minTenure: 12,
    maxTenure: 84,
    baseRate: 11.5,
    processingFee: 1.0,
    prepaymentPenalty: 2,
    overdueRate: 3,
    icon: '💳',
  },
  {
    product: 'vehicle',
    label: 'Vehicle Loan',
    description: 'Drive home your vehicle with easy EMIs',
    minAmount: 100000,
    maxAmount: 10000000,
    minTenure: 12,
    maxTenure: 84,
    baseRate: 9.0,
    processingFee: 0.5,
    prepaymentPenalty: 1,
    overdueRate: 2,
    icon: '🚗',
  },
  {
    product: 'education',
    label: 'Education Loan',
    description: 'Invest in your future — moratorium during study period',
    minAmount: 100000,
    maxAmount: 7500000,
    minTenure: 12,
    maxTenure: 120,
    baseRate: 9.5,
    processingFee: 0,
    prepaymentPenalty: 0,
    overdueRate: 1,
    icon: '🎓',
  },
  {
    product: 'business',
    label: 'Business Loan',
    description: 'Fuel your business growth with working capital',
    minAmount: 200000,
    maxAmount: 20000000,
    minTenure: 12,
    maxTenure: 84,
    baseRate: 12.5,
    processingFee: 1.5,
    prepaymentPenalty: 2,
    overdueRate: 3,
    icon: '🏢',
  },
];

// ─── Credit Scoring Engine ────────────────────────────────────────────────────

export function calculateCreditScore(input: CreditScoreInput): CreditScoreResult {
  const {
    annualIncome, monthlyObligations, employmentType, employmentYears,
    requestedAmount, tenure, accountAgeMonths, existingLoansCount,
  } = input;

  let score = 700; // base score
  const rationale: string[] = [];

  // Income adequacy — EMI should be ≤ 50% of monthly income
  const monthlyIncome = annualIncome / 12;
  const prospectiveEmi = calculateEMI(requestedAmount, 10.5, tenure);
  const totalObligations = monthlyObligations + prospectiveEmi;
  const foir = totalObligations / monthlyIncome; // Fixed Obligation to Income Ratio

  if (foir <= 0.3) { score += 60; rationale.push('Excellent income coverage (FOIR < 30%)'); }
  else if (foir <= 0.4) { score += 30; rationale.push('Good income coverage (FOIR < 40%)'); }
  else if (foir <= 0.5) { score += 0; rationale.push('Acceptable income coverage (FOIR < 50%)'); }
  else if (foir <= 0.6) { score -= 40; rationale.push('High debt burden (FOIR 50–60%)'); }
  else { score -= 100; rationale.push('Excessive debt burden (FOIR > 60%) — eligibility at risk'); }

  // Employment stability
  if (employmentType === 'salaried') {
    score += 30;
    rationale.push('Salaried employment provides income stability');
  } else if (employmentType === 'business_owner') {
    score += employmentYears >= 3 ? 20 : -10;
    rationale.push(employmentYears >= 3 ? 'Established business (3+ years)' : 'Young business (< 3 years)');
  } else if (employmentType === 'self_employed') {
    score += employmentYears >= 5 ? 10 : -20;
    rationale.push(employmentYears >= 5 ? 'Experienced self-employment' : 'Short self-employment history');
  } else {
    score -= 10; // retired
    rationale.push('Retired — fixed income');
  }

  // Account age — loyalty indicator
  if (accountAgeMonths >= 60) { score += 40; rationale.push('Long-standing QuantumBank relationship (5+ years)'); }
  else if (accountAgeMonths >= 24) { score += 20; rationale.push('Established QuantumBank relationship (2+ years)'); }
  else { score += 5; rationale.push('New QuantumBank customer'); }

  // Existing loan count
  if (existingLoansCount === 0) { score += 20; rationale.push('No existing loan obligations'); }
  else if (existingLoansCount === 1) { score += 0; rationale.push('One existing loan'); }
  else if (existingLoansCount === 2) { score -= 20; rationale.push('Two existing loans — moderate exposure'); }
  else { score -= 60; rationale.push('Multiple existing loans — high credit exposure'); }

  // Clamp score to 300–900
  score = Math.max(300, Math.min(900, score));

  const band =
    score >= 750 ? 'excellent' :
    score >= 650 ? 'good' :
    score >= 550 ? 'fair' : 'poor';

  const eligible = score >= 600 && foir <= 0.55;

  // Indicative rate based on score band
  const indicativeRate =
    band === 'excellent' ? 8.5 :
    band === 'good'      ? 10.0 :
    band === 'fair'      ? 12.5 : 15.0;

  // Max eligible amount — 50x monthly income, capped at requested
  const maxEligibleAmount = eligible
    ? Math.min(requestedAmount, monthlyIncome * 50)
    : 0;

  return { score, band, eligible, maxEligibleAmount, indicativeRate, rationale };
}

// ─── EMI Calculator ───────────────────────────────────────────────────────────

export function calculateEMI(principal: number, annualRate: number, tenureMonths: number): number {
  if (annualRate === 0) return principal / tenureMonths;
  const r = annualRate / 100 / 12;
  return Math.round(principal * r * Math.pow(1 + r, tenureMonths) / (Math.pow(1 + r, tenureMonths) - 1));
}

// ─── Amortization Schedule ────────────────────────────────────────────────────

export function generateAmortizationSchedule(
  loan: LoanAccount,
  existingRows?: Pick<AmortizationRow, 'emiNumber' | 'status' | 'paidOn' | 'penaltyApplied'>[],
): AmortizationSchedule {
  const rows: AmortizationRow[] = [];
  const r = loan.interestRate / 100 / 12;
  let balance = loan.disbursedAmount;
  let cumulativeInterest = 0;
  const startDate = new Date(loan.disbursedOn);

  for (let i = 1; i <= loan.tenure; i++) {
    const interest = Math.round(balance * r * 100) / 100;
    const principal = Math.round((loan.emiAmount - interest) * 100) / 100;
    balance = Math.round((balance - principal) * 100) / 100;
    if (balance < 0) balance = 0;
    cumulativeInterest = Math.round((cumulativeInterest + interest) * 100) / 100;

    const dueDate = new Date(startDate);
    dueDate.setMonth(startDate.getMonth() + i);
    const dueDateStr = dueDate.toISOString().slice(0, 10);

    const now = new Date().toISOString().slice(0, 10);
    const existing = existingRows?.find((r) => r.emiNumber === i);

    let status: AmortizationRow['status'] = 'due';
    if (existing?.status) {
      status = existing.status;
    } else if (dueDateStr < now) {
      status = 'overdue';
    } else if (dueDateStr === now) {
      status = 'due';
    }

    rows.push({
      emiNumber: i,
      dueDate: dueDateStr,
      emiAmount: loan.emiAmount,
      principalComponent: Math.max(0, principal),
      interestComponent: interest,
      outstandingBalance: Math.max(0, balance),
      cumulativeInterest,
      status,
      paidOn: existing?.paidOn,
      penaltyApplied: existing?.penaltyApplied,
    });
  }

  const totalPayable = loan.emiAmount * loan.tenure;
  const totalInterest = totalPayable - loan.disbursedAmount;

  return { loanId: loan.id, totalEMIs: loan.tenure, totalPayable, totalInterest, rows };
}

// ─── Prepayment Simulation ────────────────────────────────────────────────────

export function simulatePrepayment(
  loan: LoanAccount,
  prepaymentAmount: number,
): PrepaymentSimulation {
  const config = LOAN_PRODUCTS.find((p) => p.product === loan.product)!;
  const newOutstanding = Math.max(0, loan.outstandingPrincipal - prepaymentAmount);
  const penalty = Math.round(prepaymentAmount * (config.prepaymentPenalty / 100) * 100) / 100;

  // Original remaining interest at current EMI
  const originalInterest = loan.emiAmount * loan.remainingTenure - loan.outstandingPrincipal;

  // New tenure with same EMI but lower principal
  let newTenure = 0;
  if (newOutstanding > 0) {
    const r = loan.interestRate / 100 / 12;
    newTenure = Math.ceil(
      Math.log(loan.emiAmount / (loan.emiAmount - newOutstanding * r)) / Math.log(1 + r)
    );
  }

  const newInterest = loan.emiAmount * newTenure - newOutstanding;
  const interestSaved = Math.max(0, originalInterest - newInterest);
  const tenureReduction = loan.remainingTenure - newTenure;
  const netSavings = Math.max(0, interestSaved - penalty);

  return {
    currentOutstanding: loan.outstandingPrincipal,
    prepaymentAmount,
    newOutstanding,
    interestSaved: Math.round(interestSaved),
    tenureReduction: Math.max(0, tenureReduction),
    newTenure: Math.max(0, newTenure),
    prepaymentPenalty: penalty,
    netSavings: Math.round(netSavings),
  };
}

// ─── EMI Payment Processing ───────────────────────────────────────────────────

export async function processEMIPayment(
  req: EMIPaymentRequest,
  loan: LoanAccount,
): Promise<EMIPaymentResult> {
  await delay(400 + Math.random() * 300);

  if (req.pin !== DEMO_PIN) {
    return { success: false, message: 'Invalid transaction PIN' };
  }

  if (req.amount < loan.emiAmount * 0.5) {
    return { success: false, message: `Minimum payment is $${(loan.emiAmount * 0.5).toLocaleString()}` };
  }

  const ref = `QB-EMI-${Date.now().toString(36).toUpperCase()}`;
  const penaltyWaived = loan.totalPenalty > 0 && req.amount >= loan.emiAmount + loan.totalPenalty
    ? loan.totalPenalty
    : 0;

  logComplianceEvent('EMI_PAYMENT', `EMI payment processed for loan ${loan.accountNumber}`, {
    reference: ref,
    amount: String(req.amount),
    loanId: loan.id,
    penaltyWaived: String(penaltyWaived),
  });

  return {
    success: true,
    referenceNumber: ref,
    message: `EMI payment of $${req.amount.toLocaleString()} processed successfully`,
    penaltyWaived: penaltyWaived || undefined,
    outstandingAfter: Math.max(0, loan.outstandingPrincipal - (req.amount - (loan.emiAmount - (req.amount - loan.emiAmount > 0 ? 0 : 0)))),
  };
}

// ─── Loan Application Submit ──────────────────────────────────────────────────

export async function submitLoanApplication(
  application: Omit<LoanApplication, 'id' | 'referenceId' | 'submittedAt' | 'creditScore' | 'status'>,
): Promise<LoanApplication> {
  await delay(800 + Math.random() * 500);

  const creditScore = calculateCreditScore({
    annualIncome: application.annualIncome,
    monthlyObligations: application.monthlyObligations,
    employmentType: application.employmentType,
    employmentYears: application.employmentYears,
    requestedAmount: application.requestedAmount,
    tenure: application.tenure,
    accountAgeMonths: 48, // demo: 4 years
    existingLoansCount: 1, // demo: existing home loan
  });

  const id = `app-${Date.now().toString(36)}`;
  const ref = `QB-LOAN-${Date.now().toString(36).toUpperCase()}`;

  const result: LoanApplication = {
    ...application,
    id,
    referenceId: ref,
    submittedAt: new Date().toISOString(),
    creditScore,
    status: creditScore.eligible ? 'approved' : 'rejected',
    offeredRate: creditScore.eligible ? creditScore.indicativeRate : undefined,
    offeredAmount: creditScore.eligible ? creditScore.maxEligibleAmount : undefined,
    offeredTenure: creditScore.eligible ? application.tenure : undefined,
    rejectionReason: !creditScore.eligible ? creditScore.rationale.find(r => r.includes('FOIR') || r.includes('loan')) : undefined,
    reviewedAt: new Date().toISOString(),
  };

  logComplianceEvent('LOAN_APPLICATION', `Loan application ${creditScore.eligible ? 'approved' : 'rejected'}`, {
    reference: ref,
    product: application.product,
    amount: String(application.requestedAmount),
    score: String(creditScore.score),
    eligible: String(creditScore.eligible),
  });

  return result;
}

// ─── Loan Closure ─────────────────────────────────────────────────────────────

export async function processLoanClosure(
  loan: LoanAccount,
  pin: string,
  paymentAccountId: string,
): Promise<LoanClosureResult> {
  await delay(600 + Math.random() * 400);

  if (pin !== DEMO_PIN) {
    return { success: false, referenceNumber: '', closedOn: '', finalAmount: 0, nocId: '', message: 'Invalid PIN' };
  }

  const ref = `QB-CLO-${Date.now().toString(36).toUpperCase()}`;
  const nocId = `NOC-${Date.now().toString(36).toUpperCase()}`;

  logComplianceEvent('LOAN_CLOSURE', `Loan ${loan.accountNumber} closed`, {
    reference: ref,
    nocId,
    finalAmount: String(loan.outstandingPrincipal + loan.totalPenalty),
    loanId: loan.id,
  });

  return {
    success: true,
    referenceNumber: ref,
    closedOn: new Date().toISOString(),
    finalAmount: loan.outstandingPrincipal + loan.totalPenalty,
    nocId,
    message: `Loan ${loan.accountNumber} successfully closed. No-Objection Certificate generated.`,
  };
}

// ─── NOC PDF Generator ────────────────────────────────────────────────────────

export async function generateNOC(
  loan: LoanAccount,
  nocId: string,
  closedOn: string,
  userName: string,
): Promise<{ blob: Blob; filename: string }> {
  await delay(400);
  const doc = new jsPDF();

  // Header
  doc.setFillColor(11, 20, 38);
  doc.rect(0, 0, 210, 45, 'F');
  doc.setTextColor(0, 212, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('QuantumBank', 20, 22);
  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  doc.text('Production Banking Platform', 20, 30);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text('NO OBJECTION CERTIFICATE', 110, 22);
  doc.setFontSize(9);
  doc.text('(Loan Closure Certificate)', 120, 30);

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  let y = 58;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('CERTIFICATE OF LOAN CLOSURE', 105, y, { align: 'center' });

  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const config = LOAN_PRODUCTS.find(p => p.product === loan.product);
  const closedDate = new Date(closedOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const body = [
    `This is to certify that ${userName} (hereinafter referred to as "the Borrower") has`,
    `fully repaid the outstanding dues in respect of the ${config?.label ?? 'Loan'} (Account No.`,
    `${loan.accountNumber}) disbursed by QuantumBank.`,
    ``,
    `The Borrower has discharged all financial obligations including principal, interest,`,
    `fees, and applicable charges as of ${closedDate}.`,
    ``,
    `QuantumBank hereby confirms that it has no further claim, right, lien, or interest`,
    `over the Borrower's assets/property secured against this loan.`,
    ``,
    `QuantumBank raises no objection to the Borrower using or transferring the`,
    `property/asset that was pledged as collateral for this loan, if applicable.`,
  ];

  for (const line of body) {
    doc.text(line, 20, y);
    y += line === '' ? 5 : 7;
  }

  y += 10;
  doc.setDrawColor(0, 212, 255);
  doc.line(20, y, 190, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('Loan Details', 20, y);
  y += 8;
  doc.setFont('helvetica', 'normal');

  const details = [
    ['Loan Account Number', loan.accountNumber],
    ['Loan Product', config?.label ?? loan.product],
    ['Principal Amount', `$${loan.disbursedAmount.toLocaleString()}`],
    ['Disbursement Date', new Date(loan.disbursedOn).toLocaleDateString('en-IN')],
    ['Closure Date', closedDate],
    ['NOC Reference', nocId],
  ];

  for (const [label, value] of details) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 95, y);
    y += 8;
  }

  y += 15;
  doc.setFont('helvetica', 'bold');
  doc.text('Authorised Signatory', 130, y);
  doc.setFont('helvetica', 'normal');
  y += 6;
  doc.text('QuantumBank Ltd.', 130, y);
  y += 6;
  doc.text(`Date: ${closedDate}`, 130, y);

  y += 20;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'italic');
  doc.text(`Document ID: ${nocId} | Generated: ${new Date().toLocaleString()}`, 20, y);
  y += 5;
  doc.text('This is a computer-generated document. It is valid without a physical signature.', 20, y);
  y += 5;
  doc.text('QuantumBank — FDIC Insured | RBI Registered | Equal Housing Lender', 20, y);

  const filename = `QuantumBank_NOC_${loan.accountNumber.replace(/[^0-9A-Z]/g, '')}_${nocId}.pdf`;
  return { blob: doc.output('blob'), filename };
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
