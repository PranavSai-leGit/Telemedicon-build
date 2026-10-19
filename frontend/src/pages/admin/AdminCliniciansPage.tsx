import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
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

export const AdminCliniciansPage: React.FC = () => {
  const [clinicians, setClinicians] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchClinicians = async () => {
    try {
      const data = await api.getAdminUsers('clinician');
      setClinicians(data);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Failed to load clinician accounts.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClinicians();
  }, []);

  const handleToggleStatus = async (user: UserType) => {
    try {
      const newStatus = !user.is_active;
      await api.updateAdminUser(user.id, { is_active: newStatus });
      setMessage({
        type: 'success',
        text: `Clinician ${user.full_name} has been ${newStatus ? 'activated' : 'deactivated'}.`,
      });
      await fetchClinicians();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Action prohibited.' });
    }
  };

  const filtered = clinicians.filter(
    (c) =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <div className="med-header-banner flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-teal-200">
            System Administration • Healthcare Provider Directory
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Clinician Account Governance
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
                  <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 font-bold flex items-center justify-center text-xs shrink-0">
                          {c.full_name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        <div>
                          <div className="font-bold">{c.full_name}</div>
                          <div className="text-[11px] text-slate-400">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="med-badge med-badge-teal text-[10px]">
                        General Internal Medicine • Board Certified
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {c.is_active ? (
                        <span className="med-badge med-badge-success text-[10px] flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" /> Active Authorized
                        </span>
                      ) : (
                        <span className="med-badge med-badge-error text-[10px] flex items-center gap-1 w-fit">
                          <XCircle className="w-3 h-3" /> Suspended
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(c)}
                        className={`text-xs font-semibold py-1 px-2.5 rounded-lg border transition-all ${c.is_active
                            ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 border-rose-200 dark:border-rose-900/50'
                            : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900/50'
                          }`}
                      >
                        {c.is_active ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No clinician accounts found matching search.
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
