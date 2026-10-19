import React, { useState, useEffect } from 'react';
import {
  Activity,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  Shield,
  FileText,
  Clock,
  Lock,
  Database
} from 'lucide-react';
import { api } from '../../services/api';
import { AuditEventItem } from '../../types';

export const AdminAuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('all');

  const fetchLogs = async () => {
    try {
      const data = await api.getAuditLogs(150);
      setLogs(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionBadgeClass = (action: string) => {
    if (action.includes('LOGIN') || action.includes('AUTH')) {
      return 'med-badge-teal';
    }
    if (action.includes('RECORD') || action.includes('DOCUMENT')) {
      return 'med-badge-blue';
    }
    if (action.includes('CONSENT') || action.includes('ROLE')) {
      return 'med-badge-warning';
    }
    if (action.includes('FAIL') || action.includes('DENIED')) {
      return 'med-badge-error';
    }
    return 'med-badge-slate';
  };

  const filtered = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.actor_name.toLowerCase().includes(search.toLowerCase()) ||
      log.actor_email.toLowerCase().includes(search.toLowerCase()) ||
      log.resource_type.toLowerCase().includes(search.toLowerCase());
    const matchesOutcome =
      outcomeFilter === 'all' || log.outcome.toLowerCase() === outcomeFilter;
    return matchesSearch && matchesOutcome;
  });

  const successCount = logs.filter((l) => l.outcome === 'success').length;
  const deniedCount = logs.filter((l) => l.outcome !== 'success').length;
  const uniqueActors = new Set(logs.map((l) => l.actor_email)).size;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="med-header-banner flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-teal-200">
            Security & Compliance • Immutable Audit Trail
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            System Activity & Security Audit Logs
          </h1>
          <p className="text-xs text-teal-100 mt-1 max-w-xl">
            Non-clinical administrative audit log feed recording authentication attempts, document access, role updates, and consent modifications.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/20 text-white shrink-0 self-start md:self-auto">
          <Shield className="w-4 h-4 text-emerald-300" />
          <span>Tamper-Resistant Ledger</span>
        </div>
      </div>

      {/* Audit Stats Containers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="med-card med-card-hover p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Total Logged Events</span>
            <Activity className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{logs.length}</div>
          <div className="text-[11px] text-slate-400">Recorded sessions</div>
        </div>
        <div className="med-card med-card-hover p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Successful Actions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{successCount}</div>
          <div className="text-[11px] text-slate-400">Authorized requests</div>
        </div>
        <div className="med-card med-card-hover p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Security Denials</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600">{deniedCount}</div>
          <div className="text-[11px] text-slate-400">Blocked unauthorized</div>
        </div>
        <div className="med-card med-card-hover p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Unique Actors</span>
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{uniqueActors}</div>
          <div className="text-[11px] text-slate-400">Authenticated identities</div>
        </div>
      </div>

      {/* Main Audit Feed Container */}
      <div className="med-card med-card-hover p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: `All Outcomes (${logs.length})` },
              { id: 'success', label: 'Success' },
              { id: 'denied', label: 'Denied' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setOutcomeFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  outcomeFilter === f.id ? 'med-btn-primary' : 'med-btn-secondary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit records..."
              className="med-input pl-9 pr-3 py-1.5 text-xs w-full"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading audit feed...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200/80 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4 font-bold">Action Event</th>
                  <th className="py-3 px-4 font-bold">Actor</th>
                  <th className="py-3 px-4 font-bold">Target Resource</th>
                  <th className="py-3 px-4 font-bold">Outcome</th>
                  <th className="py-3 px-4 font-bold">Metadata Details</th>
                  <th className="py-3 px-4 text-right font-bold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      <span className={`med-badge ${getActionBadgeClass(log.action)} uppercase tracking-wider`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{log.actor_name}</div>
                      <div className="text-[10px] text-slate-400">{log.actor_email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {log.resource_type} {log.resource_id ? `#${log.resource_id}` : ''}
                    </td>
                    <td className="py-3.5 px-4">
                      {log.outcome === 'success' ? (
                        <span className="med-badge med-badge-success flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" /> Success
                        </span>
                      ) : (
                        <span className="med-badge med-badge-error flex items-center gap-1 w-fit">
                          <XCircle className="w-3 h-3" /> Denied
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-500 font-mono">
                      {log.details && Object.keys(log.details).length > 0 ? (
                        <span className="truncate max-w-xs block" title={JSON.stringify(log.details)}>
                          {JSON.stringify(log.details)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                      No audit records found matching this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Information Container: Compliance & Audit Security Standards */}
      <div className="med-card med-card-hover p-5 space-y-3">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Lock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
            Audit Ledger Integrity & Compliance Standard
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200">Append-Only Immutability</span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Audit log entries are write-once and protected against modification or deletion by any system role.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200">Credential Redaction</span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Passwords, authentication cookies, API tokens, and JWT payloads are strictly excluded prior to ingestion.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200">HIPAA Security Rule § 164.312(b)</span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Hardware and software mechanisms record and examine activity in information systems containing EPHI.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
