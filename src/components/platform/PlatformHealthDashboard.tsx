import { Activity, GitBranch, AlertTriangle, Zap, Loader2, Terminal, Radio, Server } from 'lucide-react';
import type { PlatformTab } from '../../types/platform';
import type { User } from '../../types';
import { usePlatformStore } from '../../hooks/usePlatformStore';
import RegionMap from './RegionMap';
import DeploymentTracker from './DeploymentTracker';
import IncidentLog from './IncidentLog';
import ChaosControlPanel from './ChaosControlPanel';
import InfrastructureViewer from './InfrastructureViewer';

interface PlatformHealthDashboardProps {
  user: User;
}

const tabs: { id: PlatformTab; label: string; description: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  { id: 'health', label: 'Region Health', description: 'Live Prometheus + K8s metrics', icon: <Activity className="w-5 h-5" /> },
  { id: 'deployments', label: 'Deployments', description: 'CI/CD service versions', icon: <GitBranch className="w-5 h-5" /> },
  { id: 'incidents', label: 'Incident Log', description: 'Alert history & root cause', icon: <AlertTriangle className="w-5 h-5" /> },
  { id: 'infrastructure', label: 'Infrastructure (IaC)', description: 'Terraform state mapping', icon: <Server className="w-5 h-5" /> },
  { id: 'chaos', label: 'Chaos Engineering', description: 'Admin evaluation controls', icon: <Zap className="w-5 h-5" />, adminOnly: true },
];

export default function PlatformHealthDashboard({ user }: PlatformHealthDashboardProps) {
  const isAdmin = user.role === 'admin';
  const store = usePlatformStore(isAdmin);
  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="-m-8 min-h-[calc(100vh)] bg-[#070d18] text-gray-200">
      {/* Ops center header bar */}
      <div className="border-b border-white/10 bg-[#0B1426]/80 backdrop-blur px-8 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Terminal className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">DevOps Command Center</h1>
              <p className="text-sm text-gray-500">Infrastructure monitoring · Not customer banking</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {store.metrics && (
              <div className="hidden md:flex items-center gap-6 text-sm font-mono">
                <span className="text-gray-500">PODS <span className="text-emerald-400">{store.metrics.totalPods}</span></span>
                <span className="text-gray-500">REGIONS <span className="text-emerald-400">{store.metrics.healthyRegions}/{store.metrics.regions.length}</span></span>
                <span className="text-gray-500">P99 <span className="text-cyan-400">{store.metrics.avgLatencyMs}ms</span></span>
              </div>
            )}
            <span className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
              <Radio className="w-3 h-3 animate-pulse" />
              LIVE
            </span>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Vertical ops nav — different from dashboard horizontal tabs */}
        <aside className="w-56 shrink-0 border-r border-white/10 p-4 space-y-1">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => store.setActiveTab(tab.id)}
              className={`w-full text-left px-4 py-3.5 rounded-xl transition-all ${
                store.activeTab === tab.id
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                {tab.icon}
                <span className="text-sm font-medium">{tab.label}</span>
                {tab.id === 'incidents' && store.firingCount > 0 && (
                  <span className="ml-auto w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                    {store.firingCount}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-600 mt-1 ml-8">{tab.description}</p>
            </button>
          ))}
        </aside>

        {/* Main ops content */}
        <div className="flex-1 p-8 min-h-[calc(100vh-88px)]">
          {store.loading && !store.metrics ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
              <p className="text-sm text-gray-500 font-mono">Querying prometheus + kubernetes API...</p>
            </div>
          ) : (
            <>
              {store.activeTab === 'health' && store.metrics && <RegionMap metrics={store.metrics} />}
              {store.activeTab === 'deployments' && <DeploymentTracker deployments={store.deployments} />}
              {store.activeTab === 'incidents' && (
                <IncidentLog incidents={store.incidents} onUpdateRootCause={store.updateIncidentRootCause} />
              )}
              {store.activeTab === 'infrastructure' && <InfrastructureViewer />}
              {store.activeTab === 'chaos' && isAdmin && (
                <ChaosControlPanel store={store} triggeredBy={user.name} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
