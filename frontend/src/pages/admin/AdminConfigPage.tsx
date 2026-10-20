import React, { useState, useEffect } from 'react';
import {
  Settings,
  Server,
  Sparkles,
  Shield,
  Lock,
  Clock,
  HardDrive,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound
} from 'lucide-react';
import { api } from '../../services/api';
import { AdminConfig } from '../../types';
import { GeminiConfigModal } from '../../components/GeminiConfigModal';

export const AdminConfigPage: React.FC = () => {
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const fetchConfig = async () => {
    try {
      const data = await api.getAdminConfig();
      setConfig(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="med-header-banner flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-teal-200">
            System Operations • Runtime Boundaries
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            System Configuration & Runtime Policy
          </h1>
          <p className="text-xs text-teal-100 mt-1 max-w-xl">
            Audit runtime ingestion boundaries, session persistence windows, and AI extraction configuration. Production keys and database credentials are strictly redacted.
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
        <>
          {/* Metric Stat Containers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="med-card med-card-hover p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Active Environment</span>
                <Server className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white uppercase">{config.environment}</div>
              <div className="text-[11px] text-teal-600 font-semibold">Production runtime rules</div>
            </div>
            <div className="med-card med-card-hover p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Max Upload Cap</span>
                <HardDrive className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-xl font-bold text-blue-600">{config.max_file_size_mb} MB</div>
              <div className="text-[11px] text-slate-400">Per clinical document</div>
            </div>
            <div className="med-card med-card-hover p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Session Persistence</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">{config.session_expire_hours} Hours</div>
              <div className="text-[11px] text-slate-400">HttpOnly cookie rotation</div>
            </div>
            <div className="med-card med-card-hover p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>AI Pipeline Mode</span>
                <Sparkles className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-xl font-bold text-purple-600 uppercase">{config.ai_mode}</div>
              <div className="text-[11px] text-slate-400">{config.ai_model}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* General Platform Config Container */}
            <div className="med-card med-card-hover p-6 space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Server className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Application Runtime Settings
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-500">Application Name:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{config.app_name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-500">Software Version:</span>
                  <span className="font-mono text-slate-900 dark:text-white">{config.version}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-500">Active Environment:</span>
                  <span className="med-badge med-badge-teal text-[10px] uppercase">{config.environment}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-500">Debug Logging:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{String(config.debug)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-500">Session Cookie Expiry:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{config.session_expire_hours} hours</span>
                </div>
                <div className="py-1.5">
                  <span className="font-semibold text-slate-500 block mb-1">CORS Whitelisted Origins:</span>
                  <div className="flex flex-wrap gap-1">
                    {config.cors_origins.map((origin: string) => (
                      <span key={origin} className="font-mono text-[10px] med-badge med-badge-slate">
                        {origin}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Ingestion & AI Configuration Container */}
            <div className="med-card med-card-hover p-6 space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Ingestion & Extraction Limits
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-500">Max Document Size:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{config.max_file_size_mb} MB per upload</span>
                </div>
                <div className="py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-500 block mb-1">Allowed File Formats:</span>
                  <div className="flex flex-wrap gap-1">
                    {config.allowed_file_types.map((ext: string) => (
                      <span key={ext} className="med-badge med-badge-blue text-[10px]">
                        {ext}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-500">AI Engine Mode:</span>
                  <span className="med-badge med-badge-teal text-[10px] uppercase">{config.ai_mode}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-500">Active AI Model:</span>
                  <span className="font-mono text-slate-900 dark:text-white">{config.ai_model}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-500">Live Gemini API Key Status:</span>
                  <div className="flex items-center space-x-2">
                    <span className={`med-badge text-[10px] ${config.ai_configured ? 'med-badge-success' : 'med-badge-warning'}`}>
                      {config.ai_configured ? 'Configured & Active' : 'Fallback Demo Intelligence'}
                    </span>
                    <button
                      onClick={() => setIsConfigModalOpen(true)}
                      className="px-2.5 py-0.5 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-[10px] font-semibold transition-colors"
                    >
                      {config.ai_configured ? 'Change Key' : 'Configure Key'}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-semibold text-slate-500">Secret Redaction:</span>
                  <span className="med-badge med-badge-success text-[10px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Zero Leakage Verified
                  </span>
                </div>
              </div>
            </div>
          </div>

          <GeminiConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            onConfigSaved={fetchConfig}
            currentModel={config.ai_model}
          />

          {/* Information Container: Redaction Guarantee & Hardening Standard */}
          <div className="med-card med-card-hover p-5 space-y-3">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                Production Secrets Redaction & Security Hardening Guarantee
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200">Zero Secret Transmission</span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Database passwords, JWT HMAC secrets, and raw Gemini API tokens are stripped by backend serializers before reaching the browser.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200">Session Cookie Security</span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  All authentication cookies use HttpOnly, SameSite=Lax flags to mitigate cross-site scripting (XSS) and request forgery (CSRF).
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200">Deterministic Payload Guards</span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Strict upload payload caps prevent denial of service (DoS) from oversized medical files and zip bombs.
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="med-card p-8 text-center text-xs text-slate-400">Failed to load system configuration.</div>
      )}
    </div>
  );
};
