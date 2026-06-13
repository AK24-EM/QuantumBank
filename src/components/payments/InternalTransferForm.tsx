import { useState } from 'react';
import { ArrowRight, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import type { PaymentResult } from '../../types/payments';
import type { PaymentsStore } from '../../hooks/usePaymentsStore';
import { formatCurrency } from '../../utils/format';
import PinConfirmModal from './PinConfirmModal';

interface InternalTransferFormProps {
  store: PaymentsStore;
}

export default function InternalTransferForm({ store }: InternalTransferFormProps) {
  const transferable = store.accounts.filter((a) => !a.isLiability && a.status === 'active');
  const [fromId, setFromId] = useState(transferable[0]?.id ?? '');
  const [toId, setToId] = useState(transferable[1]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PaymentResult | null>(null);

  const from = transferable.find((a) => a.id === fromId);
  const remaining = store.limits.dailyLimit - store.dailyUsage.internalTotal;

  const handleConfirm = async (pin: string) => {
    setLoading(true);
    const res = await store.applyInternalTransfer(fromId, toId, parseFloat(amount), note, pin);
    setResult(res);
    setLoading(false);
    setShowPin(false);
    if (res.success && res.status === 'completed') {
      setAmount('');
      setNote('');
    }
  };

  if (result) {
    const isSuccess = result.success;
    const isQueued = result.status === 'queued';
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
          isQueued ? 'bg-amber-50' : isSuccess ? 'bg-emerald-50' : 'bg-red-50'
        }`}>
          {isQueued ? <Clock className="w-10 h-10 text-amber-500" /> :
            isSuccess ? <CheckCircle2 className="w-10 h-10 text-emerald-500" /> :
            <AlertCircle className="w-10 h-10 text-red-500" />}
        </div>
        <h3 className="text-2xl font-bold text-gray-900">
          {isQueued ? 'Transfer Queued' : isSuccess ? 'Transfer Successful' : 'Transfer Failed'}
        </h3>
        <p className="text-gray-500 mt-2">{result.message}</p>
        {result.referenceNumber && (
          <p className="font-mono text-sm text-cyan-600 mt-3 bg-cyan-50 inline-block px-4 py-2 rounded-xl">
            {result.referenceNumber}
          </p>
        )}
        {result.apiLatencyMs && (
          <p className="text-xs text-gray-400 mt-2">Processed in {result.apiLatencyMs}ms · {result.processingRegion}</p>
        )}
        <button onClick={() => setResult(null)} className="mt-6 px-6 py-3 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200">
          Make Another Transfer
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-2xl">
        <div className="bg-cyan-50 border border-cyan-100 rounded-xl px-4 py-3 mb-6 text-sm text-cyan-800">
          Internal transfers process <strong>immediately</strong> via atomic MongoDB transaction.
          Daily limit remaining: <strong>{formatCurrency(remaining)}</strong>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); if (amount && parseFloat(amount) > 0) setShowPin(true); }}
          className="bg-white rounded-2xl border border-gray-100 p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Account</label>
            <select value={fromId} onChange={(e) => setFromId(e.target.value)}
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30">
              {transferable.map((a) => (
                <option key={a.id} value={a.id}>{a.name} — {formatCurrency(a.balance)}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-cyan-600 rotate-90" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Account</label>
            <select value={toId} onChange={(e) => setToId(e.target.value)}
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30">
              {transferable.filter((a) => a.id !== fromId).map((a) => (
                <option key={a.id} value={a.id}>{a.name} — {formatCurrency(a.balance)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00" min="0.01" step="0.01" max={from?.balance}
                className="w-full pl-8 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
            </div>
            <p className="text-xs text-gray-400 mt-1">Per-txn limit: {formatCurrency(store.limits.perTransactionLimit)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reference Note (optional)</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Monthly savings allocation"
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
          </div>

          <button type="submit" disabled={!amount || fromId === toId || parseFloat(amount) > (from?.balance ?? 0)}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50">
            Continue — {amount ? formatCurrency(parseFloat(amount)) : 'Enter Amount'}
          </button>
        </form>
      </div>

      <PinConfirmModal
        open={showPin}
        amount={formatCurrency(parseFloat(amount) || 0)}
        label={`${from?.name} → ${transferable.find((a) => a.id === toId)?.name}`}
        onConfirm={handleConfirm}
        onClose={() => setShowPin(false)}
        loading={loading}
      />
    </>
  );
}
