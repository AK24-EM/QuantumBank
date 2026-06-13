export type Page =
  | 'landing'
  | 'login'
  | 'dashboard'
  | 'accounts'
  | 'transactions'
  | 'transfer'
  | 'cards'
  | 'platform'
  | 'settings';

export type UserRole = 'customer' | 'admin';

export type AccountType = 'savings' | 'current' | 'fixed_deposit' | 'loan';
export type AccountStatus = 'active' | 'dormant' | 'closed' | 'overdue';
export type TransactionChannel = 'mobile' | 'web' | 'branch' | 'atm';
export type TransactionStatus = 'pending' | 'completed' | 'failed';
export type DashboardTab = 'overview' | 'transactions' | 'analytics' | 'statements';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  memberSince: string;
  role: UserRole;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  accountNumber: string;
  currency: string;
  status: AccountStatus;
  isLiability?: boolean;
}

export interface Transaction {
  id: string;
  referenceId: string;
  description: string;
  counterparty: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  date: string;
  timestamp: string;
  accountId: string;
  channel: TransactionChannel;
  status: TransactionStatus;
  processingRegion: string;
  apiLatencyMs: number;
  complianceFlags: string[];
}

export interface Card {
  id: string;
  type: 'visa' | 'mastercard';
  last4: string;
  holder: string;
  expiry: string;
  limit: number;
  spent: number;
  status: 'active' | 'frozen';
}

export interface TransactionFilters {
  dateFrom: string;
  dateTo: string;
  type: 'all' | 'credit' | 'debit';
  amountMin: string;
  amountMax: string;
  accountId: string;
}

export interface CategorySpending {
  category: string;
  amount: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expense: number;
}

export interface HeatmapCell {
  day: number;
  hour: number;
  count: number;
}

export interface AnalyticsData {
  categorySpending: CategorySpending[];
  monthlyTrend: MonthlyTrend[];
  heatmap: HeatmapCell[];
  computedAt: string;
}

export interface NetWorthSummary {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}
