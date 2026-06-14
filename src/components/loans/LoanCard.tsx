import { AlertCircle, CheckCircle, Clock, TrendingDown } from 'lucide-react';
import type { LoanAccount } from '../../types/loans';
import { LOAN_PRODUCTS } from '../../services/loanService';

interface Props {
  loan: LoanAccount;
  onClick: () => void;
}

const statusConfig = {
  active:     { label: 'Active',     color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle },
  overdue:    { label: 'Overdue',    color: 'text-red-400',     bg: 'bg-red-500/10',     icon: AlertCircle },
  npa:        { label: 'NPA',        color: 'text-red-600',     bg: 'bg-red-500/20',     icon: AlertCircle },
  closed:     { label: 'Closed',     color: 'text-gray-400',    bg: 'bg-gray-500/10',    icon: CheckCircle },
  foreclosed: { label: 'Foreclosed', color: 'text-orange-400',  bg: 'bg-orange-500/10',  icon: AlertCircle },
};

export default function LoanCard({ loan, onClick }: Props) {
  const config = LOAN_PRODUCTS.find(p => p.product === loan.product)!;
  const status = statusConfig[loan.status];
  const StatusIcon = status.icon;
  const progress = Math.round(((loan.disbursedAmount - loan.outstandingPrincipal) / loan.disbursedAmount) * 100);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[#0B1426] rounded-2xl p-6 border border-white/10 hover:border-cyan-500/40 transition-all hover:shadow-lg hover:shadow-cyan-500/5 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center text-2xl">
            {config.icon}
          </div>
          <div>
            <p className="font-semibold text-white group-hover:text-cyan-300 transition-colors">{config.label}</p>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{loan.accountNumber}</p>
          </div>
        </div>
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {status.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">Outstanding</p>
          <p className="text-lg font-bold text-white">
            ₹{loan.outstandingPrincipal.toLocaleString('en-IN')}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Monthly EMI</p>
          <p className="text-lg font-bold text-cyan-400">
            ₹{loan.emiAmount.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Repayment progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-gray-500">Repaid</span>
          <span className="text-gray-400">{progress}% of ₹{loan.disbursedAmount.toLocaleString('en-IN')}</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          <span>Next due: <span className="text-white">{new Date(loan.nextDueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span></span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-500">
          <TrendingDown className="w-3.5 h-3.5" />
          <span>{loan.remainingTenure} EMIs remaining</span>
        </div>
      </div>

      {loan.status === 'overdue' && loan.totalPenalty > 0 && (
        <div className="mt-3 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-400">
            Penalty accrued: ₹{loan.totalPenalty.toLocaleString('en-IN')} — pay now to avoid NPA
          </p>
        </div>
      )}
    </button>
  );
}
