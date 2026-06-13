import { Activity, Server, Wifi } from 'lucide-react';
import type { PlatformMetrics } from '../../types/platform';

const statusColors = {
  healthy: { dot: 'bg-emerald-500', ring: 'ring-emerald-500/40', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  degraded: { dot: 'bg-amber-500', ring: 'ring-amber-500/40', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  outage: { dot: 'bg-red-500', ring: 'ring-red-500/40', badge: 'bg-red-500/20 text-red-400 border-red-500/30' },
  recovering: { dot: 'bg-cyan-400 animate-pulse', ring: 'ring-cyan-400/40', badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
};

interface RegionMapProps {
  metrics: PlatformMetrics;
}

export default function RegionMap({ metrics }: RegionMapProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'ACTIVE PODS', value: metrics.totalPods, icon: Server, color: 'text-emerald-400' },
          { label: 'HEALTHY REGIONS', value: `${metrics.healthyRegions}/${metrics.regions.length}`, icon: Activity, color: 'text-cyan-400' },
          { label: 'AVG LATENCY', value: `${metrics.avgLatencyMs}ms`, icon: Wifi, color: 'text-amber-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4 font-mono">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
              <Icon className="w-4 h-4" /> {label}
            </div>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-black/40 border border-white/10 rounded-2xl p-8 relative overflow-hidden min-h-[320px]">
        <div className="absolute inset-0 opacity-30">
          <svg viewBox="0 0 100 70" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            <ellipse cx="50" cy="35" rx="48" ry="30" fill="none" stroke="#10b981" strokeWidth="0.3" strokeDasharray="2 2" />
            <ellipse cx="50" cy="35" rx="35" ry="22" fill="none" stroke="#10b981" strokeWidth="0.2" strokeDasharray="1 3" />
            <line x1="10" y1="35" x2="90" y2="35" stroke="#10b981" strokeWidth="0.15" opacity="0.5" />
            <line x1="50" y1="5" x2="50" y2="65" stroke="#10b981" strokeWidth="0.15" opacity="0.5" />
          </svg>
        </div>

        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-semibold font-mono text-sm">GLOBAL_REGION_MAP</h3>
            <span className="text-xs text-emerald-400 font-mono">poll_interval=5s</span>
          </div>

          <div className="relative h-52">
            {metrics.regions.map((region) => {
              const colors = statusColors[region.status];
              return (
                <div
                  key={region.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                  style={{ left: `${region.mapX}%`, top: `${region.mapY}%` }}
                >
                  <div className={`w-5 h-5 rounded-full ${colors.dot} ring-4 ${colors.ring} cursor-pointer`} />
                  <div className="absolute left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 w-44">
                    <div className="bg-[#0B1426] border border-white/20 rounded-lg p-3 text-xs font-mono">
                      <p className="text-white font-semibold">{region.name}</p>
                      <p className="text-gray-500">{region.id}</p>
                      <p className="text-emerald-400 mt-1 capitalize">{region.status}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.regions.map((region) => {
          const colors = statusColors[region.status];
          const latencyColor = region.latencyMs < 100 ? 'text-emerald-400' : region.latencyMs < 200 ? 'text-amber-400' : 'text-red-400';
          return (
            <div key={region.id} className="bg-white/5 border border-white/10 rounded-xl p-5 font-mono">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-white text-sm">{region.name}</p>
                  <p className="text-xs text-gray-600">{region.id}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded border capitalize ${colors.badge}`}>
                  {region.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-gray-600">latency</p>
                  <p className={`font-bold text-lg ${latencyColor}`}>{region.status === 'outage' ? 'N/A' : `${region.latencyMs}ms`}</p>
                </div>
                <div>
                  <p className="text-gray-600">pods</p>
                  <p className="font-bold text-lg text-white">{region.activePods}/{region.totalPods}</p>
                </div>
                <div>
                  <p className="text-gray-600">cpu</p>
                  <p className="font-bold text-white">{region.cpuUsage}%</p>
                </div>
                <div>
                  <p className="text-gray-600">mem</p>
                  <p className="font-bold text-white">{region.memoryUsage}%</p>
                </div>
              </div>
              <div className="mt-3 w-full bg-white/10 rounded-full h-1">
                <div
                  className={`h-1 rounded-full transition-all ${
                    region.status === 'healthy' ? 'bg-emerald-500' :
                    region.status === 'outage' ? 'bg-red-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${(region.activePods / region.totalPods) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-600 font-mono text-center">
        fetched_at={new Date(metrics.fetchedAt).toISOString()} source={metrics.source}
      </p>
    </div>
  );
}
