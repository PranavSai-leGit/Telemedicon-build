import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  Users,
  FileText,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Calendar,
  ChevronRight,
  RefreshCw,
  Search,
  FileCheck2
} from 'lucide-react';
import { api } from '../../services/api';
import { ClinicianPatient } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

export const ClinicianDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<ClinicianPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const fetchPatients = async () => {
    try {
      const data = await api.getSharedPatients();
      setPatients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const filteredPatients = patients.filter(
    (p) =>
      p.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      p.patient_email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Clinician Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-md shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-blue-200">
            Clinical Practice Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
            {user?.full_name}
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-xl">
            Review authorized patient records, inspect evidence citations, reconcile medication discrepancies, and prepare structured clinical handovers.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/20">
          <ShieldCheck className="w-4 h-4 text-emerald-300" />
          <span>Active Practice Node • RBAC Verified</span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Authorized Patients</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {patients.length}
            </span>
            <span className="text-xs text-slate-400">active patient grants</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Shared Records</span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {patients.reduce((acc, p) => acc + p.shared_document_count, 0)}
            </span>
            <span className="text-xs text-slate-400">clinical documents</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Reconciliation Alerts</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              1
            </span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">review required</span>
          </div>
        </div>
      </div>

      {/* Clinical Workspace Quick Action Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { to: '/clinician/patients', label: 'Patient Directory', icon: Users, desc: 'Find authorized patients' },
          { to: '/clinician/documents', label: 'Document Vault', icon: FileText, desc: 'Original shared records' },
          { to: '/clinician/handovers', label: 'Clinical Handovers', icon: FileCheck2, desc: 'PDF handover briefs' },
          { to: '/clinician/discrepancies', label: 'Discrepancies', icon: AlertTriangle, desc: 'Reconciliation items' },
          { to: '/clinician/consents', label: 'Consent Scopes', icon: ShieldCheck, desc: 'Active grant limits' },
          { to: '/clinician/activity', label: 'Audit Activity', icon: Calendar, desc: 'Access log trail' },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.to}
              to={action.to}
              className="p-3.5 med-card med-card-hover flex flex-col justify-between space-y-2 group"
            >
              <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 w-fit group-hover:scale-105 transition-transform">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
                  {action.label}
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">{action.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Patients Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Patients with Active Consent Grants
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select a patient to review their authorized health timeline, lab trajectories, and reconciliation items.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patients..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredPatients.map((patient) => (
            <div
              key={patient.patient_id}
              onClick={() => navigate(`/clinician/patients/${patient.patient_id}`)}
              className="py-4 px-2 rounded-xl hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-sm">
                  {patient.patient_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {patient.patient_name}
                  </h4>
                  <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                    <span>{patient.patient_email}</span>
                    <span>•</span>
                    <span>{patient.shared_document_count} shared records</span>
                    <span>•</span>
                    <span>Granted: {new Date(patient.latest_share_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span className="hidden sm:inline-flex text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                  Open Clinical Record
                </span>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              </div>
            </div>
          ))}

          {filteredPatients.length === 0 && !loading && (
            <div className="p-8 text-center text-xs text-slate-400">
              No patients have granted sharing permissions to your account yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
