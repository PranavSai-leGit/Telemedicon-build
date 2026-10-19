import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
  FileCheck2,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { api } from '../../services/api';
import { AuditEventItem } from '../../types';

export const ClinicianActivityPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const data = await api.getClinicianActivity(100);
        setEvents(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, []);

  const filteredEvents = events.filter(
    (e) =>
      e.action.toLowerCase().includes(search.toLowerCase()) ||
      e.resource_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <div className="med-header-banner flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-teal-200">
            Account Governance • Clinical Actions Log
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Clinician Activity & Audit History
          </h1>
          <p className="text-xs text-teal-100 mt-1 max-w-xl">
            Immutable audit record of all patient data access, handover downloads, and discrepancy resolutions executed from your account.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/20 text-white shrink-0 self-start md:self-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-300" />
          <span>Non-repudiable Activity Trail</span>
        </div>
      </div>

      {/* Main Activity Log */}
      <div className="med-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Recent Clinical Operations ({filteredEvents.length})
            </h3>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit actions..."
              className="med-input pl-9 pr-3 py-1.5 text-xs w-full"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading audit log...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200/80 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4 font-bold">Action</th>
                  <th className="py-3 px-4 font-bold">Resource</th>
                  <th className="py-3 px-4 font-bold">Outcome</th>
                  <th className="py-3 px-4 font-bold">Metadata Details</th>
                  <th className="py-3 px-4 text-right font-bold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      <span className="med-badge med-badge-teal text-[10px] uppercase tracking-wider">
                        {evt.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {evt.resource_type} {evt.resource_id ? `#${evt.resource_id}` : ''}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="med-badge med-badge-success text-[10px] flex items-center gap-1 w-fit capitalize">
                        <CheckCircle2 className="w-3 h-3" /> {evt.outcome}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {evt.details ? JSON.stringify(evt.details) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500">
                      {new Date(evt.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {filteredEvents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No matching audit records found.
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
