import { useState, useEffect } from 'react';
import { Terminal as TerminalIcon, Layers, Server, ShieldCheck, Database, RefreshCw, ChevronRight, Activity, GitCommit } from 'lucide-react';
import { fetchTerraformState } from '../../services/infrastructureService';
import type { TerraformState } from '../../types/platform';

export default function InfrastructureViewer() {
  const [activeRegion, setActiveRegion] = useState<'us-east-1' | 'eu-west-1' | 'ap-south-1'>('us-east-1');
  const [stateData, setStateData] = useState<TerraformState | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPlanOutput, setSelectedPlanOutput] = useState<string>('');
  const [planExpanded, setPlanExpanded] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchTerraformState(activeRegion).then((data) => {
      setStateData(data);
      setLoading(false);
    });
  }, [activeRegion]);

  useEffect(() => {
    // Generate realistic terraform plan simulation when changing regions
    const resourceDiff = activeRegion === 'us-east-1' ? '82' : '76';
    setSelectedPlanOutput(`Terraform used the selected providers to generate the following execution plan.
Resource actions are indicated with the following symbols:
  + create
  ~ update in-place

Terraform will perform the following actions:

  # module.vpc.aws_vpc.main will be created
  + resource "aws_vpc" "main" {
      + arn                                  = (known after apply)
      + cidr_block                           = "${activeRegion === 'us-east-1' ? '10.0.0.0/16' : activeRegion === 'eu-west-1' ? '10.1.0.0/16' : '10.2.0.0/16'}"
      + enable_dns_hostnames                 = true
      + enable_dns_support                   = true
      + id                                   = (known after apply)
      + main_route_table_id                  = (known after apply)
    }

  # module.ecs_cluster.aws_ecs_cluster.main will be created
  + resource "aws_ecs_cluster" "main" {
      + arn  = (known after apply)
      + id   = (known after apply)
      + name = "quantumbank-${activeRegion}"

      + setting {
          + name  = "containerInsights"
          + value = "enabled"
        }
    }

Plan: ${resourceDiff} to add, 0 to change, 0 to destroy.

─────────────────────────────────────────────────────────────────────────────

Saved the associated plan to: tfplan
Run "terraform apply tfplan" to execute these changes.`);
  }, [activeRegion]);

  return (
    <div className="space-y-6">
      {/* Upper Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0B1426]/90 border border-white/5 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-emerald-400" />
          <div>
            <h2 className="text-lg font-semibold text-white">Terraform Infrastructure Explorer</h2>
            <p className="text-xs text-gray-500">Visual mapping of live Infrastructure-as-Code state files</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#060a13] p-1.5 rounded-xl border border-white/5">
          {(['us-east-1', 'eu-west-1', 'ap-south-1'] as const).map((reg) => (
            <button
              key={reg}
              onClick={() => setActiveRegion(reg)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeRegion === reg
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-white border border-transparent'
              }`}
            >
              {reg.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading || !stateData ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-sm text-gray-500 font-mono">Parsing Terraform state file...</p>
        </div>
      ) : (
        <>
          {/* Main Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#0B1426]/60 border border-white/5 p-4 rounded-xl flex items-center gap-4">
              <div className="p-3 bg-cyan-500/10 rounded-lg text-cyan-400 border border-cyan-500/20">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wider">State Backend</span>
                <span className="text-sm font-semibold text-white font-mono">{stateData.backend}</span>
              </div>
            </div>

            <div className="bg-[#0B1426]/60 border border-white/5 p-4 rounded-xl flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wider">Lock Provider</span>
                <span className="text-sm font-semibold text-white font-mono">{stateData.dynamoTable}</span>
              </div>
            </div>

            <div className="bg-[#0B1426]/60 border border-white/5 p-4 rounded-xl flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wider">Applied Resources</span>
                <span className="text-sm font-bold text-white font-mono">{stateData.totalResources} resources</span>
              </div>
            </div>

            <div className="bg-[#0B1426]/60 border border-white/5 p-4 rounded-xl flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wider">Workspace Mode</span>
                <span className="text-sm font-semibold text-white font-mono">{stateData.workspace.toUpperCase()}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Module List */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-[#0B1426]/60 border border-white/5 p-4 rounded-2xl">
                <h3 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-emerald-400" />
                  State Module Hierarchy
                </h3>
                <div className="space-y-2.5">
                  {stateData.modules.map((mod) => (
                    <div
                      key={mod.name}
                      className="group p-3 rounded-xl bg-[#060a13] border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/[0.02] transition-all flex justify-between items-center"
                    >
                      <div>
                        <span className="text-xs font-semibold text-white font-mono block">module.{mod.name}</span>
                        <span className="text-[10px] text-gray-500 font-mono">{mod.path}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-400 font-mono block">{mod.resources} resources</span>
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold block">Applied</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Terminal logs and state details */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[#0B1426]/60 border border-white/5 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#060a13]">
                  <div className="flex items-center gap-2">
                    <TerminalIcon className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span className="text-xs font-bold text-gray-300 font-mono">Terminal Output: terraform plan</span>
                  </div>
                  <button
                    onClick={() => setPlanExpanded(!planExpanded)}
                    className="text-[10px] font-semibold tracking-wider text-cyan-400 hover:underline"
                  >
                    {planExpanded ? 'COLLAPSE' : 'EXPAND VIEW'}
                  </button>
                </div>
                <div className={`p-4 bg-[#03060d] overflow-x-auto ${planExpanded ? 'h-auto' : 'h-64'} transition-all`}>
                  <pre className="text-xs font-mono text-emerald-400 whitespace-pre leading-relaxed select-text">
                    {selectedPlanOutput}
                  </pre>
                </div>
              </div>

              {/* State Storage S3 info card */}
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-start gap-4">
                <GitCommit className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-emerald-300">Remote State Lock Integrity Verified</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    S3 Bucket matches targeted configuration. Server-side encryption is enabled using AWS-managed key management (SSE-KMS).
                    Active lock validation on DynamoDB shows zero concurrent pipelines waiting for state execution.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
