import { useState } from 'react';
import { CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { AmortizationSchedule } from '../../types/loans';

interface Props {
  schedule: AmortizationSchedule;
  highlightOverdue?: boolean;
}

const statusIcon = {
  paid:    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
  due:     <Clock className="w-3.5 h-3.5 text-cyan-400" />,
  overdue: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
  partial: <Clock className="w-3.5 h-3.5 text-yellow-400" />,
  waived:  <CheckCircle className="w-3.5 h-3.5 text-gray-400" />,
};

const statusStyle = {
  paid:    'text-emerald-400',
  due:     'text-cyan-400',
  overdue: 'text-red-400',
  partial: 'text-yellow-400',
  waived:  'text-gray-500',
};

const PAGE = 12;

export default function AmortizationTable({ schedule, highlightOverdue }: Props) {
  const [page, setPage] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const rows = showAll ? schedule.rows : schedule.rows.slice(page * PAGE, (page + 1) * PAGE);
  const totalPages = Math.ceil(schedule.rows.length / PAGE);

  // Find first upcoming or overdue row to auto-scroll to
  const firstActive = schedule.rows.findIndex(r => r.status === 'due' || r.status === 'overdue');

  return (
    <div>
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { label: 'Total Payable', value: `₹${schedule.totalPayable.toLocaleString('en-IN')}` },
          { label: 'Total Interest', value: `₹${schedule.totalInterest.toLocaleString('en-IN')}` },
          { label: 'Total EMIs', value: String(schedule.totalEMIs) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-sm font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="text-left px-3 py-3 text-gray-500 font-medium">#</th>
              <th className="text-left px-3 py-3 text-gray-500 font-medium">Due Date</th>
              <th className="text-right px-3 py-3 text-gray-500 font-medium">EMI</th>
              <th className="text-right px-3 py-3 text-gray-500 font-medium">Principal</th>
              <th className="text-right px-3 py-3 text-gray-500 font-medium">Interest</th>
              <th className="text-right px-3 py-3 text-gray-500 font-medium">Balance</th>
              <th className="text-right px-3 py-3 text-gray-500 font-medium">Cum. Interest</th>
              <th className="text-center px-3 py-3 text-gray-500 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.emiNumber}
                className={`border-b border-white/5 transition-colors ${
                  row.status === 'overdue' && highlightOverdue
                    ? 'bg-red-500/5'
                    : row.status === 'due'
                    ? 'bg-cyan-500/5'
                    : 'hover:bg-white/5'
                } ${row.emiNumber === firstActive ? 'ring-1 ring-cyan-500/30 ring-inset' : ''}`}
              >
                <td className="px-3 py-2.5 text-gray-500">{row.emiNumber}</td>
                <td className="px-3 py-2.5 text-gray-300">
                  {new Date(row.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                  {row.paidOn && (
                    <span className="ml-2 text-emerald-500 text-[10px]">paid {new Date(row.paidOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right text-white font-medium">₹{row.emiAmount.toLocaleString('en-IN')}</td>
                <td className="px-3 py-2.5 text-right text-blue-400">₹{row.principalComponent.toLocaleString('en-IN')}</td>
                <td className="px-3 py-2.5 text-right text-orange-400">₹{row.interestComponent.toLocaleString('en-IN')}</td>
                <td className="px-3 py-2.5 text-right text-gray-300">₹{row.outstandingBalance.toLocaleString('en-IN')}</td>
                <td className="px-3 py-2.5 text-right text-gray-500">₹{row.cumulativeInterest.toLocaleString('en-IN')}</td>
                <td className="px-3 py-2.5">
                  <div className={`flex items-center justify-center gap-1 ${statusStyle[row.status]}`}>
                    {statusIcon[row.status]}
                    <span className="capitalize">{row.status}</span>
                    {row.penaltyApplied && <span className="text-red-400 ml-1">(+₹{row.penaltyApplied})</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination / show all */}
      <div className="flex items-center justify-between mt-3">
        <button
          onClick={() => setShowAll(v => !v)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
        >
          {showAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {showAll ? 'Show less' : `Show all ${schedule.totalEMIs} EMIs`}
        </button>

        {!showAll && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-xs bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg text-gray-400 transition-colors"
            >
              ← Prev
            </button>
            <span className="text-xs text-gray-500">{page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 text-xs bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg text-gray-400 transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
