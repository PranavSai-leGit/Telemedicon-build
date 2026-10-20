import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Clock,
  DollarSign,
  CheckCircle2,
  RefreshCw,
  Server,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { api } from '../../services/api';
import { AIMonitoringMetrics } from '../../types';

export const AdminAIMonitoringPage: React.FC = () => {
  const [metrics, setMetrics] = useState<AIMonitoringMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAdminAIMonitoring(50);
      setMetrics(data);
    } catch (err: any) {
      console.error('Failed to load AI monitoring metrics:', err);
      setError(err.response?.data?.detail || 'Failed to retrieve AI operations telemetry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="med-header-banner flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-teal-200">
            System Operations • AI Governance & Telemetry
          </span>
          <h1 className="text-2xl font-bold mt-1">AI Pipeline & Usage Monitoring</h1>
          <p className="text-sm text-teal-100/90 mt-1">
            Real-time telemetry of LLM extraction calls, token usage, estimated costs, latency, and confidence distributions.
          </p>
        </div>

        <button
          onClick={() => {
            setRefreshing(true);
            fetchMetrics();
          }}
          disabled={refreshing}
          className="med-btn-primary bg-white text-teal-900 hover:bg-teal-50 self-start md:self-auto flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-slate-500 mt-3">Fetching AI usage analytics...</p>
        </div>
      ) : error ? (
        <div className="p-4 med-card bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      ) : metrics ? (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="med-card p-4">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Total AI Requests</span>
                <Cpu className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {metrics.summary.total_requests.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Active provider: {metrics.summary.provider}</p>
            </div>

            <div className="med-card p-4">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Success Rate</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                {metrics.summary.success_rate_percent.toFixed(1)}%
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Graceful fallback on rate limits</p>
            </div>

            <div className="med-card p-4">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Avg Latency</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {metrics.summary.average_latency_ms.toFixed(0)} <span className="text-xs font-normal text-slate-400">ms</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">End-to-end model inference</p>
            </div>

            <div className="med-card p-4">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Estimated Cost</span>
                <DollarSign className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-2">
                ${metrics.summary.estimated_cost_usd.toFixed(4)}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {metrics.summary.total_tokens.toLocaleString()} tokens tracked
              </p>
            </div>
          </div>

          {/* Operational Metrics & Governance Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Confidence Band Distribution */}
            <div className="med-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span>Confidence Distribution</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  Avg: {metrics.summary.average_confidence.toFixed(1)}/100
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      High (85-100)
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {metrics.confidence_distribution.high}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${
                          (metrics.confidence_distribution.high /
                            Math.max(
                              1,
                              metrics.confidence_distribution.high +
                                metrics.confidence_distribution.medium +
                                metrics.confidence_distribution.low
                            )) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      Medium (60-84)
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {metrics.confidence_distribution.medium}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-amber-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${
                          (metrics.confidence_distribution.medium /
                            Math.max(
                              1,
                              metrics.confidence_distribution.high +
                                metrics.confidence_distribution.medium +
                                metrics.confidence_distribution.low
                            )) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      Low (&lt;60 / Incomplete)
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {metrics.confidence_distribution.low}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-rose-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${
                          (metrics.confidence_distribution.low /
                            Math.max(
                              1,
                              metrics.confidence_distribution.high +
                                metrics.confidence_distribution.medium +
                                metrics.confidence_distribution.low
                            )) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-500 space-y-1">
                <p>
                  <strong>Active Model:</strong> <span className="font-mono text-teal-600">{metrics.summary.active_model}</span>
                </p>
              </div>
            </div>

            {/* Provider Distribution */}
            <div className="med-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Server className="w-4 h-4 text-teal-600" />
                  <span>Model Providers & Adapters</span>
                </h3>
              </div>

              <div className="space-y-3">
                {Object.entries(metrics.provider_distribution).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No provider requests logged yet.</p>
                ) : (
                  Object.entries(metrics.provider_distribution).map(([provider, count]) => (
                    <div key={provider} className="p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-900 dark:text-white capitalize">
                        <span>{provider}</span>
                        <span className="med-badge med-badge-teal py-0">{count} calls</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 text-[10px] text-teal-700 dark:text-teal-300">
                Multi-stage pipeline architecture automatically falls back to deterministic rule extraction when API quotas are exhausted.
              </div>
            </div>

            {/* Status Distribution */}
            <div className="med-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-teal-600" />
                  <span>Execution Status</span>
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                {Object.entries(metrics.status_distribution).map(([status, count]) => (
                  <div key={status} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 capitalize">
                    <span className="text-slate-500">{status}:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{count}</span>
                  </div>
                ))}
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Rate Card:</span>
                  <span className="text-slate-400 font-mono text-[11px]">$0.15 / 1M input • $0.60 / 1M output</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-[10px] text-slate-400">
                <strong>Disclaimer:</strong> Token and cost figures represent estimated API usage based on provider rate cards.
              </div>
            </div>
          </div>

          {/* Recent AI Operations Table */}
          <div className="med-card overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Recent AI Ingestion & Inference Invocations
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Showing last {metrics.recent_requests.length} executed operations with latency and error tracking
                </p>
              </div>
            </div>

            {metrics.recent_requests.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 italic">No AI operations logged yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                      <th className="py-3 px-4">Invocation</th>
                      <th className="py-3 px-4">Provider / Model</th>
                      <th className="py-3 px-4">Latency</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Est. Cost</th>
                      <th className="py-3 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {metrics.recent_requests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 dark:text-white capitalize">
                            {req.operation.replace('_', ' ')}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                            {req.request_id}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                            {req.provider}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-mono truncate max-w-xs">
                            {req.model_name}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                          {req.latency_ms.toFixed(0)} ms
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                            req.status === 'success'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200'
                          }`}>
                            {req.status}
                          </span>
                          {req.error_message && (
                            <span className="block text-[9px] text-rose-500 truncate max-w-xs mt-0.5" title={req.error_message}>
                              {req.error_message}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                          ${(req.estimated_cost_usd || 0).toFixed(4)}
                        </td>

                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {new Date(req.created_at).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
};
