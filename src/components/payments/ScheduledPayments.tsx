import { useState } from 'react';
import { Plus, Pause, Play, RefreshCw, Calendar } from 'lucide-react';
import type { ScheduleFrequency } from '../../types/payments';
import type { PaymentsStore } from '../../hooks/usePaymentsStore';
import { formatCurrency } from '../../utils/format';

interface ScheduledPaymentsProps {
  store: PaymentsStore;
}

export default function ScheduledPayments({ store }: ScheduledPaymentsProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', fromAccountId: store.accounts[0]?.id ?? '', toAccountId: store.accounts[1]?.id ?? '',
    beneficiaryId: '', amount: '', frequency: 'monthly' as ScheduleFrequency, isInternal: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    store.addScheduledPayment({
      name: form.name,
      fromAccountId: form.fromAccountId,
      toAccountId: form.isInternal ? form.toAccountId : undefined,
      beneficiaryId: form.isInternal ? undefined : form.beneficiaryId,
      amount: parseFloat(form.amount),
      frequency: form.frequency,
      isInternal: form.isInternal,
      rail: form.isInternal ? undefined : 'neft',
    });
    setShowForm(false);
    setForm({ name: '', fromAccountId: store.accounts[0]?.id ?? '', toAccountId: store.accounts[1]?.id ?? '', beneficiaryId: '', amount: '', frequency: 'monthly', isInternal: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Scheduled & Recurring Payments</h3>
          <p className="text-sm text-gray-500">Background job scheduler · Retry with exponential backoff</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4" /> New Standing Instruction
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <input placeholder="Payment Name (e.g. Monthly Rent)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm" />
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={form.isInternal} onChange={() => setForm({ ...form, isInternal: true })} /> Internal
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={!form.isInternal} onChange={() => setForm({ ...form, isInternal: false })} /> External
            </label>
          </div>
          <select value={form.fromAccountId} onChange={(e) => setForm({ ...form, fromAccountId: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm">
            {store.accounts.filter((a) => !a.isLiability).map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          {form.isInternal ? (
            <select value={form.toAccountId} onChange={(e) => setForm({ ...form, toAccountId: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm">
              {store.accounts.filter((a) => !a.isLiability && a.id !== form.fromAccountId).map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          ) : (
            <select value={form.beneficiaryId} onChange={(e) => setForm({ ...form, beneficiaryId: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm">
              {store.beneficiaries.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required
              className="px-4 py-3 border border-gray-200 rounded-xl text-sm" />
            <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as ScheduleFrequency })}
              className="px-4 py-3 border border-gray-200 rounded-xl text-sm">
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <button type="submit" className="px-6 py-3 bg-cyan-600 text-white rounded-xl text-sm font-medium">Create Schedule</button>
        </form>
      )}

      <div className="space-y-3">
        {store.scheduledPayments.map((payment) => (
          <div key={payment.id} className={`bg-white rounded-2xl border p-5 flex items-center justify-between ${payment.active ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${payment.active ? 'bg-cyan-50' : 'bg-gray-100'}`}>
                <Calendar className={`w-5 h-5 ${payment.active ? 'text-cyan-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="font-medium text-gray-900">{payment.name}</p>
                <p className="text-sm text-gray-500">
                  {formatCurrency(payment.amount)} · {payment.frequency} · Next: {payment.nextDue}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                    payment.lastStatus === 'success' ? 'bg-emerald-50 text-emerald-700' :
                    payment.lastStatus === 'failed' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-500'
                  }`}>
                    {payment.lastStatus ?? 'pending'}
                  </span>
                  {payment.retryCount > 0 && (
                    <span className="text-xs text-amber-600 flex items-center gap-0.5">
                      <RefreshCw className="w-3 h-3" /> Retries: {payment.retryCount}/3
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={() => store.toggleScheduledPayment(payment.id)}
              className="p-2.5 hover:bg-gray-100 rounded-xl">
              {payment.active ? <Pause className="w-5 h-5 text-gray-500" /> : <Play className="w-5 h-5 text-emerald-600" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
