import { useState } from 'react';
import { PlusCircle, FileText } from 'lucide-react';
import type { LoanAccount, LoanApplication } from '../../types/loans';
import { loanAccounts, pastApplications } from '../../data/loanMockData';
import LoanCard from './LoanCard';
import LoanDetail from './LoanDetail';
import LoanApplicationForm from './LoanApplicationForm';

type View = 'list' | 'detail' | 'apply';

export default function LoansPage() {
  const [view, setView] = useState<View>('list');
  const [selectedLoan, setSelectedLoan] = useState<LoanAccount | null>(null);
  const [applications, setApplications] = useState<LoanApplication[]>(pastApplications);

  const handleApplied = (app: LoanApplication) => {
    setApplications(prev => [app, ...prev]);
  };

  if (view === 'apply') {
    return (
      <LoanApplicationForm
        onBack={() => setView('list')}
        onApplied={(app) => { handleApplied(app); setView('list'); }}
      />
    );
  }

  if (view === 'detail' && selectedLoan) {
    return <LoanDetail loan={selectedLoan} onBack={() => setView('list')} />;
  }

  const totalOutstanding = loanAccounts.reduce((s, l) => s + l.outstandingPrincipal, 0);
  const totalEMI = loanAccounts.filter(l => l.status !== 'closed').reduce((s, l) => s + l.emiAmount, 0);
  const overdueLoans = loanAccounts.filter(l => l.status === 'overdue').length;

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Outstanding', value: `₹${totalOutstanding.toLocaleString('en-IN')}`, sub: `${loanAccounts.length} active loans`, color: 'text-white' },
          { label: 'Monthly EMI Burden', value: `₹${totalEMI.toLocaleString('en-IN')}`, sub: 'Auto-debit on due dates', color: 'text-cyan-400' },
          { label: 'Overdue Accounts', value: String(overdueLoans), sub: overdueLoans > 0 ? 'Immediate action required' : 'All accounts current', color: overdueLoans > 0 ? 'text-red-400' : 'text-emerald-400' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-[#0B1426] rounded-2xl border border-white/10 p-5">
            <p className="text-xs text-gray-500 mb-2">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-600 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Active loans */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Active Loans</h2>
          <button
            onClick={() => setView('apply')}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:from-cyan-400 hover:to-blue-500 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Apply for Loan
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loanAccounts.map(loan => (
            <LoanCard
              key={loan.id}
              loan={loan}
              onClick={() => { setSelectedLoan(loan); setView('detail'); }}
            />
          ))}
        </div>
      </div>

      {/* Application history */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-gray-500" />
          <h2 className="text-base font-semibold text-white">Application History</h2>
        </div>
        <div className="bg-[#0B1426] rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Reference</th>
                <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Product</th>
                <th className="text-right px-5 py-3 text-xs text-gray-500 font-medium">Amount</th>
                <th className="text-center px-5 py-3 text-xs text-gray-500 font-medium">Score</th>
                <th className="text-center px-5 py-3 text-xs text-gray-500 font-medium">Status</th>
                <th className="text-right px-5 py-3 text-xs text-gray-500 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {applications.map(app => {
                const statusColor =
                  app.status === 'approved' || app.status === 'disbursed' ? 'text-emerald-400 bg-emerald-500/10' :
                  app.status === 'rejected' ? 'text-red-400 bg-red-500/10' :
                  'text-yellow-400 bg-yellow-500/10';
                const scoreColor =
                  app.creditScore.score >= 750 ? 'text-emerald-400' :
                  app.creditScore.score >= 650 ? 'text-cyan-400' :
                  app.creditScore.score >= 550 ? 'text-yellow-400' : 'text-red-400';

                return (
                  <tr key={app.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{app.referenceId}</td>
                    <td className="px-5 py-3 text-white capitalize">{app.product} Loan</td>
                    <td className="px-5 py-3 text-right text-white">₹{app.requestedAmount.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`font-bold ${scoreColor}`}>{app.creditScore.score}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColor}`}>{app.status}</span>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-500 text-xs">
                      {new Date(app.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
