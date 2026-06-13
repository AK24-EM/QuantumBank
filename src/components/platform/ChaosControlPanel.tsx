import { useState } from 'react';
import {
  Zap, ServerCrash, Wifi, Database, Rocket, Shield, Loader2, AlertTriangle,
} from 'lucide-react';
import type { ChaosScenario } from '../../types/platform';
import type { PlatformStore } from '../../hooks/usePlatformStore';

const SCENARIOS: {
  id: ChaosScenario;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  params?: { key: string; label: string; default: string }[];
}[] = [
  {
    id: 'pod_crash',
    label: 'Pod Crash',
    description: 'Simulate CrashLoopBackOff in a region. Watch auto-restart recovery.',
    icon: <ServerCrash className="w-5 h-5" />,
    color: 'from-orange-500 to-red-600',
    params: [{ key: 'region', label: 'Target Region', default: 'us-east-1' }],
  },
  {
    id: 'network_latency',
    label: 'Network Latency Injection',
    description: 'Inject inter-service latency. Observe P99 alerts and payment chaos mode.',
    icon: <Wifi className="w-5 h-5" />,
    color: 'from-amber-500 to-orange-600',
    params: [
      { key: 'region', label: 'Target Region', default: 'eu-west-1' },
      { key: 'latencyMs', label: 'Latency (ms)', default: '800' },
    ],
  },
  {
    id: 'db_replication_failure',
    label: 'DB Replication Failure',
    description: 'Trigger regional outage. Traffic reroutes, payments queue, auto-recovery.',
    icon: <Database className="w-5 h-5" />,
    color: 'from-red-500 to-rose-700',
    params: [{ key: 'region', label: 'Primary Region', default: 'us-east-1' }],
  },
  {
    id: 'failed_deployment',
    label: 'Failed Deployment + Rollback',
    description: 'Deploy bad version, fail health checks, watch automated rollback execute.',
    icon: <Rocket className="w-5 h-5" />,
    color: 'from-violet-500 to-purple-700',
    params: [{ key: 'service', label: 'Service', default: 'payment-service' }],
  },
];

interface ChaosControlPanelProps {
  store: PlatformStore;
  triggeredBy: string;
}

export default function ChaosControlPanel({ store, triggeredBy }: ChaosControlPanelProps) {
  const [params, setParams] = useState<Record<string, Record<string, string>>>({});
  const [confirmScenario, setConfirmScenario] = useState<ChaosScenario | null>(null);

  const getParams = (scenario: ChaosScenario) => {
    const config = SCENARIOS.find((s) => s.id === scenario);
    const stored = params[scenario] ?? {};
    return Object.fromEntries(
      (config?.params ?? []).map((p) => [p.key, stored[p.key] ?? p.default]),
    );
  };

  const handleTrigger = async (scenario: ChaosScenario) => {
    setConfirmScenario(null);
    await store.runChaosScenario(scenario, triggeredBy, getParams(scenario));
  };

  return (
    <div className="space-y-6 font-mono">
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 flex items-start gap-3">
        <Shield className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-red-300 text-sm">ADMIN_ONLY — CHAOS_ENGINEERING</p>
          <p className="text-xs text-red-400/80 mt-1">
            Regulatory evaluation controls. All actions logged with parameters and system response.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {SCENARIOS.map((scenario) => (
          <div key={scenario.id} className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${scenario.color} flex items-center justify-center text-white mb-4`}>
              {scenario.icon}
            </div>
            <h4 className="font-semibold text-white text-sm">{scenario.label}</h4>
            <p className="text-xs text-gray-500 mt-1 mb-4">{scenario.description}</p>

            {scenario.params?.map((p) => (
              <div key={p.key} className="mb-3">
                <label className="block text-xs text-gray-600 mb-1">{p.label}</label>
                <input
                  value={params[scenario.id]?.[p.key] ?? p.default}
                  onChange={(e) => setParams((prev) => ({
                    ...prev,
                    [scenario.id]: { ...prev[scenario.id], [p.key]: e.target.value },
                  }))}
                  className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-sm text-gray-300"
                />
              </div>
            ))}

            <button
              onClick={() => setConfirmScenario(scenario.id)}
              disabled={store.chaosRunning}
              className={`w-full py-3 bg-gradient-to-r ${scenario.color} text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2`}
            >
              {store.chaosRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              TRIGGER
            </button>
          </div>
        ))}
      </div>

      {confirmScenario && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setConfirmScenario(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#0B1426] border border-white/20 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
              <h3 className="text-center font-semibold text-white">Confirm Chaos Scenario</h3>
              <p className="text-center text-xs text-gray-500 mt-2">
                Live simulation — incident log and region map will update in real-time.
              </p>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setConfirmScenario(null)} className="flex-1 py-3 bg-white/10 text-gray-300 rounded-xl text-sm">
                  Cancel
                </button>
                <button onClick={() => handleTrigger(confirmScenario)} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-medium">
                  Execute
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {store.chaosLogs.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h4 className="font-semibold text-white text-sm mb-4">CHAOS_ACTION_LOG</h4>
          <div className="space-y-3">
            {store.chaosLogs.map((log) => (
              <div key={log.id} className="p-4 bg-black/30 border border-white/10 rounded-lg text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-emerald-400">{log.id}</span>
                  <span className={`px-2 py-0.5 rounded border capitalize ${
                    log.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                    log.status === 'rolled_back' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                    'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  }`}>
                    {log.status}
                  </span>
                </div>
                <p className="text-white capitalize">{log.scenario.replace(/_/g, ' ')}</p>
                <p className="text-gray-600 mt-1">by={log.triggeredBy} at={new Date(log.triggeredAt).toLocaleString()}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(log.parameters).map(([k, v]) => (
                    <span key={k} className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-400">
                      {k}={v}
                    </span>
                  ))}
                </div>
                <p className="text-gray-400 mt-2">{log.systemResponse}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
