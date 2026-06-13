import { useState } from 'react';
import { Shield, ArrowUpRight, Clock, CheckCircle2, XCircle } from 'lucide-react';
import type { PaymentsStore } from '../../hooks/usePaymentsStore';
import { TIER_LIMITS } from '../../config/paymentConfig';
import { formatCurrency } from '../../utils/format';

interface PaymentLimitsPanelProps {
  store: PaymentsStore;
}

export default function PaymentLimitsPanel({ store }: PaymentLimitsPanelProps) {
  const [requestedLimit, setRequestedLimit] = useState('');
  const [justification, setJustification] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const limits = store.limits;
  const internalUsed = store.dailyUsage.internalTotal;
  const externalUsed = store.dailyUsage.externalTotal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestedLimit || !justification.trim()) return;
    store.submitLimitRequest(parseFloat(requestedLimit), justification);
    setSubmitted(true);
    setRequestedLimit('');
    setJustification('');
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center">
            <Shield className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Payment Limits</h3>
            <p className="text-sm text-gray-500 capitalize">{store.tier} tier · Admin-configured</p>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { label: 'Daily Internal Limit', limit: limits.dailyLimit, used: internalUsed },
            { label: 'Daily External Limit', limit: limits.externalDailyLimit, used: externalUsed },
            { label: 'Per-Transaction Limit', limit: limits.perTransactionLimit, used: 0, noBar: true },
          ].map(({ label, limit, used, noBar }) => (
            <div key={label}>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{label}</span>
                <span className="font-medium">
                  {noBar ? formatCurrency(limit) : `${formatCurrency(used)} / ${formatCurrency(limit)}`}
                </span>
              </div>
              {!noBar && (
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${used / limit > 0.8 ? 'bg-amber-500' : 'bg-cyan-500'}`}
                    style={{ width: `${Math.min((used / limit) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-3">All tiers (admin portal configuration):</p>
          <div className="grid grid-cols-3 gap-3 text-xs">
            {Object.entries(TIER_LIMITS).map(([tier, l]) => (
              <div key={tier} className={`p-3 rounded-xl border ${tier === store.tier ? 'border-cyan-300 bg-cyan-50' : 'border-gray-100'}`}>
                <p className="font-medium capitalize">{tier}</p>
                <p className="text-gray-500 mt-1">Daily: {formatCurrency(l.dailyLimit)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <ArrowUpRight className="w-4 h-4 text-cyan-600" />
          Temporary Limit Increase
        </h4>
        <p className="text-sm text-gray-500 mb-4">Routed to compliance officer · Justification required</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Requested Daily Limit ($)</label>
            <input type="number" value={requestedLimit} onChange={(e) => setRequestedLimit(e.target.value)}
              placeholder={`Current: ${limits.dailyLimit}`}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Justification (mandatory)</label>
            <textarea value={justification} onChange={(e) => setJustification(e.target.value)}
              placeholder="Business reason for temporary limit increase..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none" />
          </div>
          <button type="submit" disabled={!requestedLimit || !justification.trim()}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
            Submit for Compliance Review
          </button>
          {submitted && (
            <p className="text-sm text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Request submitted — pending officer approval
            </p>
          )}
        </form>

        {store.limitRequests.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
            <p className="text-sm font-medium text-gray-700">Recent Requests</p>
            {store.limitRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl text-sm">
                <div>
                  <p className="font-medium">{formatCurrency(req.requestedDailyLimit)} daily</p>
                  <p className="text-xs text-gray-400 truncate max-w-xs">{req.justification}</p>
                </div>
                <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                  req.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                  req.status === 'rejected' ? 'bg-red-50 text-red-700' :
                  'bg-amber-50 text-amber-700'
                }`}>
                  {req.status === 'pending' ? <Clock className="w-3 h-3" /> :
                    req.status === 'approved' ? <CheckCircle2 className="w-3 h-3" /> :
                    <XCircle className="w-3 h-3" />}
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
