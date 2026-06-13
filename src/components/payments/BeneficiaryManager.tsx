import { useState } from 'react';
import { Plus, Pencil, Trash2, Shield, Clock, Lock } from 'lucide-react';
import type { PaymentRail } from '../../types/payments';
import type { PaymentsStore } from '../../hooks/usePaymentsStore';
import { getCoolingRemainingMs, isBeneficiaryTransferable } from '../../services/paymentService';

interface BeneficiaryManagerProps {
  store: PaymentsStore;
}

export default function BeneficiaryManager({ store }: BeneficiaryManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', accountNumber: '', bankName: '', ifscCode: '', rail: 'imps' as PaymentRail, nickname: '',
  });

  const resetForm = () => {
    setForm({ name: '', accountNumber: '', bankName: '', ifscCode: '', rail: 'imps', nickname: '' });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      store.updateBeneficiary(editingId, form);
    } else {
      store.addBeneficiary(form);
    }
    resetForm();
  };

  const startEdit = (id: string) => {
    const ben = store.beneficiaries.find((b) => b.id === id);
    if (!ben) return;
    setForm({ name: ben.name, accountNumber: ben.accountNumber, bankName: ben.bankName, ifscCode: ben.ifscCode, rail: ben.rail, nickname: ben.nickname ?? '' });
    setEditingId(id);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Beneficiary Management</h3>
          <p className="text-sm text-gray-500">Encrypted at rest · 4-hour cooling period on new payees</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4" /> Add Beneficiary
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 grid sm:grid-cols-2 gap-4">
          <input placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
            className="px-4 py-3 border border-gray-200 rounded-xl text-sm" />
          <input placeholder="Nickname (optional)" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })}
            className="px-4 py-3 border border-gray-200 rounded-xl text-sm" />
          <input placeholder="Account Number" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} required
            className="px-4 py-3 border border-gray-200 rounded-xl text-sm" />
          <input placeholder="Bank Name" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} required
            className="px-4 py-3 border border-gray-200 rounded-xl text-sm" />
          <input placeholder="IFSC / SWIFT Code" value={form.ifscCode} onChange={(e) => setForm({ ...form, ifscCode: e.target.value })} required
            className="px-4 py-3 border border-gray-200 rounded-xl text-sm" />
          <select value={form.rail} onChange={(e) => setForm({ ...form, rail: e.target.value as PaymentRail })}
            className="px-4 py-3 border border-gray-200 rounded-xl text-sm">
            <option value="neft">NEFT</option>
            <option value="rtgs">RTGS</option>
            <option value="imps">IMPS</option>
            <option value="swift">SWIFT</option>
          </select>
          <div className="sm:col-span-2 flex gap-3">
            <button type="submit" className="px-6 py-3 bg-cyan-600 text-white rounded-xl text-sm font-medium">
              {editingId ? 'Update' : 'Save'} Beneficiary
            </button>
            <button type="button" onClick={resetForm} className="px-6 py-3 bg-gray-100 rounded-xl text-sm">Cancel</button>
          </div>
          {!editingId && (
            <p className="sm:col-span-2 text-xs text-amber-600 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> New beneficiaries require a mandatory 4-hour cooling period before transfers
            </p>
          )}
        </form>
      )}

      <div className="grid gap-4">
        {store.beneficiaries.map((ben) => {
          const transferable = isBeneficiaryTransferable(ben);
          const remaining = Math.ceil(getCoolingRemainingMs(ben) / 60000);
          return (
            <div key={ben.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{ben.nickname ?? ben.name}</p>
                  <p className="text-sm text-gray-500">{ben.bankName} · {ben.accountNumber.slice(0, 4)}****{ben.accountNumber.slice(-4)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded uppercase">{ben.rail}</span>
                    <span className="text-xs text-gray-400 font-mono">{ben.encryptedAt}</span>
                    {transferable ? (
                      <span className="text-xs text-emerald-600">Transferable</span>
                    ) : (
                      <span className="text-xs text-amber-600 flex items-center gap-0.5">
                        <Clock className="w-3 h-3" /> {remaining}m cooling
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(ben.id)} className="p-2 hover:bg-gray-100 rounded-lg"><Pencil className="w-4 h-4 text-gray-500" /></button>
                <button onClick={() => store.deleteBeneficiary(ben.id)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 text-red-500" /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
