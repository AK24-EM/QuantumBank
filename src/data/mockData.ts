import type { Account, Card, Transaction, User } from '../types';

export const demoUser: User = {
  id: '1',
  name: 'Aayush Kamble',
  email: 'aayush@quantumbank.com',
  avatar: 'AK',
  memberSince: '2022',
  role: 'admin',
};

export const accounts: Account[] = [
  {
    id: 'acc-current',
    name: 'Quantum Current',
    type: 'current',
    balance: 24850.75,
    accountNumber: 'QB-4821-9034',
    currency: 'USD',
    status: 'active',
  },
  {
    id: 'acc-savings',
    name: 'High-Yield Savings',
    type: 'savings',
    balance: 52300.0,
    accountNumber: 'QB-7392-1108',
    currency: 'USD',
    status: 'active',
  },
  {
    id: 'acc-fd',
    name: 'Fixed Deposit 12M',
    type: 'fixed_deposit',
    balance: 75000.0,
    accountNumber: 'QB-1056-4420',
    currency: 'USD',
    status: 'active',
  },
  {
    id: 'acc-loan',
    name: 'Home Loan',
    type: 'loan',
    balance: 185000.0,
    accountNumber: 'QB-8821-0091',
    currency: 'USD',
    status: 'active',
    isLiability: true,
  },
];

const counterparties = [
  'Acme Corp Payroll', 'Amazon.com', 'City Electric Co.', 'Netflix Inc.',
  'Starbucks', 'Uber Technologies', 'Whole Foods Market', 'Shell Gas Station',
  'Internal Transfer', 'Dividend Fund', 'IRS Refund', 'Spotify AB',
  'Target Stores', 'CVS Pharmacy', 'Zelle: John Smith', 'ATM Withdrawal',
  'Mortgage Payment', 'Interest Credit', 'Wire: Global Tech Ltd.', 'Apple Store',
];

const categories = ['Income', 'Shopping', 'Utilities', 'Transfer', 'Entertainment', 'Food', 'Transport', 'Investment', 'Interest', 'Healthcare', 'Housing'];
const channels: Transaction['channel'][] = ['mobile', 'web', 'branch', 'atm'];
const statuses: Transaction['status'][] = ['completed', 'completed', 'completed', 'completed', 'pending', 'failed'];
const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-south-1'];

function generateTransactions(): Transaction[] {
  const txs: Transaction[] = [];
  const accountIds = accounts.filter((a) => !a.isLiability).map((a) => a.id);

  for (let i = 0; i < 35; i++) {
    const dayOffset = Math.floor(i * 0.8);
    const date = new Date(2026, 5, 12);
    date.setDate(date.getDate() - dayOffset);
    const hour = 8 + (i * 3) % 14;
    const dateStr = date.toISOString().slice(0, 10);
    const timestamp = `${dateStr}T${String(hour).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}:00Z`;

    const type: 'credit' | 'debit' = i % 5 === 0 ? 'credit' : 'debit';
    const category = type === 'credit' ? categories[i % 4] : categories[1 + (i % 10)];
    const amount = type === 'credit'
      ? Math.round((500 + (i * 137) % 5000) * 100) / 100
      : Math.round((5 + (i * 43) % 500) * 100) / 100;

    const status = statuses[i % statuses.length];
    const complianceFlags =
      amount > 3000 ? ['LARGE_TXN_REVIEW', 'AML_SCREENED'] :
      status === 'failed' ? ['INSUFFICIENT_FUNDS'] :
      i % 11 === 0 ? ['CROSS_BORDER', 'OFAC_CLEARED'] :
      ['STANDARD'];

    txs.push({
      id: `t${i + 1}`,
      referenceId: `QB-TXN-${String(100000 + i).slice(1)}`,
      description: type === 'credit' ? `${category} Credit` : `${category} Payment`,
      counterparty: counterparties[i % counterparties.length],
      amount,
      type,
      category,
      date: dateStr,
      timestamp,
      accountId: accountIds[i % accountIds.length],
      channel: channels[i % channels.length],
      status,
      processingRegion: regions[i % regions.length],
      apiLatencyMs: 12 + (i * 17) % 180,
      complianceFlags,
    });
  }

  return txs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export const transactions: Transaction[] = generateTransactions();

export const cards: Card[] = [
  {
    id: 'c1',
    type: 'visa',
    last4: '8842',
    holder: 'AAYUSH KAMBLE',
    expiry: '09/28',
    limit: 15000,
    spent: 3240.5,
    status: 'active',
  },
  {
    id: 'c2',
    type: 'mastercard',
    last4: '3317',
    holder: 'AAYUSH KAMBLE',
    expiry: '03/27',
    limit: 8000,
    spent: 1120.0,
    status: 'active',
  },
];

export { formatCurrency } from '../utils/format';
