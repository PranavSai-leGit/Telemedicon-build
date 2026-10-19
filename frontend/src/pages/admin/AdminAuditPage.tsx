import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Layers,
  Lock,
  Calendar
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter((l) => {
    const matchesSearch =
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.actor_name.toLowerCase().includes(search.toLowerCase()) ||
      l.actor_email.toLowerCase().includes(search.toLowerCase()) ||
      l.resource_type.toLowerCase().includes(search.toLowerCase());
    const matchesOutcome = outcomeFilter === 'all' || l.outcome === outcomeFilter;
    return matchesSearch && matchesOutcome;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
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
          <Lock className="w-4 h-4 text-emerald-300" />
          <span>Tamper-Resistant Security Event Feed</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="med-card p-6 space-y-4">
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
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${outcomeFilter === f.id ? 'med-btn-primary' : 'med-btn-secondary'
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
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      <span className="med-badge med-badge-teal text-[10px] uppercase tracking-wider">
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
                        <span className="med-badge med-badge-success text-[10px] flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" /> Success
                        </span>
                      ) : (
                        <span className="med-badge med-badge-error text-[10px] flex items-center gap-1 w-fit">
                          <XCircle className="w-3 h-3" /> Denied
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No audit records found matching this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
