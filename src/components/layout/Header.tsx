import { Bell, Search } from 'lucide-react';
import type { Page } from '../../types';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const pageTitles: Partial<Record<Page, { title: string; subtitle: string }>> = {
  dashboard: { title: 'Customer Dashboard', subtitle: 'Real-time account state · Spending analytics · Compliance-ready statements' },
  accounts: { title: 'Accounts', subtitle: 'Manage your accounts and balances' },
  transactions: { title: 'Transactions', subtitle: 'View your recent activity' },
  transfer: { title: 'Funds Transfer & Payments', subtitle: 'Internal & external rails · Beneficiary management · Scheduled payments · Infrastructure resilience' },
  cards: { title: 'Cards', subtitle: 'Manage your debit and credit cards' },
  loans: { title: 'Loans & Credit', subtitle: 'Loan accounts · Amortization schedule · EMI payments · Prepayment calculator · Closure & NOC' },
  platform: { title: 'DevOps & Platform Health', subtitle: 'Real-time region map · CI/CD traceability · Incident log · Chaos engineering' },
  settings: { title: 'Settings', subtitle: 'Account preferences and security' },
};

export function getPageHeader(page: Page): HeaderProps {
  return pageTitles[page] ?? { title: 'QuantumBank', subtitle: '' };
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="flex items-center justify-between mb-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
          />
        </div>
        <button className="relative p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-cyan-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}
