import { Wallet, PiggyBank, Landmark, Home, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { accounts, formatCurrency } from '../../data/mockData';
import { maskAccountNumber } from '../../utils/format';

const accountIcons = {
  current: Wallet,
  savings: PiggyBank,
  fixed_deposit: Landmark,
  loan: Home,
};

const accountColors = {
  current: 'from-cyan-500 to-blue-600',
  savings: 'from-emerald-500 to-teal-600',
  fixed_deposit: 'from-violet-500 to-purple-600',
  loan: 'from-orange-500 to-red-600',
};

export default function AccountsPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyAccount = (id: string, number: string) => {
    navigator.clipboard.writeText(number);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {accounts.map((account) => {
          const Icon = accountIcons[account.type];
          return (
            <div
              key={account.id}
              className={`bg-gradient-to-br ${accountColors[account.type]} rounded-2xl p-6 text-white relative overflow-hidden`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <Icon className="w-6 h-6" />
                  <span className="text-xs bg-white/20 px-3 py-1 rounded-full capitalize">{account.type.replace('_', ' ')}</span>
                </div>
                <p className="text-white/80 text-sm">{account.name}</p>
                <p className="text-3xl font-bold mt-1">
                  {account.isLiability ? '-' : ''}{formatCurrency(account.balance)}
                </p>
                <div className="flex items-center justify-between mt-6">
                  <p className="text-white/60 text-sm font-mono">{maskAccountNumber(account.accountNumber)}</p>
                  <button
                    onClick={() => copyAccount(account.id, account.accountNumber)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {copied === account.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Account Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="pb-3 font-medium">Account</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Number</th>
                <th className="pb-3 font-medium text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-4 font-medium text-gray-900">{account.name}</td>
                  <td className="py-4 capitalize text-gray-500">{account.type.replace('_', ' ')}</td>
                  <td className="py-4 capitalize text-gray-500">{account.status}</td>
                  <td className="py-4 font-mono text-gray-500">{maskAccountNumber(account.accountNumber)}</td>
                  <td className="py-4 text-right font-semibold">
                    {account.isLiability ? '-' : ''}{formatCurrency(account.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
