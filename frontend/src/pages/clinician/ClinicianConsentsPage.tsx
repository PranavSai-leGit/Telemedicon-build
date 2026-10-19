import React, { useState, useEffect } from 'react';
import {
  Share2,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Calendar,
  FileText
} from 'lucide-react';
import { api } from '../../services/api';
import { ClinicianConsentItem } from '../../types';

export const ClinicianConsentsPage: React.FC = () => {
  const [consents, setConsents] = useState<ClinicianConsentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchConsents = async () => {
      try {
        const data = await api.getClinicianConsents();
        setConsents(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConsents();
  }, []);

  const filteredConsents = consents.filter((c) => {
    const matchesSearch =
      c.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      c.patient_email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <div className="med-header-banner flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-teal-200">
            Consent Governance • Patient Access Control
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Patient Sharing & Consent Grants
          </h1>
          <p className="text-xs text-teal-100 mt-1 max-w-xl">
            Audit time-bound patient authorization scopes, shared document counts, and expiration dates granted to your practice.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/20 text-white shrink-0 self-start md:self-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-300" />
          <span>HIPAA Minimum Necessary Scope</span>
        </div>
      </div>

      {/* Table Card */}
      <div className="med-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: `All Grants (${consents.length})` },
              { id: 'active', label: 'Active' },
              { id: 'expired', label: 'Expired' },
              { id: 'revoked', label: 'Revoked' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${statusFilter === f.id ? 'med-btn-primary' : 'med-btn-secondary'
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
              placeholder="Search by patient..."
              className="med-input pl-9 pr-3 py-1.5 text-xs w-full"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading consent grants...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200/80 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4 font-bold">Grant ID</th>
                  <th className="py-3 px-4 font-bold">Patient</th>
                  <th className="py-3 px-4 font-bold">Shared Records</th>
                  <th className="py-3 px-4 font-bold">Created Date</th>
                  <th className="py-3 px-4 font-bold">Expires At</th>
                  <th className="py-3 px-4 font-bold">Access Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredConsents.map((grant) => (
                  <tr key={grant.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                      #{grant.id}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                      <div className="font-bold">{grant.patient_name}</div>
                      <div className="text-[10px] text-slate-400">{grant.patient_email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="med-badge med-badge-teal text-[10px]">
                        {grant.document_count} documents
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(grant.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {grant.expires_at ? new Date(grant.expires_at).toLocaleDateString() : 'Indefinite until revoked'}
                    </td>
                    <td className="py-3.5 px-4">
                      {grant.status === 'active' && (
                        <span className="med-badge med-badge-success text-[10px] flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" /> Active Authorized
                        </span>
                      )}
                      {grant.status === 'revoked' && (
                        <span className="med-badge med-badge-error text-[10px] flex items-center gap-1 w-fit">
                          <XCircle className="w-3 h-3" /> Revoked by Patient
                        </span>
                      )}
                      {grant.status === 'expired' && (
                        <span className="med-badge med-badge-warning text-[10px] flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3" /> Expired
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredConsents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No consent grants found matching this filter.
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
