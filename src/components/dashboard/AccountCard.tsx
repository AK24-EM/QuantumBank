import { Wallet, PiggyBank, Landmark, Home, AlertCircle } from 'lucide-react';
import type { Account } from '../../types';
import { formatCurrency, maskAccountNumber } from '../../utils/format';

const typeConfig = {
  current: { icon: Wallet, label: 'Current', gradient: 'from-cyan-500 to-blue-600' },
  savings: { icon: PiggyBank, label: 'Savings', gradient: 'from-emerald-500 to-teal-600' },
  fixed_deposit: { icon: Landmark, label: 'Fixed Deposit', gradient: 'from-violet-500 to-purple-600' },
  loan: { icon: Home, label: 'Loan', gradient: 'from-orange-500 to-red-600' },
};

const statusStyles = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  dormant: 'bg-gray-50 text-gray-600 border-gray-200',
  closed: 'bg-gray-50 text-gray-500 border-gray-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
};

interface AccountCardProps {
  account: Account;
  onClick?: () => void;
}

export default function AccountCard({ account, onClick }: AccountCardProps) {
  const config = typeConfig[account.type];
  const Icon = config.icon;
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-cyan-200 hover:shadow-lg transition-all text-left w-full group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white shadow-sm`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${statusStyles[account.status]}`}>
          {account.status}
        </span>
      </div>

      <p className="text-sm text-gray-500">{account.name}</p>
      <p className={`text-2xl font-bold mt-1 ${account.isLiability ? 'text-orange-600' : 'text-gray-900'}`}>
        {account.isLiability ? '-' : ''}{formatCurrency(account.balance)}
      </p>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
        <div>
          <p className="text-xs text-gray-400">Account Number</p>
          <p className="text-sm font-mono text-gray-600 mt-0.5">{maskAccountNumber(account.accountNumber)}</p>
        </div>
        <span className="text-xs text-gray-400 capitalize bg-gray-50 px-2 py-1 rounded-lg">{config.label}</span>
      </div>

      {account.status === 'overdue' && (
        <div className="flex items-center gap-1.5 mt-3 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5" />
          Payment overdue
        </div>
      )}
    </button>
  );
}

export { typeConfig, statusStyles };
