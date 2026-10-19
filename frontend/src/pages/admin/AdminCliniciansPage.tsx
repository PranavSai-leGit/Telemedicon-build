import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Search,
  Filter,
  CheckCircle2,
  UserX,
  AlertCircle,
  Building,
  Award,
  Shield,
  FileCheck,
  UserCheck
} from 'lucide-react';
import { api } from '../../services/api';
import { User } from '../../types';

export const AdminCliniciansPage: React.FC = () => {
  const [clinicians, setClinicians] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchClinicians = async () => {
    try {
      const data = await api.getAdminUsers();
      setClinicians(data.filter((u) => u.role === 'clinician'));
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClinicians();
  }, []);

  const handleToggleActive = async (targetUser: User) => {
    setActionLoadingId(targetUser.id);
    setMessage(null);
    try {
      const updated = await api.updateAdminUser(targetUser.id, { is_active: !targetUser.is_active });
      setClinicians((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setMessage({
        text: `Clinician ${updated.full_name} account status updated to ${updated.is_active ? 'Active' : 'Inactive'}.`,
        type: 'success',
      });
    } catch (err: any) {
      setMessage({
        text: err.response?.data?.detail || 'Failed to update clinician status.',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const filtered = clinicians.filter(
    (c) =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = clinicians.filter((c) => c.is_active).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="med-header-banner flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-teal-200">
            Clinical Operations • Verified Physician Nodes
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Clinician Registry & Governance
          </h1>
          <p className="text-xs text-teal-100 mt-1 max-w-xl">
            Audit licensed physician nodes, verify clinical credential states, and administer platform access for medical personnel.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/20 text-white shrink-0 self-start md:self-auto">
          <Stethoscope className="w-4 h-4 text-emerald-300" />
          <span>Verified Clinical Node Registry</span>
        </div>
      </div>

      {/* Metric Stat Containers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="med-card med-card-hover p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Total Clinicians</span>
            <Stethoscope className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{clinicians.length}</div>
          <div className="text-[11px] text-slate-400">Registered practitioners</div>
        </div>
        <div className="med-card med-card-hover p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Active Licenses</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{activeCount}</div>
          <div className="text-[11px] text-slate-400">Authorized clinical nodes</div>
        </div>
        <div className="med-card med-card-hover p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Credential Verification</span>
            <Award className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-600">100%</div>
          <div className="text-[11px] text-slate-400">Pre-screened identities</div>
        </div>
        <div className="med-card med-card-hover p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Practice Affiliations</span>
            <Building className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">General / Specialty</div>
          <div className="text-[11px] text-slate-400">Multi-disciplinary staff</div>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="font-bold underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Table Card Container */}
      <div className="med-card med-card-hover p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <Stethoscope className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Registered Clinicians ({filtered.length})
            </h3>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clinicians..."
              className="med-input pl-9 pr-3 py-1.5 text-xs w-full"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading clinician directory...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200/80 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4 font-bold">Clinician Identity</th>
                  <th className="py-3 px-4 font-bold">Practice Credentials</th>
                  <th className="py-3 px-4 font-bold">Account Status</th>
                  <th className="py-3 px-4 font-bold">Approved On</th>
                  <th className="py-3 px-4 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                      <div className="font-semibold">{c.full_name}</div>
                      <div className="text-[10px] text-slate-400">{c.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="med-badge med-badge-teal text-[10px]">
                        Medical Practitioner
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {c.is_active ? (
                        <span className="med-badge med-badge-success text-[10px] flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" /> Active License
                        </span>
                      ) : (
                        <span className="med-badge med-badge-error text-[10px] flex items-center gap-1 w-fit">
                          <UserX className="w-3 h-3" /> Suspended
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleActive(c)}
                        disabled={actionLoadingId === c.id}
                        className={c.is_active ? 'med-btn-danger py-1 px-2 text-[10px]' : 'med-btn-secondary py-1 px-2 text-[10px]'}
                      >
                        {actionLoadingId === c.id
                          ? 'Updating...'
                          : c.is_active
                            ? 'Suspend Node'
                            : 'Reinstate Node'}
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                      No clinician records matching this search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Information Container: Clinician Governance Standards */}
      <div className="med-card med-card-hover p-5 space-y-3">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <FileCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
            Physician Clearance & Medical Delegation Framework
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200">License Verification</span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Every clinician account corresponds to a licensed medical practitioner verified prior to platform onboarding.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200">Consent-Gated Access</span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Active licensing does not grant universal patient record visibility. Clinicians require explicit patient consent grants.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200">Audit Traceability</span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              All clinical handovers synthesized and discrepancies resolved by practitioners are permanently logged in the audit trail.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
