import { useState } from 'react';
import { ArrowLeft, Calculator, CheckCircle, XCircle, Loader2, Info } from 'lucide-react';
import type { EmploymentType, LoanProduct } from '../../types/loans';
import { LOAN_PRODUCTS, calculateEMI, submitLoanApplication } from '../../services/loanService';
import type { LoanApplication } from '../../types/loans';

interface Props {
  onBack: () => void;
  onApplied: (application: LoanApplication) => void;
}

export default function LoanApplicationForm({ onBack, onApplied }: Props) {
  const [step, setStep] = useState<'product' | 'details' | 'result'>('product');
  const [product, setProduct] = useState<LoanProduct>('personal');
  const [amount, setAmount] = useState('');
  const [tenure, setTenure] = useState('');
  const [purpose, setPurpose] = useState('');
  const [empType, setEmpType] = useState<EmploymentType>('salaried');
  const [income, setIncome] = useState('');
  const [obligations, setObligations] = useState('');
  const [empYears, setEmpYears] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LoanApplication | null>(null);

  const config = LOAN_PRODUCTS.find(p => p.product === product)!;
  const parsedAmount = parseFloat(amount) || 0;
  const parsedTenure = parseInt(tenure) || config.minTenure;
  const indicativeEMI = parsedAmount > 0 ? calculateEMI(parsedAmount, config.baseRate, parsedTenure) : 0;

  const handleSubmit = async () => {
    if (!amount || !tenure || !income || !purpose) return;
    setLoading(true);
    try {
      const app = await submitLoanApplication({
        product,
        requestedAmount: parseFloat(amount),
        tenure: parseInt(tenure),
        purpose,
        employmentType: empType,
        annualIncome: parseFloat(income),
        monthlyObligations: parseFloat(obligations) || 0,
        employmentYears: parseInt(empYears) || 1,
      });
      setResult(app);
      setStep('result');
      onApplied(app);
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (score: number) =>
    score >= 750 ? 'text-emerald-400' :
    score >= 650 ? 'text-cyan-400' :
    score >= 550 ? 'text-yellow-400' : 'text-red-400';

  const scoreBg = (score: number) =>
    score >= 750 ? 'from-emerald-500/20 to-emerald-600/10' :
    score >= 650 ? 'from-cyan-500/20 to-blue-600/10' :
    score >= 550 ? 'from-yellow-500/20 to-orange-600/10' : 'from-red-500/20 to-red-600/10';

  if (step === 'result' && result) {
    const { creditScore } = result;
    return (
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Loans
        </button>

        <div className="bg-[#0B1426] rounded-2xl border border-white/10 overflow-hidden">
          {/* Score banner */}
          <div className={`bg-gradient-to-r ${scoreBg(creditScore.score)} px-8 py-6 border-b border-white/10`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Credit Score</p>
                <p className={`text-5xl font-bold ${scoreColor(creditScore.score)}`}>{creditScore.score}</p>
                <p className={`text-sm font-medium capitalize mt-1 ${scoreColor(creditScore.score)}`}>{creditScore.band} — {result.status === 'approved' || result.status === 'disbursed' ? 'Pre-Qualified' : 'Not Eligible'}</p>
              </div>
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${result.status === 'approved' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                {result.status === 'approved'
                  ? <CheckCircle className="w-10 h-10 text-emerald-400" />
                  : <XCircle className="w-10 h-10 text-red-400" />
                }
              </div>
            </div>
          </div>

          <div className="p-8">
            {result.status === 'approved' ? (
              <>
                <h3 className="text-lg font-semibold text-white mb-4">Indicative Offer</h3>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { label: 'Loan Amount', value: `₹${(result.offeredAmount ?? 0).toLocaleString('en-IN')}` },
                    { label: 'Interest Rate', value: `${result.offeredRate}% p.a.` },
                    { label: 'Monthly EMI', value: `₹${calculateEMI(result.offeredAmount ?? 0, result.offeredRate ?? 0, result.offeredTenure ?? 0).toLocaleString('en-IN')}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white/5 rounded-xl p-4 text-center">
                      <p className="text-xs text-gray-500 mb-2">{label}</p>
                      <p className="text-lg font-bold text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-3 mb-6">
                  <Info className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-cyan-300">This is an indicative pre-qualification, not a guarantee. Final terms are subject to document verification and credit committee approval.</p>
                </div>
              </>
            ) : (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-red-400 mb-3">Application Not Eligible</h3>
                <p className="text-sm text-gray-400">{result.rejectionReason ?? 'Does not meet current eligibility criteria.'}</p>
              </div>
            )}

            <h4 className="text-sm font-semibold text-white mb-3">Score Analysis</h4>
            <div className="space-y-2 mb-6">
              {creditScore.rationale.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${r.includes('Excellent') || r.includes('Good') || r.includes('Long') || r.includes('No existing') ? 'bg-emerald-400' : r.includes('High') || r.includes('Multiple') || r.includes('Excess') ? 'bg-red-400' : 'bg-yellow-400'}`} />
                  <span className="text-gray-400">{r}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500">Reference: {result.referenceId}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={step === 'product' ? onBack : () => setStep('product')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> {step === 'product' ? 'Back to Loans' : 'Back'}
      </button>

      <div className="bg-[#0B1426] rounded-2xl border border-white/10 p-8">
        <div className="flex items-center gap-3 mb-8">
          {['product', 'details'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step === s || (step === 'result' && i === 1) ? 'bg-cyan-500 text-white' : 'bg-white/10 text-gray-500'}`}>
                {i + 1}
              </div>
              <span className={`text-sm ${step === s ? 'text-white' : 'text-gray-500'}`}>{s === 'product' ? 'Choose Product' : 'Your Details'}</span>
              {i === 0 && <div className="w-8 h-px bg-white/10 mx-1" />}
            </div>
          ))}
        </div>

        {step === 'product' && (
          <>
            <h2 className="text-xl font-semibold text-white mb-6">Select Loan Product</h2>
            <div className="grid grid-cols-1 gap-3 mb-8">
              {LOAN_PRODUCTS.map(p => (
                <button
                  key={p.product}
                  onClick={() => setProduct(p.product)}
                  className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${product === p.product ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/10 hover:border-white/30'}`}
                >
                  <span className="text-2xl">{p.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium text-white">{p.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>
                  </div>
                  <div className="text-right text-xs text-gray-500 shrink-0">
                    <p>From {p.baseRate}% p.a.</p>
                    <p>₹{(p.minAmount / 1000).toFixed(0)}K – ₹{(p.maxAmount / 100000).toFixed(0)}L</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Amount + tenure + live EMI */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Loan Amount (₹)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder={`${config.minAmount.toLocaleString('en-IN')}`}
                  min={config.minAmount}
                  max={config.maxAmount}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Tenure (months)</label>
                <input
                  type="number"
                  value={tenure}
                  onChange={e => setTenure(e.target.value)}
                  placeholder={`${config.minTenure}–${config.maxTenure}`}
                  min={config.minTenure}
                  max={config.maxTenure}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {indicativeEMI > 0 && (
              <div className="flex items-center gap-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-3 mb-6">
                <Calculator className="w-5 h-5 text-cyan-400 shrink-0" />
                <div>
                  <p className="text-xs text-cyan-300">Indicative EMI at {config.baseRate}% p.a.</p>
                  <p className="text-xl font-bold text-white">₹{indicativeEMI.toLocaleString('en-IN')}/month</p>
                </div>
              </div>
            )}

            <button
              onClick={() => setStep('details')}
              disabled={!amount || !tenure}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-xl font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:from-cyan-400 hover:to-blue-500 transition-all"
            >
              Continue to Details
            </button>
          </>
        )}

        {step === 'details' && (
          <>
            <h2 className="text-xl font-semibold text-white mb-6">Your Financial Details</h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Loan Purpose</label>
                <input
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  placeholder="e.g. Home renovation, Medical emergency"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Employment Type</label>
                <select
                  value={empType}
                  onChange={e => setEmpType(e.target.value as EmploymentType)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="salaried">Salaried</option>
                  <option value="self_employed">Self Employed</option>
                  <option value="business_owner">Business Owner</option>
                  <option value="retired">Retired</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Annual Income (₹)</label>
                  <input
                    type="number"
                    value={income}
                    onChange={e => setIncome(e.target.value)}
                    placeholder="1,200,000"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Monthly Obligations (₹)</label>
                  <input
                    type="number"
                    value={obligations}
                    onChange={e => setObligations(e.target.value)}
                    placeholder="Existing EMIs, rent"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Years in Current Employment</label>
                <input
                  type="number"
                  value={empYears}
                  onChange={e => setEmpYears(e.target.value)}
                  placeholder="4"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-start gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-6">
              <Info className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-500">An eligibility check will run instantly on submission. This is not a credit bureau inquiry and will not affect your credit score.</p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !income || !purpose}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-xl font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking Eligibility...</> : 'Check Eligibility & Apply'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
