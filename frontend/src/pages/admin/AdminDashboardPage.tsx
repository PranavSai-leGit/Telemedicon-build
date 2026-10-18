import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  FileText,
  Activity,
  AlertCircle,
  CheckCircle2,
  Lock,
  UserCheck,
  Server,
  RefreshCw,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { api } from '../../services/api';
import { AdminStats, User as UserType, AuditEventItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [usersList, setUsersList] = useState<UserType[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    try {
      const [statsRes, usersRes, logsRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getAuditLogs(30),
      ]);
      setStats(statsRes);
      setUsersList(usersRes);
      setAuditLogs(logsRes);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Failed to load administrator data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleUserStatus = async (targetUser: UserType) => {
    try {
      const newStatus = !targetUser.is_active;
      await api.updateAdminUser(targetUser.id, { is_active: newStatus });
      setMessage({
        type: 'success',
        text: `User ${targetUser.full_name} has been ${newStatus ? 'activated' : 'deactivated'}.`,
      });
      await fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Action prohibited.' });
    }
  };

  const handleChangeRole = async (targetUser: UserType, newRole: string) => {
    try {
      await api.updateAdminUser(targetUser.id, { role: newRole });
      setMessage({
        type: 'success',
        text: `Role for ${targetUser.full_name} updated to ${newRole}.`,
      });
      await fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Action prohibited.' });
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Administrator Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              System Administration & Security
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              Admin Governance
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            System health monitoring, role-based account management, and security audit logging.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors self-start sm:self-auto"
          title="Refresh metrics"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Strict Privacy Shield Banner */}
      <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40 text-xs text-purple-900 dark:text-purple-300 flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Healthcare Privacy & Segregation Policy:</span>
          <p className="text-[11px] mt-0.5 text-purple-800 dark:text-purple-300">
            Administrators manage system identities and access permissions only. Under MediTale's zero-knowledge clinical isolation policy, medical documents and clinical notes are never exposed in administrative views.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border flex items-start space-x-3 text-xs font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{message.text}</span>
        </div>
      )}

      {/* System Metrics Grid */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Registered Users</span>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {stats.users.total}
              </span>
              <span className="text-xs text-slate-400">accounts</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-2">
              <span>{stats.users.patients} Patients</span>
              <span>•</span>
              <span>{stats.users.clinicians} Clinicians</span>
              <span>•</span>
              <span>{stats.users.administrators} Admins</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Documents Ingested</span>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {stats.documents.total_processed}
              </span>
              <span className="text-xs text-emerald-600 font-medium">{stats.documents.completed} completed</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Duplicates Flagged: {stats.documents.duplicates_detected} (SHA-256)
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Database Engine</span>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-xl font-bold text-slate-900 dark:text-white">PostgreSQL 18</span>
              <span className="text-xs text-emerald-600 font-medium">JSONB Active</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Driver: Psycopg 3 Pool
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">AI Service Health</span>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-xl font-bold text-slate-900 dark:text-white">Gemini + Demo</span>
              <span className="text-xs text-emerald-600 font-medium">Ready</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Structured Pydantic Validation
            </div>
          </div>
        </div>
      )}

      {/* User Account Management Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Account Management</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Activate or deactivate accounts, adjust role privileges, or verify account status. Safeguards prevent deactivating the last active administrator.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="pb-3 font-semibold">User</th>
                <th className="pb-3 font-semibold">Email</th>
                <th className="pb-3 font-semibold">Assigned Role</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Created</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {usersList.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-3 font-semibold text-slate-900 dark:text-white">
                    {u.full_name}
                  </td>
                  <td className="py-3 text-slate-500 dark:text-slate-400">
                    {u.email}
                  </td>
                  <td className="py-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleChangeRole(u, e.target.value)}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="patient">Patient</option>
                      <option value="clinician">Clinician</option>
                      <option value="administrator">Administrator</option>
                    </select>
                  </td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        u.is_active
                          ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200'
                          : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200'
                      }`}
                    >
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 text-slate-500 dark:text-slate-400">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => handleToggleUserStatus(u)}
                      className={`px-3 py-1 rounded-lg font-semibold text-xs transition-colors ${
                        u.is_active
                          ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900'
                          : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900'
                      }`}
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Audit Log Feed */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Security & Access Audit Trail</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Immutable log of logins, sharing grants, revocations, and administrative events.
          </p>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {auditLogs.map((log) => (
            <div key={log.id} className="py-3 flex items-center justify-between text-xs gap-3">
              <div className="flex items-center space-x-3">
                <div className={`p-1.5 rounded-lg shrink-0 ${
                  log.outcome === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                }`}>
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold font-mono text-slate-900 dark:text-white">
                      {log.action}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-[11px] text-slate-500">{log.actor_name}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Resource: {log.resource_type} {log.resource_id ? `(#${log.resource_id})` : ''}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  log.outcome === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                }`}>
                  {log.outcome}
                </span>
                <p className="text-[10px] text-slate-400 mt-1">
                  {new Date(log.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
