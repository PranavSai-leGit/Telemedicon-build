import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  Lock,
  Server,
  FileCheck2,
  Clock,
  Sparkles,
  Layers,
  Database
} from 'lucide-react';
import { api } from '../../services/api';
import { AdminConfig } from '../../types';

export const AdminConfigPage: React.FC = () => {
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await api.getAdminConfig();
        setConfig(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <div className="med-header-banner flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-teal-200">
            System Administration • Environment Configuration
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Platform Operational Configuration
          </h1>
          <p className="text-xs text-teal-100 mt-1 max-w-xl">
            Audit runtime ingestion boundaries, session persistence windows, and AI extraction configuration.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/20 text-white shrink-0 self-start md:self-auto">
          <Lock className="w-4 h-4 text-emerald-300" />
          <span>Production Secret Redaction Verified</span>
        </div>
      </div>

      {loading ? (
        <div className="med-card p-12 text-center text-xs text-slate-400">Loading configuration...</div>
      ) : config ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* General Platform Config */}
          <div className="med-card p-6 space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Server className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Application Runtime Settings
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-500">Application Name:</span>
                <span className="font-bold text-slate-900 dark:text-white">{config.app_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-500">Software Version:</span>
                <span className="font-mono text-slate-900 dark:text-white">{config.version}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-500">Active Environment:</span>
                <span className="med-badge med-badge-teal text-[10px] uppercase">{config.environment}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-500">Debug Logging:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{String(config.debug)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-500">Session Cookie Expiry:</span>
                <span className="font-bold text-slate-900 dark:text-white">{config.session_expire_hours} hours</span>
              </div>
              <div className="py-1">
                <span className="font-semibold text-slate-500 block mb-1">CORS Whitelisted Origins:</span>
                <div className="flex flex-wrap gap-1">
                  {config.cors_origins.map((origin) => (
                    <span key={origin} className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                      {origin}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Ingestion & AI Configuration */}
          <div className="med-card p-6 space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Ingestion & Extraction Limits
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-500">Max Document Size:</span>
                <span className="font-bold text-slate-900 dark:text-white">{config.max_file_size_mb} MB per upload</span>
              </div>
              <div className="py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-500 block mb-1">Allowed File Formats:</span>
                <div className="flex flex-wrap gap-1">
                  {config.allowed_file_types.map((ext) => (
                    <span key={ext} className="med-badge med-badge-blue text-[10px]">
                      {ext}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-500">AI Engine Mode:</span>
                <span className="med-badge med-badge-teal text-[10px] uppercase">{config.ai_mode}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-500">Active AI Model:</span>
                <span className="font-mono text-slate-900 dark:text-white">{config.ai_model}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-500">Live Gemini API Key Status:</span>
                <span className={`med-badge text-[10px] ${config.ai_configured ? 'med-badge-success' : 'med-badge-warning'}`}>
                  {config.ai_configured ? 'Configured & Active' : 'Fallback Demo Intelligence'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-semibold text-slate-500">Storage Directory:</span>
                <span className="font-mono text-[10px] text-slate-400 truncate max-w-[200px]" title={config.storage_directory}>
                  {config.storage_directory}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
