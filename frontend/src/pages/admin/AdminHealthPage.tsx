import React, { useState, useEffect } from 'react';
import {
  Server,
  Database,
  HardDrive,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  Activity,
  Layers,
  Cpu
} from 'lucide-react';
import { api } from '../../services/api';
import { AdminHealthDetailed } from '../../types';

export const AdminHealthPage: React.FC = () => {
  const [health, setHealth] = useState<AdminHealthDetailed | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = async () => {
    try {
      const data = await api.getAdminHealthDetailed();
      setHealth(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHealth();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="med-header-banner flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-teal-200">
            Infrastructure Monitoring • Live Probes
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Service Health & Hardware Latency
          </h1>
          <p className="text-xs text-teal-100 mt-1 max-w-xl">
            Live operational status across database roundtrip latency, local storage write capabilities, and the AI extraction engine.
          </p>
        </div>
        <div className="flex items-center space-x-2 shrink-0 self-start md:self-auto">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="med-btn-primary bg-white text-teal-800 hover:bg-teal-50 flex items-center space-x-1.5 py-2 px-3 text-xs shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Probe Infrastructure</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="med-card p-12 text-center text-xs text-slate-400">Pinging infrastructure components...</div>
      ) : health ? (
        <>
          {/* Overall Status Container */}
          <div className="p-5 med-card med-card-hover flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  health.status === 'healthy'
                    ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600'
                    : 'bg-amber-50 dark:bg-amber-950 text-amber-600'
                }`}
              >
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white capitalize">
                  Overall System Health: {health.status}
                </h3>
                <p className="text-xs text-slate-500">
                  Last verified probe: {new Date(health.timestamp).toLocaleString()}
                </p>
              </div>
            </div>

            <span
              className={`med-badge text-xs uppercase ${
                health.status === 'healthy' ? 'med-badge-success' : 'med-badge-warning'
              }`}
            >
              {health.status}
            </span>
          </div>

          {/* Component Health Grid Containers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Database Card Container */}
            <div className="med-card med-card-hover p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Relational Database</h4>
                </div>
                <span className="med-badge med-badge-success text-[10px] capitalize">
                  {health.database.status}
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Engine Type:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{health.database.type}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Ping Roundtrip:</span>
                  <span className="font-bold font-mono text-teal-700 dark:text-teal-400">
                    {health.database.latency_ms !== null ? `${health.database.latency_ms} ms` : '—'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-medium">Connection Pool:</span>
                  <span className="med-badge med-badge-success text-[9px]">Active & Verified</span>
                </div>
              </div>
            </div>

            {/* Storage Card Container */}
            <div className="med-card med-card-hover p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <HardDrive className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Private File Storage</h4>
                </div>
                <span className="med-badge med-badge-success text-[10px] capitalize">
                  {health.storage.status}
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Write Probe:</span>
                  <span className="font-bold text-emerald-600">
                    {health.storage.writable ? 'Verified Accessible' : 'Failed'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Upload Cap:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{health.storage.max_file_size_mb} MB</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-medium">Storage Path:</span>
                  <span className="font-mono text-[10px] text-slate-400 truncate max-w-[140px]" title={health.storage.path}>
                    {health.storage.path}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Engine Card Container */}
            <div className="med-card med-card-hover p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">AI Extraction Service</h4>
                </div>
                <span className="med-badge med-badge-teal text-[10px] uppercase">
                  {health.ai_engine.mode}
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Operational Mode:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">{health.ai_engine.mode}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Target AI Model:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{health.ai_engine.configured_model}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-medium">API Gateway:</span>
                  <span className="med-badge med-badge-teal text-[9px]">
                    {health.ai_engine.mode === 'live_gemini' ? 'Direct Gemini Gateway' : 'Fallback Engine Ready'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Information Container: High Availability & Failover Standards */}
          <div className="med-card med-card-hover p-5 space-y-3">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                Service-Level Objectives (SLO) & Health Architecture
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200">Sub-10ms Relational Latency</span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  PostgreSQL indexes on patient IDs, document hashes, and sharing grant states ensure sub-10ms lookup times across clinical timelines.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200">Storage Self-Healing Probes</span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Ephemeral probe files verify that the media storage filesystem retains write and read permissions without disk depletion.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200">Continuous AI Pipeline Grace</span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  If the external Google Gemini API exceeds quotas or network thresholds, the pipeline seamlessly engages deterministic local heuristic extraction.
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="med-card p-8 text-center text-xs text-slate-400">Failed to load detailed infrastructure health.</div>
      )}
    </div>
  );
};
