import { useState } from 'react';
import { LayoutGrid, ArrowLeftRight, BarChart3, FileText } from 'lucide-react';
import type { DashboardTab, User } from '../../types';
import { accounts, transactions } from '../../data/mockData';
import { computeNetWorth } from '../../utils/netWorth';
import NetWorthSummary from './NetWorthSummary';
import AccountCard from './AccountCard';
import TransactionFeed from './TransactionFeed';
import SpendingAnalytics from './SpendingAnalytics';
import AccountStatements from './AccountStatements';

interface CustomerDashboardProps {
  user: User;
}

const tabs: { id: DashboardTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutGrid className="w-4 h-4" /> },
  { id: 'transactions', label: 'Transactions', icon: <ArrowLeftRight className="w-4 h-4" /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'statements', label: 'Statements', icon: <FileText className="w-4 h-4" /> },
];

export default function CustomerDashboard({ user }: CustomerDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const netWorth = computeNetWorth(accounts);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-2xl p-1.5 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <NetWorthSummary summary={netWorth} />
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Your Accounts</h3>
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {accounts.map((account) => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>
          </div>
          <TransactionFeed transactions={transactions} accounts={accounts} limit={10} showFilters={false} />
        </div>
      )}

      {activeTab === 'transactions' && (
        <TransactionFeed transactions={transactions} accounts={accounts} limit={30} showFilters />
      )}

      {activeTab === 'analytics' && (
        <SpendingAnalytics transactions={transactions} />
      )}

      {activeTab === 'statements' && (
        <AccountStatements user={user} accounts={accounts} transactions={transactions} />
      )}
    </div>
  );
}
