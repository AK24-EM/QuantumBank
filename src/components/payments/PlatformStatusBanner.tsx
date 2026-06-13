import { AlertTriangle, CheckCircle2, Clock, Loader2, ServerCrash } from 'lucide-react';
import type { QueuedTransfer } from '../../types/payments';
import { formatCurrency } from '../../utils/format';

interface PlatformStatusBannerProps {
  degradedMode: boolean;
  chaosEnabled: boolean;
  queuedTransfers: QueuedTransfer[];
  onToggleDegraded: (v: boolean) => void;
  onToggleChaos: (v: boolean) => void;
}

export default function PlatformStatusBanner({
  degradedMode, chaosEnabled, queuedTransfers, onToggleDegraded, onToggleChaos,
}: PlatformStatusBannerProps) {
  const queued = queuedTransfers.filter((t) => t.status === 'queued' || t.status === 'processing');
  const processing = queuedTransfers.filter((t) => t.status === 'processing');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-100 rounded-2xl p-4">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Eval Controls</span>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={degradedMode}
            onChange={(e) => onToggleDegraded(e.target.checked)}
            className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
          />
          <ServerCrash className="w-4 h-4 text-amber-500" />
          Degraded Mode
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={chaosEnabled}
            onChange={(e) => onToggleChaos(e.target.checked)}
            className="rounded border-gray-300 text-red-500 focus:ring-red-500"
          />
          <AlertTriangle className="w-4 h-4 text-red-500" />
          Chaos Engineering
        </label>
      </div>

      {degradedMode && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Regional Degradation Active</p>
            <p className="text-sm text-amber-700 mt-1">
              Transfers are being queued transparently and will process automatically on recovery.
            </p>
          </div>
        </div>
      )}

      {queued.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-600" />
            Queued Transfers ({queued.length})
          </h4>
          <div className="space-y-2">
            {queued.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl text-sm">
                <div>
                  <span className="font-medium">{t.toLabel}</span>
                  <span className="text-gray-400 ml-2 capitalize">{t.type}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatCurrency(t.amount)}</span>
                  {t.status === 'processing' ? (
                    <span className="flex items-center gap-1 text-cyan-600 text-xs">
                      <Loader2 className="w-3 h-3 animate-spin" /> Processing
                    </span>
                  ) : (
                    <span className="text-amber-600 text-xs font-medium">Queued</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {!degradedMode && processing.length === 0 && queued.length > 0 && (
            <p className="text-xs text-emerald-600 mt-3 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Recovery in progress — transfers processing automatically
            </p>
          )}
        </div>
      )}
    </div>
  );
}
