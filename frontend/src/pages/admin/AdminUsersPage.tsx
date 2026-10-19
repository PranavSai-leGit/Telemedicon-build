import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Lock,
  UserCheck
} from 'lucide-react';
import { api } from '../../services/api';
import { User as UserType } from '../../types';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmUserId, setConfirmUserId] = useState<number | null>(null);

  const fetchUsers = async () => {
    try {
      const data = await api.getAdminUsers();
      setUsers(data);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Failed to load user accounts.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (user: UserType) => {
    try {
      const newStatus = !user.is_active;
      await api.updateAdminUser(user.id, { is_active: newStatus });
      setMessage({
        type: 'success',
        text: `Account for ${user.full_name} has been ${newStatus ? 'activated' : 'deactivated'}.`,
      });
      setConfirmUserId(null);
      await fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Action prohibited.' });
    }
  };

  const handleRoleChange = async (user: UserType, newRole: string) => {
    try {
      await api.updateAdminUser(user.id, { role: newRole });
      setMessage({
        type: 'success',
        text: `Role for ${user.full_name} updated to ${newRole}.`,
      });
      await fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Role change failed.' });
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <div className="med-header-banner flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-teal-200">
            System Administration • Identity & RBAC
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            User Account Management
          </h1>
          <p className="text-xs text-teal-100 mt-1 max-w-xl">
            Control platform accounts, enforce role-based access boundaries, and manage account activation states.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/20 text-white shrink-0 self-start md:self-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-300" />
          <span>Zero Plaintext Secret Exposure</span>
        </div>
      </div>

      {/* Feedback Alert */}
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

      {/* Main Table Card */}
      <div className="med-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: `All Users (${users.length})` },
              { id: 'patient', label: 'Patients' },
              { id: 'clinician', label: 'Clinicians' },
              { id: 'administrator', label: 'Administrators' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setRoleFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${roleFilter === f.id ? 'med-btn-primary' : 'med-btn-secondary'
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
              placeholder="Search by name or email..."
              className="med-input pl-9 pr-3 py-1.5 text-xs w-full"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading accounts...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200/80 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4 font-bold">User Identity</th>
                  <th className="py-3 px-4 font-bold">Role Assignment</th>
                  <th className="py-3 px-4 font-bold">Account Status</th>
                  <th className="py-3 px-4 font-bold">Registration Date</th>
                  <th className="py-3 px-4 text-right font-bold">Status Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 font-bold flex items-center justify-center text-xs shrink-0">
                          {u.full_name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{u.full_name}</div>
                          <div className="text-[11px] text-slate-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u, e.target.value)}
                        className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      >
                        <option value="patient">Patient</option>
                        <option value="clinician">Clinician</option>
                        <option value="administrator">Administrator</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4">
                      {u.is_active ? (
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
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {confirmUserId === u.id ? (
                        <div className="inline-flex items-center space-x-1.5">
                          <span className="text-[10px] text-rose-600 font-bold">Confirm?</span>
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className="med-btn-danger py-1 px-2 text-[10px]"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmUserId(null)}
                            className="med-btn-secondary py-1 px-2 text-[10px]"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmUserId(u.id)}
                          className={`text-xs font-semibold py-1 px-2.5 rounded-lg border transition-all ${u.is_active
                              ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 border-rose-200 dark:border-rose-900/50'
                              : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900/50'
                            }`}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No accounts found matching this filter.
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
