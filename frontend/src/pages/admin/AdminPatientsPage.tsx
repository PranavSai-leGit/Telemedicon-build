import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Calendar,
  Lock,
  UserCheck
} from 'lucide-react';
import { api } from '../../services/api';
import { User as UserType } from '../../types';

export const AdminPatientsPage: React.FC = () => {
  const [patients, setPatients] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPatients = async () => {
    try {
      const data = await api.getAdminUsers('patient');
      setPatients(data);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Failed to load patient accounts.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleToggleStatus = async (user: UserType) => {
    try {
      const newStatus = !user.is_active;
      await api.updateAdminUser(user.id, { is_active: newStatus });
      setMessage({
        type: 'success',
        text: `Patient account for ${user.full_name} has been ${newStatus ? 'activated' : 'deactivated'}.`,
      });
      await fetchPatients();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Action prohibited.' });
    }
  };

  const filtered = patients.filter(
    (p) =>
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <div className="med-header-banner flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-teal-200">
            System Administration • Patient Account Management
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Patient Identity & Access Administration
          </h1>
          <p className="text-xs text-teal-100 mt-1 max-w-xl">
            Administrative account management with strict HIPAA architectural privacy isolation: clinical records and medical text are not accessible to administrators.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/20 text-white shrink-0 self-start md:self-auto">
          <Lock className="w-4 h-4 text-emerald-300" />
          <span>Clinical Text Redacted / RBAC Guarded</span>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${message.type === 'success'
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

      <div className="med-card p-6 space-y-4">
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
                  <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 font-bold flex items-center justify-center text-xs shrink-0">
                          {p.full_name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        <div>
                          <div className="font-bold">{p.full_name}</div>
                          <div className="text-[11px] text-slate-400">{p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="med-badge med-badge-teal text-[10px] flex items-center gap-1 w-fit">
                        <Lock className="w-3 h-3" /> Zero-Knowledge Patient Vault
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {p.is_active ? (
                        <span className="med-badge med-badge-success text-[10px] flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="med-badge med-badge-error text-[10px] flex items-center gap-1 w-fit">
                          <XCircle className="w-3 h-3" /> Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(p)}
                        className={`text-xs font-semibold py-1 px-2.5 rounded-lg border transition-all ${p.is_active
                            ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 border-rose-200 dark:border-rose-900/50'
                            : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900/50'
                          }`}
                      >
                        {p.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No patient accounts found matching search.
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
