import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  FileText,
  Activity,
  AlertCircle,
  CheckCircle2,
  Lock,
  UserCheck,
  Server,
  RefreshCw,
  Clock,
  ShieldAlert,
  Settings,
  HardDrive,
  Sparkles,
  ArrowRight,
  Database,
  ChevronRight
} from 'lucide-react';
import { api } from '../../services/api';
import { AdminStats, AuditEventItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditEventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsRes, logsRes] = await Promise.all([
        api.getAdminStats(),
        api.getAuditLogs(10),
      ]);
      setStats(statsRes);
      setAuditLogs(logsRes);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Administrator Header */}
      <div className="med-header-banner flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-teal-200">
            Platform Operations • Administrator Portal
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            System Administration Overview
          </h1>
          <p className="text-xs text-teal-100 mt-1 max-w-xl">
            System health, document processing throughput, user account governance, and HIPAA security compliance monitoring.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/20 text-white shrink-0 self-start md:self-auto">
          <Lock className="w-4 h-4 text-emerald-300" />
          <span>Clinical Text Redacted / RBAC Guarded</span>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="med-card p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Users</span>
              <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {stats.users.total}
              </span>
              <span className="text-xs text-emerald-600 font-semibold">{stats.users.active} active</span>
            </div>
            <div className="text-[11px] text-slate-400">
              {stats.users.patients} patients • {stats.users.clinicians} clinicians
            </div>
          </div>

          <div className="med-card p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Processed Records</span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {stats.documents.total_processed}
              </span>
              <span className="text-xs text-emerald-600 font-semibold">{stats.documents.completed} completed</span>
            </div>
            <div className="text-[11px] text-slate-400">
              {stats.documents.duplicates_detected} duplicates prevented
            </div>
          </div>

          <div className="med-card p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Database Engine</span>
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600">
                <Database className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                PostgreSQL
              </span>
              <span className="med-badge med-badge-success text-[9px]">JSONB</span>
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold">
              Connected & Healthy
            </div>
          </div>

          <div className="med-card p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">AI Model Mode</span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                Gemini 3.8
              </span>
            </div>
            <div className="text-[11px] text-teal-600 font-semibold truncate">
              Auto fallback engine
            </div>
          </div>
        </div>
      )}

      {/* Administration Dedicated Workspaces Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Administrative Modules
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              to: '/admin/users',
              title: 'User Management',
              desc: 'Activate/deactivate accounts & adjust RBAC roles',
              icon: Users,
              badge: `${stats?.users.total || 0} Accounts`,
            },
            {
              to: '/admin/clinicians',
              title: 'Clinician Directory',
              desc: 'Manage licensed physician nodes and credentials',
              icon: UserCheck,
              badge: `${stats?.users.clinicians || 0} Clinicians`,
            },
            {
              to: '/admin/patients',
              title: 'Patient Accounts',
              desc: 'Patient identity administration with privacy isolation',
              icon: ShieldCheck,
              badge: `${stats?.users.patients || 0} Patients`,
            },
            {
              to: '/admin/processing',
              title: 'Ingestion Pipeline',
              desc: 'Monitor OCR, AI extraction, and deduplication jobs',
              icon: FileText,
              badge: `${stats?.documents.total_processed || 0} Records`,
            },
            {
              to: '/admin/audit',
              title: 'Security Audit Logs',
              desc: 'Searchable tamper-resistant access and change log',
              icon: Activity,
              badge: 'Security Feed',
            },
            {
              to: '/admin/config',
              title: 'System Configuration',
              desc: 'Runtime file limits, formats, and timeout limits',
              icon: Settings,
              badge: 'Runtime Limits',
            },
            {
              to: '/admin/health',
              title: 'Service Health',
              desc: 'Real-time database latency & storage write probes',
              icon: Server,
              badge: 'Live Probes',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="p-5 med-card med-card-hover flex flex-col justify-between space-y-3 group"
              >
                <div className="flex items-start justify-between">
                  <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="med-badge med-badge-teal text-[10px]">{item.badge}</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors flex items-center justify-between">
                    <span>{item.title}</span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    {item.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Security Audit Events */}
      <div className="med-card p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Recent System Activity Stream
            </h3>
            <p className="text-xs text-slate-500">
              Real-time audit log of security and administrative operations across the platform.
            </p>
          </div>
          <Link
            to="/admin/audit"
            className="med-btn-secondary text-xs flex items-center space-x-1"
          >
            <span>Full Audit Trail</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {auditLogs.map((log) => (
            <div key={log.id} className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3">
                <span className="med-badge med-badge-teal text-[10px] font-mono uppercase">
                  {log.action.replace(/_/g, ' ')}
                </span>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {log.actor_name}
                  </span>
                  <span className="text-slate-400 ml-1.5">
                    accessed {log.resource_type} {log.resource_id ? `#${log.resource_id}` : ''}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="med-badge med-badge-success text-[9px] uppercase">
                  {log.outcome}
                </span>
                <span className="text-slate-400 text-[11px]">
                  {new Date(log.created_at).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          {auditLogs.length === 0 && !loading && (
            <div className="p-6 text-center text-xs text-slate-400">
              No audit logs recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
