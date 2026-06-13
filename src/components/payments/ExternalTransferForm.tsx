import { useState } from 'react';
import { CheckCircle2, AlertCircle, Clock, Globe, Zap } from 'lucide-react';
import type { PaymentRail, PaymentResult } from '../../types/payments';
import type { PaymentsStore } from '../../hooks/usePaymentsStore';
import { RAIL_CONFIGS, RTGS_THRESHOLD } from '../../config/paymentConfig';
import { formatCurrency } from '../../utils/format';
import { getCoolingRemainingMs, isBeneficiaryTransferable } from '../../services/paymentService';
import PinConfirmModal from './PinConfirmModal';

interface ExternalTransferFormProps {
  store: PaymentsStore;
}

export default function ExternalTransferForm({ store }: ExternalTransferFormProps) {
  const transferable = store.accounts.filter((a) => !a.isLiability && a.status === 'active');
  const [fromId, setFromId] = useState(transferable[0]?.id ?? '');
  const [beneficiaryId, setBeneficiaryId] = useState(store.beneficiaries[0]?.id ?? '');
  const [rail, setRail] = useState<PaymentRail>('imps');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PaymentResult | null>(null);

  const beneficiary = store.beneficiaries.find((b) => b.id === beneficiaryId);
  const railConfig = RAIL_CONFIGS.find((r) => r.rail === rail)!;
  const coolingMs = beneficiary ? getCoolingRemainingMs(beneficiary) : 0;
  const canTransfer = beneficiary ? isBeneficiaryTransferable(beneficiary) : false;

  const handleConfirm = async (pin: string) => {
    setLoading(true);
    const res = await store.applyExternalTransfer(fromId, beneficiaryId, parseFloat(amount), rail, note, pin);
    setResult(res);
    setLoading(false);
    setShowPin(false);
    if (res.success && res.status === 'completed') { setAmount(''); setNote(''); }
  };

  if (result) {
    const isQueued = result.status === 'queued';
    const isPending = result.status === 'pending';
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
          result.success ? (isQueued || isPending ? 'bg-amber-50' : 'bg-emerald-50') : 'bg-red-50'
        }`}>
          {result.success ? (isQueued || isPending ? <Clock className="w-10 h-10 text-amber-500" /> : <CheckCircle2 className="w-10 h-10 text-emerald-500" />) :
            <AlertCircle className="w-10 h-10 text-red-500" />}
        </div>
        <h3 className="text-2xl font-bold text-gray-900">
          {result.success ? `${railConfig.label} ${isPending ? 'Submitted' : isQueued ? 'Queued' : 'Complete'}` : 'Transfer Failed'}
        </h3>
        <p className="text-gray-500 mt-2">{result.message}</p>
        {result.referenceNumber && (
          <p className="font-mono text-sm text-cyan-600 mt-3 bg-cyan-50 inline-block px-4 py-2 rounded-xl">{result.referenceNumber}</p>
        )}
        {result.settlementEta && <p className="text-xs text-gray-400 mt-2">Settlement: {result.settlementEta}</p>}
        <button onClick={() => setResult(null)} className="mt-6 px-6 py-3 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200">
          New Transfer
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-2xl space-y-6">
        <div className="grid sm:grid-cols-2 gap-3">
          {RAIL_CONFIGS.map((r) => (
            <button key={r.rail} type="button" onClick={() => setRail(r.rail)}
              className={`p-4 rounded-xl border text-left transition-all ${
                rail === r.rail ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-500/20' : 'border-gray-200 hover:border-gray-300'
              }`}>
              <div className="flex items-center gap-2 mb-1">
                {r.rail === 'swift' ? <Globe className="w-4 h-4 text-violet-600" /> : <Zap className="w-4 h-4 text-cyan-600" />}
                <span className="font-semibold text-sm">{r.label}</span>
                {r.available247 && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">24/7</span>}
              </div>
              <p className="text-xs text-gray-500">{r.settlementWindow}</p>
              {r.rail === 'rtgs' && <p className="text-xs text-amber-600 mt-1">Min ${RTGS_THRESHOLD.toLocaleString()}</p>}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); if (amount && canTransfer) setShowPin(true); }}
          className="bg-white rounded-2xl border border-gray-100 p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Account</label>
            <select value={fromId} onChange={(e) => setFromId(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm">
              {transferable.map((a) => (
                <option key={a.id} value={a.id}>{a.name} — {formatCurrency(a.balance)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Beneficiary</label>
            <select value={beneficiaryId} onChange={(e) => setBeneficiaryId(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm">
              {store.beneficiaries.map((b) => (
                <option key={b.id} value={b.id}>{b.nickname ?? b.name} — {b.bankName}</option>
              ))}
            </select>
            {beneficiary && !canTransfer && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Cooling period: {Math.ceil(coolingMs / 60000)} min remaining (fraud prevention)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-lg font-semibold" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reference Note</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>

          <button type="submit" disabled={!amount || !canTransfer || store.beneficiaries.length === 0}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold disabled:opacity-50">
            Send via {railConfig.label}
          </button>
        </form>
      </div>

      <PinConfirmModal
        open={showPin}
        amount={formatCurrency(parseFloat(amount) || 0)}
        label={`${railConfig.label} → ${beneficiary?.name}`}
        onConfirm={handleConfirm}
        onClose={() => setShowPin(false)}
        loading={loading}
      />
    </>
  );
}
