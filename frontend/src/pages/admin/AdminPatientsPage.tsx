import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  UserX,
  AlertCircle,
  Lock,
  Shield,
  ShieldCheck,
  FileText,
  KeyRound
} from 'lucide-react';
import { api } from '../../services/api';
import { User } from '../../types';

export const AdminPatientsPage: React.FC = () => {
  const [patients, setPatients] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchPatients = async () => {
    try {
      const data = await api.getAdminUsers();
      setPatients(data.filter((u) => u.role === 'patient'));
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleToggleActive = async (targetUser: User) => {
    setActionLoadingId(targetUser.id);
    setMessage(null);
    try {
      const updated = await api.updateAdminUser(targetUser.id, { is_active: !targetUser.is_active });
      setPatients((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setMessage({
        text: `Patient account ${updated.full_name} status updated to ${updated.is_active ? 'Active' : 'Inactive'}.`,
        type: 'success',
      });
    } catch (err: any) {
      setMessage({
        text: err.response?.data?.detail || 'Failed to update patient status.',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const filtered = patients.filter(
    (p) =>
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = patients.filter((p) => p.is_active).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="med-header-banner flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-teal-200">
            Account Governance • Zero-Knowledge Medical Isolation
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Patient Account Administration
          </h1>
          <p className="text-xs text-teal-100 mt-1 max-w-xl">
            Account status and identity administration. Medical records, timelines, and laboratory reports are strictly isolated and invisible to administrators.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/20 text-white shrink-0 self-start md:self-auto">
          <Lock className="w-4 h-4 text-emerald-300" />
          <span>Clinical Text Redacted / RBAC Guarded</span>
        </div>
      </div>

      {/* Metric Stat Containers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="med-card med-card-hover p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Registered Patients</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{patients.length}</div>
          <div className="text-[11px] text-slate-400">Personal health portals</div>
        </div>
        <div className="med-card med-card-hover p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Active Portals</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{activeCount}</div>
          <div className="text-[11px] text-slate-400">Authenticated patients</div>
        </div>
        <div className="med-card med-card-hover p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Privacy Shield</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-600">Zero-Access</div>
          <div className="text-[11px] text-slate-400">No admin record view</div>
        </div>
        <div className="med-card med-card-hover p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Consent Sovereignty</span>
            <KeyRound className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-600">Patient-Led</div>
          <div className="text-[11px] text-slate-400">Time-bound doctor grants</div>
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
            <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Registered Patient Accounts ({filtered.length})
            </h3>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patients..."
              className="med-input pl-9 pr-3 py-1.5 text-xs w-full"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading patient accounts...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200/80 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4 font-bold">Patient User</th>
                  <th className="py-3 px-4 font-bold">Privacy Clearance</th>
                  <th className="py-3 px-4 font-bold">Account Status</th>
                  <th className="py-3 px-4 font-bold">Registered On</th>
                  <th className="py-3 px-4 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                      <div className="font-semibold">{p.full_name}</div>
                      <div className="text-[10px] text-slate-400">{p.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="med-badge med-badge-teal text-[10px] flex items-center gap-1 w-fit">
                        <Lock className="w-3 h-3" /> Zero-Knowledge Shield
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {p.is_active ? (
                        <span className="med-badge med-badge-success text-[10px] flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="med-badge med-badge-error text-[10px] flex items-center gap-1 w-fit">
                          <UserX className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleActive(p)}
                        disabled={actionLoadingId === p.id}
                        className={p.is_active ? 'med-btn-danger py-1 px-2 text-[10px]' : 'med-btn-secondary py-1 px-2 text-[10px]'}
                      >
                        {actionLoadingId === p.id
                          ? 'Updating...'
                          : p.is_active
                            ? 'Deactivate Account'
                            : 'Activate Account'}
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                      No patient accounts matching this search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Information Container: HIPAA Zero-Knowledge Isolation Guarantee */}
      <div className="med-card med-card-hover p-5 space-y-3">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
            Patient Data Privacy Guarantees & Cryptographic Isolation
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200">Zero-Knowledge Account Separation</span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              System administrators manage user authentication states but are cryptographically prevented from querying patient medical facts or diagnoses.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200">Consent Sovereignty</span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Only the patient can grant and revoke sharing permissions to licensed medical providers for time-bound clinical handovers.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200">Access Audit Transparency</span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Every document view, handover download, and sharing modification is recorded in the immutable audit log for patient inspection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
