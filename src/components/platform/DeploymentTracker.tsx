import { ExternalLink, GitCommit, User, Clock, RotateCcw } from 'lucide-react';
import type { ServiceDeployment } from '../../types/platform';

const statusStyles = {
  running: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  rolling_back: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
};

interface DeploymentTrackerProps {
  deployments: ServiceDeployment[];
}

export default function DeploymentTracker({ deployments }: DeploymentTrackerProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <div className="p-5 border-b border-white/10">
        <h3 className="font-semibold text-white font-mono text-sm">DEPLOYMENT_TRACKER</h3>
        <p className="text-xs text-gray-500 mt-1">CI/CD pipeline traceability</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="text-left text-gray-500 border-b border-white/10 text-xs">
              <th className="px-5 py-3">SERVICE</th>
              <th className="px-5 py-3">VERSION</th>
              <th className="px-5 py-3">DEPLOYED</th>
              <th className="px-5 py-3">ENGINEER</th>
              <th className="px-5 py-3">COMMIT</th>
              <th className="px-5 py-3">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {deployments.map((dep) => (
              <tr key={dep.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-5 py-4">
                  <p className="text-emerald-400">{dep.service}</p>
                  <p className="text-xs text-gray-600 mt-0.5 truncate max-w-[200px]">{dep.commitMessage}</p>
                </td>
                <td className="px-5 py-4">
                  <span className="text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded text-xs">{dep.version}</span>
                </td>
                <td className="px-5 py-4 text-gray-500 text-xs">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {new Date(dep.deployedAt).toLocaleString()}
                </td>
                <td className="px-5 py-4 text-gray-400 text-xs">
                  <User className="w-3 h-3 inline mr-1" />
                  {dep.engineer}
                </td>
                <td className="px-5 py-4">
                  <a href={dep.commitUrl} target="_blank" rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1">
                    <GitCommit className="w-3 h-3" />{dep.commitSha}<ExternalLink className="w-3 h-3" />
                  </a>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs capitalize ${statusStyles[dep.status]}`}>
                    {dep.status === 'rolling_back' && <RotateCcw className="w-3 h-3 animate-spin" />}
                    {dep.status.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
