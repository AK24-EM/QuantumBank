import { useMemo, useState } from 'react';
import {
  ArrowUpRight, ArrowDownLeft, Filter, ChevronDown, Smartphone, Monitor, Building2, Banknote,
} from 'lucide-react';
import type { Account, Transaction, TransactionFilters } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/format';
import TransactionDetailDrawer from './TransactionDetailDrawer';

const channelIcons = { mobile: Smartphone, web: Monitor, branch: Building2, atm: Banknote };

const statusStyles = {
  completed: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  failed: 'bg-red-50 text-red-700',
};

const defaultFilters: TransactionFilters = {
  dateFrom: '2026-05-01',
  dateTo: '2026-06-12',
  type: 'all',
  amountMin: '',
  amountMax: '',
  accountId: 'all',
};

interface TransactionFeedProps {
  transactions: Transaction[];
  accounts: Account[];
  limit?: number;
  showFilters?: boolean;
}

export default function TransactionFeed({ transactions, accounts, limit = 30, showFilters = true }: TransactionFeedProps) {
  const [filters, setFilters] = useState<TransactionFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const accountMap = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a.name])), [accounts]);

  const filtered = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (tx.date < filters.dateFrom || tx.date > filters.dateTo) return false;
        if (filters.type !== 'all' && tx.type !== filters.type) return false;
        if (filters.accountId !== 'all' && tx.accountId !== filters.accountId) return false;
        if (filters.amountMin && tx.amount < parseFloat(filters.amountMin)) return false;
        if (filters.amountMax && tx.amount > parseFloat(filters.amountMax)) return false;
        return true;
      })
      .slice(0, limit);
  }, [transactions, filters, limit]);

  const activeFilterCount = [
    filters.type !== 'all',
    filters.accountId !== 'all',
    filters.amountMin !== '',
    filters.amountMax !== '',
  ].filter(Boolean).length;

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Transaction Feed</h3>
            <p className="text-sm text-gray-500 mt-0.5">Last {limit} transactions · Click any row for details</p>
          </div>
          {showFilters && (
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 bg-cyan-500 text-white text-xs rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className={`w-4 h-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {showFilters && filtersOpen && (
          <div className="p-5 bg-gray-50 border-b border-gray-100 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date From</label>
              <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date To</label>
              <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value as TransactionFilters['type'] })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="all">All</option>
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Min Amount</label>
              <input type="number" placeholder="0" value={filters.amountMin} onChange={(e) => setFilters({ ...filters, amountMin: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Max Amount</label>
              <input type="number" placeholder="∞" value={filters.amountMax} onChange={(e) => setFilters({ ...filters, amountMax: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Account</label>
              <select value={filters.accountId} onChange={(e) => setFilters({ ...filters, accountId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="all">All Accounts</option>
                {accounts.filter((a) => !a.isLiability).map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-50 bg-gray-50/50">
                <th className="px-5 py-3 font-medium">Reference</th>
                <th className="px-5 py-3 font-medium">Counterparty</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">Channel</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium hidden lg:table-cell">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => {
                const ChannelIcon = channelIcons[tx.channel];
                return (
                  <tr
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className="border-b border-gray-50 hover:bg-cyan-50/30 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4">
                      <p className="font-mono text-xs text-gray-600">{tx.referenceId}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{accountMap[tx.accountId]}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          tx.type === 'credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-500'
                        }`}>
                          {tx.type === 'credit' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <span className="font-medium text-gray-900 truncate max-w-[160px]">{tx.counterparty}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`font-semibold ${tx.type === 'credit' ? 'text-emerald-600' : 'text-gray-900'}`}>
                        {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-gray-500 capitalize">
                        <ChannelIcon className="w-4 h-4" />
                        {tx.channel}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusStyles[tx.status]}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell text-gray-500 text-xs">
                      {formatDateTime(tx.timestamp)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-12 text-center text-gray-400">No transactions match your filters.</div>
        )}
      </div>

      <TransactionDetailDrawer
        transaction={selectedTx}
        accountName={selectedTx ? accountMap[selectedTx.accountId] ?? '' : ''}
        onClose={() => setSelectedTx(null)}
      />
    </>
  );
}
