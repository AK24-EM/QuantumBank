import { TrendingUp, TrendingDown, Scale } from 'lucide-react';
import type { NetWorthSummary as NetWorthData } from '../../types';
import { formatCurrency } from '../../utils/format';

interface NetWorthSummaryProps {
  summary: NetWorthData;
}

export default function NetWorthSummary({ summary }: NetWorthSummaryProps) {
  return (
    <div className="bg-gradient-to-br from-[#0B1426] via-[#122240] to-[#1a3a5c] rounded-3xl p-8 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <Scale className="w-5 h-5 text-cyan-400" />
          <p className="text-gray-400 text-sm font-medium">Net Worth Summary</p>
        </div>
        <p className="text-5xl font-bold tracking-tight">{formatCurrency(summary.netWorth)}</p>
        <p className="text-gray-400 text-sm mt-2">Total assets minus outstanding loan balances</p>

        <div className="grid sm:grid-cols-2 gap-4 mt-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-gray-400 uppercase tracking-wide">Total Assets</span>
            </div>
            <p className="text-2xl font-semibold text-emerald-400">{formatCurrency(summary.totalAssets)}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-gray-400 uppercase tracking-wide">Outstanding Loans</span>
            </div>
            <p className="text-2xl font-semibold text-orange-400">{formatCurrency(summary.totalLiabilities)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
