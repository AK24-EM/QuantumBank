import { X, Globe, Clock, Shield, Zap, Hash, User, CreditCard, Smartphone, Monitor, Building2, Banknote } from 'lucide-react';
import type { Transaction } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/format';

const channelIcons = {
  mobile: Smartphone,
  web: Monitor,
  branch: Building2,
  atm: Banknote,
};

const statusStyles = {
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  failed: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
};

interface TransactionDetailDrawerProps {
  transaction: Transaction | null;
  accountName: string;
  onClose: () => void;
}

export default function TransactionDetailDrawer({ transaction, accountName, onClose }: TransactionDetailDrawerProps) {
  if (!transaction) return null;

  const ChannelIcon = channelIcons[transaction.channel];
  const statusStyle = statusStyles[transaction.status];

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Transaction Details</h3>
            <p className="text-sm text-gray-500 font-mono mt-0.5">{transaction.referenceId}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="text-center py-4">
            <p className={`text-3xl font-bold ${transaction.type === 'credit' ? 'text-emerald-600' : 'text-gray-900'}`}>
              {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
            </p>
            <span className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
            </span>
          </div>

          <div className="space-y-4">
            {[
              { icon: User, label: 'Counterparty', value: transaction.counterparty },
              { icon: CreditCard, label: 'Account', value: accountName },
              { icon: Hash, label: 'Category', value: transaction.category },
              { icon: ChannelIcon, label: 'Channel', value: transaction.channel.charAt(0).toUpperCase() + transaction.channel.slice(1) },
              { icon: Clock, label: 'Timestamp', value: formatDateTime(transaction.timestamp) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#0B1426] rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-cyan-400" />
              <h4 className="font-semibold text-sm">Observability Layer</h4>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Globe className="w-4 h-4" />
                  Processing Region
                </div>
                <span className="text-sm font-mono text-cyan-300">{transaction.processingRegion}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Clock className="w-4 h-4" />
                  API Latency
                </div>
                <span className={`text-sm font-mono ${transaction.apiLatencyMs < 50 ? 'text-emerald-400' : transaction.apiLatencyMs < 100 ? 'text-amber-400' : 'text-red-400'}`}>
                  {transaction.apiLatencyMs}ms
                </span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-gray-500" />
              <h4 className="font-semibold text-sm text-gray-900">Compliance Flags</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {transaction.complianceFlags.map((flag) => (
                <span key={flag} className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-xs font-mono">
                  {flag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
