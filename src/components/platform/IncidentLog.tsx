import { AlertTriangle, CheckCircle2, Clock, Search, Flame } from 'lucide-react';
import type { Incident } from '../../types/platform';

const severityStyles = {
  critical: { icon: Flame, color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/30' },
  info: { icon: CheckCircle2, color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/30' },
};

const statusStyles = {
  firing: 'bg-red-500/30 text-red-300 border-red-500/40 animate-pulse',
  investigating: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  resolved: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

interface IncidentLogProps {
  incidents: Incident[];
  onUpdateRootCause?: (id: string, rootCause: string) => void;
}

export default function IncidentLog({ incidents, onUpdateRootCause }: IncidentLogProps) {
  const active = incidents.filter((i) => i.status === 'firing' || i.status === 'investigating');

  return (
    <div className="space-y-4 font-mono">
      {active.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <Flame className="w-5 h-5 text-red-400 shrink-0 animate-pulse" />
          <div>
            <p className="font-medium text-red-300">{active.length} ACTIVE_ALERT{active.length > 1 ? 'S' : ''}</p>
            <p className="text-xs text-red-400/80">streaming real-time updates</p>
          </div>
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm">INCIDENT_LOG</h3>
          <span className="text-xs text-gray-600">{incidents.length} total</span>
        </div>

        <div className="divide-y divide-white/5">
          {incidents.map((incident) => {
            const sev = severityStyles[incident.severity];
            const SevIcon = sev.icon;
            const isActive = incident.status === 'firing' || incident.status === 'investigating';

            return (
              <div key={incident.id} className={`p-5 ${isActive ? 'bg-red-500/5' : ''}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${sev.bg}`}>
                    <SevIcon className={`w-5 h-5 ${sev.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-white text-sm">{incident.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded border capitalize ${statusStyles[incident.status]}`}>
                        {incident.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{incident.description}</p>

                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-600">
                      <span><Clock className="w-3 h-3 inline" /> fired={new Date(incident.firedAt).toLocaleString()}</span>
                      {incident.resolvedAt && <span>resolved={new Date(incident.resolvedAt).toLocaleString()}</span>}
                      {incident.impactDurationMin !== undefined && (
                        <span className="text-amber-400">impact={incident.impactDurationMin}min</span>
                      )}
                      <span>src={incident.alertSource}</span>
                    </div>

                    {incident.rootCause ? (
                      <div className="mt-3 p-3 bg-black/30 border border-white/10 rounded-lg text-xs">
                        <p className="text-gray-600 mb-1 flex items-center gap-1"><Search className="w-3 h-3" /> root_cause</p>
                        <p className="text-gray-300">{incident.rootCause}</p>
                      </div>
                    ) : isActive && onUpdateRootCause && (
                      <input
                        placeholder="> enter root cause..."
                        className="mt-3 w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-xs text-gray-300 placeholder-gray-600"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            onUpdateRootCause(incident.id, e.currentTarget.value.trim());
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
