import React, { useState, useEffect } from 'react';
import {
  Activity,
  Database,
  HardDrive,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Server
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchHealth();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <div className="med-header-banner flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-teal-200">
            System Operations • Service Diagnostics
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Infrastructure & Integration Health
          </h1>
          <p className="text-xs text-teal-100 mt-1 max-w-xl">
            Real-time ping telemetry for relational database connections, private filesystem read/write probes, and AI extraction engine readiness.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="med-btn-primary bg-white text-teal-800 hover:bg-teal-50 flex items-center space-x-1.5 py-2 px-3 text-xs shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Re-probe Services</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="med-card p-12 text-center text-xs text-slate-400">Pinging infrastructure components...</div>
      ) : health ? (
        <div className="space-y-6">
          {/* Top Status Banner */}
          <div className="p-5 med-card flex items-center justify-between">
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

          {/* Component Health Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Database Card */}
            <div className="med-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Relational Database</h4>
                </div>
                <span className="med-badge med-badge-success text-[10px] capitalize">
                  {health.database.status}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Engine Type:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{health.database.type}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Ping Latency:</span>
                  <span className="font-bold font-mono text-teal-700 dark:text-teal-400">
                    {health.database.latency_ms !== null ? `${health.database.latency_ms} ms` : '—'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Connection Pool:</span>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">Active & Healthy</span>
                </div>
              </div>
            </div>

            {/* Storage Card */}
            <div className="med-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <HardDrive className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Private File Storage</h4>
                </div>
                <span className="med-badge med-badge-success text-[10px] capitalize">
                  {health.storage.status}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Write Probe:</span>
                  <span className="font-bold text-emerald-600">
                    {health.storage.writable ? 'Verified Accessible' : 'Failed'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Upload Cap:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{health.storage.max_file_size_mb} MB</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Storage Root:</span>
                  <span className="font-mono text-[10px] text-slate-400 truncate max-w-[140px]" title={health.storage.path}>
                    {health.storage.path}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Engine Card */}
            <div className="med-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">AI Extraction Service</h4>
                </div>
                <span className="med-badge med-badge-teal text-[10px] uppercase">
                  {health.ai_engine.mode}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Configured Model:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{health.ai_engine.configured_model}</span>
                </div>
                <div className="py-1">
                  <span className="text-slate-500 block mb-0.5">Execution Status:</span>
                  <p className="font-semibold text-slate-900 dark:text-white text-[11px]">
                    {health.ai_engine.status}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
