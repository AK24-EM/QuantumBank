import { useState } from 'react';
import {
  ArrowLeft, Calendar, TrendingDown, CreditCard, FileText,
  XCircle, CheckCircle, Loader2, AlertTriangle, Download,
} from 'lucide-react';
import type { LoanAccount, LoanTab } from '../../types/loans';
import { LOAN_PRODUCTS, generateAmortizationSchedule, simulatePrepayment, processEMIPayment, processLoanClosure, generateNOC } from '../../services/loanService';
import { loanAccounts, getHomeLoanSchedule, getPersonalLoanSchedule, getVehicleLoanSchedule } from '../../data/loanMockData';
import { accounts } from '../../data/mockData';
import AmortizationTable from './AmortizationTable';

interface Props {
  loan: LoanAccount;
  onBack: () => void;
}

function getSchedule(loanId: string) {
  if (loanId === 'loan-home-001') return getHomeLoanSchedule();
  if (loanId === 'loan-personal-001') return getPersonalLoanSchedule();
  if (loanId === 'loan-vehicle-001') return getVehicleLoanSchedule();
  return generateAmortizationSchedule(loanAccounts.find(l => l.id === loanId)!);
}

export default function LoanDetail({ loan, onBack }: Props) {
  const [tab, setTab] = useState<LoanTab>('overview');
  const [prepayAmount, setPrepayAmount] = useState('');
  const [payPin, setPayPin] = useState('');
  const [closePin, setClosePin] = useState('');
  const [loading, setLoading] = useState(false);
  const [payResult, setPayResult] = useState<{ success: boolean; message: string; ref?: string } | null>(null);
  const [closed, setClosed] = useState(false);
  const [nocLoading, setNocLoading] = useState(false);

  const config = LOAN_PRODUCTS.find(p => p.product === loan.product)!;
  const schedule = getSchedule(loan.id);
  const prepaymentSim = prepayAmount ? simulatePrepayment(loan, parseFloat(prepayAmount)) : null;
  const payableAccounts = accounts.filter(a => !a.isLiability && a.status === 'active');

  const tabs: { id: LoanTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview',    label: 'Overview',    icon: <TrendingDown className="w-4 h-4" /> },
    { id: 'schedule',    label: 'Schedule',    icon: <Calendar className="w-4 h-4" /> },
    { id: 'payments',    label: 'Pay EMI',     icon: <CreditCard className="w-4 h-4" /> },
    { id: 'prepayment',  label: 'Prepay',      icon: <TrendingDown className="w-4 h-4" /> },
    { id: 'closure',     label: 'Closure',     icon: <FileText className="w-4 h-4" /> },
  ];

  const handleEMIPayment = async () => {
    if (!payPin) return;
    setLoading(true);
    setPayResult(null);
    const res = await processEMIPayment(
      { loanId: loan.id, amount: loan.emiAmount + loan.totalPenalty, fromAccountId: payableAccounts[0].id, pin: payPin },
      loan,
    );
    setPayResult({ success: res.success, message: res.message, ref: res.referenceNumber });
    setLoading(false);
    setPayPin('');
  };

  const handleClosure = async () => {
    if (!closePin) return;
    setLoading(true);
    const res = await processLoanClosure(loan, closePin, payableAccounts[0].id);
    if (res.success) setClosed(true);
    else setPayResult({ success: false, message: res.message });
    setLoading(false);
  };

  const handleDownloadNOC = async () => {
    setNocLoading(true);
    const { blob, filename } = await generateNOC(loan, `NOC-${Date.now().toString(36).toUpperCase()}`, new Date().toISOString(), 'Aayush Kamble');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setNocLoading(false);
  };

  const progressPct = Math.round(((loan.disbursedAmount - loan.outstandingPrincipal) / loan.disbursedAmount) * 100);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> All Loans
      </button>

      {/* Loan header */}
      <div className="bg-[#0B1426] rounded-2xl border border-white/10 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center text-2xl">{config.icon}</div>
            <div>
              <h2 className="text-xl font-bold text-white">{config.label}</h2>
              <p className="text-sm text-gray-500 font-mono">{loan.accountNumber}</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${loan.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : loan.status === 'overdue' ? 'bg-red-500/10 text-red-400' : 'bg-gray-500/10 text-gray-400'}`}>
            {loan.status.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Disbursed', value: `₹${loan.disbursedAmount.toLocaleString('en-IN')}` },
            { label: 'Outstanding', value: `₹${loan.outstandingPrincipal.toLocaleString('en-IN')}`, highlight: true },
            { label: 'Rate p.a.', value: `${loan.interestRate}%` },
            { label: 'Monthly EMI', value: `₹${loan.emiAmount.toLocaleString('en-IN')}`, highlight: true },
          ].map(({ label, value, highlight }) => (
            <div key={label}>
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-lg font-bold ${highlight ? 'text-cyan-400' : 'text-white'}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="mb-2">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-500">Repayment Progress</span>
            <span className="text-gray-400">{progressPct}% repaid · {loan.remainingTenure} months remaining</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {loan.status === 'overdue' && (
          <div className="mt-3 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-sm text-red-400">
              {loan.missedEmiCount} missed EMI{loan.missedEmiCount > 1 ? 's' : ''}. Penalty: ₹{loan.totalPenalty.toLocaleString('en-IN')}. Pay now to avoid NPA classification.
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0B1426] rounded-xl border border-white/10 p-1 mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all ${tab === t.id ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-gray-500 hover:text-white'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="bg-[#0B1426] rounded-2xl border border-white/10 p-6">
          <h3 className="text-base font-semibold text-white mb-4">Loan Details</h3>
          <div className="grid grid-cols-2 gap-y-4 gap-x-8">
            {[
              { label: 'Account Number', value: loan.accountNumber },
              { label: 'Product', value: config.label },
              { label: 'Disbursed On', value: new Date(loan.disbursedOn).toLocaleDateString('en-IN', { dateStyle: 'long' }) },
              { label: 'Maturity Date', value: new Date(loan.maturityDate).toLocaleDateString('en-IN', { dateStyle: 'long' }) },
              { label: 'Interest Rate', value: `${loan.interestRate}% p.a. (floating)` },
              { label: 'Processing Fee', value: `${config.processingFee}% of loan amount` },
              { label: 'Prepayment Penalty', value: config.prepaymentPenalty > 0 ? `${config.prepaymentPenalty}% of prepayment amount` : 'Nil (RBI mandate)' },
              { label: 'Next Due Date', value: new Date(loan.nextDueDate).toLocaleDateString('en-IN', { dateStyle: 'long' }) },
              { label: 'Auto-Debit', value: loan.autoDebitEnabled ? 'Enabled' : 'Disabled' },
              { label: 'Linked Account', value: accounts.find(a => a.id === loan.linkedAccountId)?.accountNumber ?? '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-sm text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'schedule' && (
        <div className="bg-[#0B1426] rounded-2xl border border-white/10 p-6">
          <h3 className="text-base font-semibold text-white mb-4">Amortization Schedule</h3>
          <AmortizationTable schedule={schedule} highlightOverdue={loan.status === 'overdue'} />
        </div>
      )}

      {tab === 'payments' && (
        <div className="bg-[#0B1426] rounded-2xl border border-white/10 p-6 max-w-md">
          <h3 className="text-base font-semibold text-white mb-6">Pay EMI</h3>

          <div className="bg-white/5 rounded-xl p-4 mb-6 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">EMI Amount</span>
              <span className="text-white font-medium">₹{loan.emiAmount.toLocaleString('en-IN')}</span>
            </div>
            {loan.totalPenalty > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-red-400">Overdue Penalty</span>
                <span className="text-red-400 font-medium">₹{loan.totalPenalty.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="border-t border-white/10 pt-2 flex items-center justify-between text-sm">
              <span className="text-gray-400 font-medium">Total Due</span>
              <span className="text-cyan-400 font-bold text-lg">₹{(loan.emiAmount + loan.totalPenalty).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-1.5 block">Debit From</label>
            <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500">
              {payableAccounts.map(a => (
                <option key={a.id} value={a.id}>{a.name} — ₹{a.balance.toLocaleString('en-IN')}</option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label className="text-xs text-gray-400 mb-1.5 block">Transaction PIN</label>
            <input
              type="password"
              maxLength={4}
              value={payPin}
              onChange={e => setPayPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 4-digit PIN"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500 tracking-widest text-center"
            />
            <p className="text-xs text-gray-600 mt-1 text-center">Demo PIN: 1234</p>
          </div>

          {payResult && (
            <div className={`flex items-center gap-2 p-3 rounded-xl mb-4 ${payResult.success ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
              {payResult.success ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
              <div>
                <p className={`text-sm ${payResult.success ? 'text-emerald-400' : 'text-red-400'}`}>{payResult.message}</p>
                {payResult.ref && <p className="text-xs text-gray-500 mt-0.5">Ref: {payResult.ref}</p>}
              </div>
            </div>
          )}

          <button
            onClick={handleEMIPayment}
            disabled={loading || payPin.length !== 4}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-xl font-medium disabled:opacity-40 flex items-center justify-center gap-2 transition-all"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : `Pay ₹${(loan.emiAmount + loan.totalPenalty).toLocaleString('en-IN')}`}
          </button>
        </div>
      )}

      {tab === 'prepayment' && (
        <div className="bg-[#0B1426] rounded-2xl border border-white/10 p-6 max-w-lg">
          <h3 className="text-base font-semibold text-white mb-2">Part-Prepayment Calculator</h3>
          <p className="text-sm text-gray-500 mb-6">See how a lump-sum payment reduces your tenure and total interest</p>

          <div className="mb-6">
            <label className="text-xs text-gray-400 mb-1.5 block">Prepayment Amount (₹)</label>
            <input
              type="number"
              value={prepayAmount}
              onChange={e => setPrepayAmount(e.target.value)}
              placeholder={`Max: ₹${loan.outstandingPrincipal.toLocaleString('en-IN')}`}
              max={loan.outstandingPrincipal}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>

          {prepaymentSim && (
            <div className="space-y-3">
              {[
                { label: 'Outstanding After', value: `₹${prepaymentSim.newOutstanding.toLocaleString('en-IN')}`, sub: `Currently ₹${prepaymentSim.currentOutstanding.toLocaleString('en-IN')}`, color: 'text-cyan-400' },
                { label: 'Interest Saved', value: `₹${prepaymentSim.interestSaved.toLocaleString('en-IN')}`, sub: 'Over remaining tenure', color: 'text-emerald-400' },
                { label: 'Tenure Reduction', value: `${prepaymentSim.tenureReduction} months`, sub: `New tenure: ${prepaymentSim.newTenure} months`, color: 'text-blue-400' },
                { label: 'Prepayment Penalty', value: prepaymentSim.prepaymentPenalty > 0 ? `₹${prepaymentSim.prepaymentPenalty.toLocaleString('en-IN')}` : 'NIL', sub: config.prepaymentPenalty > 0 ? `${config.prepaymentPenalty}% of prepayment` : 'RBI mandates nil for floating-rate loans', color: prepaymentSim.prepaymentPenalty > 0 ? 'text-orange-400' : 'text-emerald-400' },
                { label: 'Net Savings', value: `₹${prepaymentSim.netSavings.toLocaleString('en-IN')}`, sub: 'Interest saved minus penalty', color: 'text-emerald-400' },
              ].map(({ label, value, sub, color }) => (
                <div key={label} className="flex items-center justify-between bg-white/5 rounded-xl p-4">
                  <div>
                    <p className="text-sm text-white">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
                  </div>
                  <p className={`text-lg font-bold ${color}`}>{value}</p>
                </div>
              ))}

              {prepaymentSim.netSavings > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                  <p className="text-sm text-emerald-400">✓ This prepayment saves you ₹{prepaymentSim.netSavings.toLocaleString('en-IN')} net and closes your loan {prepaymentSim.tenureReduction} months earlier.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'closure' && (
        <div className="bg-[#0B1426] rounded-2xl border border-white/10 p-6 max-w-md">
          <h3 className="text-base font-semibold text-white mb-2">Loan Closure</h3>
          <p className="text-sm text-gray-500 mb-6">Full and final settlement of the outstanding loan balance</p>

          {closed ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-lg font-semibold text-white mb-2">Loan Successfully Closed</p>
              <p className="text-sm text-gray-400 mb-6">Your No-Objection Certificate has been generated.</p>
              <button
                onClick={handleDownloadNOC}
                disabled={nocLoading}
                className="flex items-center gap-2 mx-auto bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-xl font-medium transition-all"
              >
                {nocLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Download NOC Certificate
              </button>
            </div>
          ) : (
            <>
              <div className="bg-white/5 rounded-xl p-4 mb-6 space-y-2">
                {[
                  { label: 'Outstanding Principal', value: `₹${loan.outstandingPrincipal.toLocaleString('en-IN')}` },
                  { label: 'Accrued Penalty', value: loan.totalPenalty > 0 ? `₹${loan.totalPenalty.toLocaleString('en-IN')}` : 'Nil' },
                  { label: 'Prepayment Penalty', value: config.prepaymentPenalty > 0 ? `${config.prepaymentPenalty}% of outstanding` : 'Nil' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className="text-white">{value}</span>
                  </div>
                ))}
                <div className="border-t border-white/10 pt-2 flex items-center justify-between">
                  <span className="text-gray-400 font-medium text-sm">Total Payable</span>
                  <span className="text-cyan-400 font-bold text-lg">
                    ₹{(loan.outstandingPrincipal + loan.totalPenalty).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 mb-6">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                <p className="text-xs text-yellow-300">Once closed, the loan account is permanently settled. A No-Objection Certificate will be generated immediately.</p>
              </div>

              <div className="mb-6">
                <label className="text-xs text-gray-400 mb-1.5 block">Transaction PIN to Confirm</label>
                <input
                  type="password"
                  maxLength={4}
                  value={closePin}
                  onChange={e => setClosePin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 4-digit PIN"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500 tracking-widest text-center"
                />
                <p className="text-xs text-gray-600 mt-1 text-center">Demo PIN: 1234</p>
              </div>

              {payResult && !payResult.success && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <p className="text-sm text-red-400">{payResult.message}</p>
                </div>
              )}

              <button
                onClick={handleClosure}
                disabled={loading || closePin.length !== 4}
                className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white py-3 rounded-xl font-medium disabled:opacity-40 flex items-center justify-center gap-2 transition-all"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing Closure...</> : 'Close Loan & Generate NOC'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
