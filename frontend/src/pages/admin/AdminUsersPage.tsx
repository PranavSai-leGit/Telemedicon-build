import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  ShieldCheck,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Shield,
  KeyRound
} from 'lucide-react';
import { api } from '../../services/api';
import { User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

export const AdminUsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchUsers = async () => {
    try {
      const data = await api.getAdminUsers();
      setUsers(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleActive = async (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
      setMessage({ text: 'You cannot deactivate your own administrative account.', type: 'error' });
      return;
    }

    const activeAdmins = users.filter((u) => u.role === 'administrator' && u.is_active);
    if (targetUser.role === 'administrator' && targetUser.is_active && activeAdmins.length <= 1) {
      setMessage({
        text: 'Action blocked: MediTale must retain at least one active administrator.',
        type: 'error',
      });
      return;
    }

    setActionLoadingId(targetUser.id);
    setMessage(null);
    try {
      const updated = await api.updateAdminUser(targetUser.id, { is_active: !targetUser.is_active });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setMessage({
        text: `User ${updated.full_name} (${updated.email}) successfully ${updated.is_active ? 'activated' : 'deactivated'}.`,
        type: 'success',
      });
    } catch (err: any) {
      setMessage({
        text: err.response?.data?.detail || 'Failed to update user status.',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const patientCount = users.filter((u) => u.role === 'patient').length;
  const clinicianCount = users.filter((u) => u.role === 'clinician').length;
  const adminCount = users.filter((u) => u.role === 'administrator').length;
  const activeCount = users.filter((u) => u.is_active).length;

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'administrator':
        return 'med-badge-teal';
      case 'clinician':
        return 'med-badge-blue';
      case 'patient':
        return 'med-badge-slate';
      default:
        return 'med-badge-slate';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
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

      {/* Metric Stat Containers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="med-card med-card-hover p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Total Accounts</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{users.length}</div>
          <div className="text-[11px] text-emerald-600 font-semibold">{activeCount} active identities</div>
        </div>
        <div className="med-card med-card-hover p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Patients</span>
            <Users className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{patientCount}</div>
          <div className="text-[11px] text-slate-400">Personal health portals</div>
        </div>
        <div className="med-card med-card-hover p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Clinicians</span>
            <UserCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-600">{clinicianCount}</div>
          <div className="text-[11px] text-slate-400">Licensed doctors</div>
        </div>
        <div className="med-card med-card-hover p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Administrators</span>
            <Shield className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-600">{adminCount}</div>
          <div className="text-[11px] text-slate-400">Ops & security clearance</div>
        </div>
      </div>

      {/* Feedback Alert */}
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
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  roleFilter === f.id ? 'med-btn-primary' : 'med-btn-secondary'
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
          <div className="p-8 text-center text-xs text-slate-400">Loading user accounts...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200/80 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4 font-bold">User Identity</th>
                  <th className="py-3 px-4 font-bold">Role</th>
                  <th className="py-3 px-4 font-bold">Account Status</th>
                  <th className="py-3 px-4 font-bold">Registered On</th>
                  <th className="py-3 px-4 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                        <span>{u.full_name}</span>
                        {u.id === currentUser?.id && (
                          <span className="text-[10px] text-teal-600 font-bold bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`med-badge ${getRoleBadgeClass(u.role)} uppercase text-[10px]`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {u.is_active ? (
                        <span className="med-badge med-badge-success flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="med-badge med-badge-error flex items-center gap-1 w-fit">
                          <UserX className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={actionLoadingId === u.id}
                          className={u.is_active ? 'med-btn-danger py-1 px-2 text-[10px]' : 'med-btn-secondary py-1 px-2 text-[10px]'}
                        >
                          {actionLoadingId === u.id
                            ? 'Processing...'
                            : u.is_active
                              ? 'Deactivate'
                              : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                      No user accounts found matching this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Information Container: RBAC Architecture & Governance */}
      <div className="med-card med-card-hover p-5 space-y-3">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <KeyRound className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
            RBAC Account Security Governance & Protections
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200">Last Administrator Lockout Guard</span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              MediTale prevents deactivation of the last active administrator, ensuring platform continuity.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200">Role Boundary Segregation</span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Admins cannot view patient medical histories; clinicians can only query authorized shared records.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200">Session Revocation</span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Deactivating an account immediately blocks subsequent JWT verification and API authentication.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
