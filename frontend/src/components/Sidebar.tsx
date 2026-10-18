import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileUp,
  Clock,
  LineChart,
  FileCheck2,
  Share2,
  Stethoscope,
  ShieldCheck,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  if (!user) return null;

  const patientNav = [
    { to: '/patient/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/patient/records', label: 'My Records & Upload', icon: FileUp },
    { to: '/patient/timeline', label: 'Health Timeline', icon: Clock },
    { to: '/patient/labs', label: 'Laboratory Trends', icon: LineChart },
    { to: '/patient/summary', label: 'AI Health Summary', icon: FileCheck2 },
    { to: '/patient/sharing', label: 'Consent & Sharing', icon: Share2 },
  ];

  const clinicianNav = [
    { to: '/clinician/dashboard', label: 'Clinical Dashboard', icon: Stethoscope },
  ];

  const adminNav = [
    { to: '/admin/dashboard', label: 'System Overview', icon: ShieldCheck },
  ];

  const navItems =
    user.role === 'clinician'
      ? clinicianNav
      : user.role === 'administrator'
        ? adminNav
        : patientNav;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden backdrop-blur-xs"
        />
      )}

      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/80 transition-transform duration-200 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
          } flex flex-col justify-between`}
      >
        <div className="p-4 space-y-1">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {user.role} workspace
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${isActive
                      ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold border border-teal-200/60 dark:border-teal-800/50 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Security & Disclaimer Notice */}
        <div className="p-4 m-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40 text-[11px] space-y-1">
          <div className="flex items-center space-x-1.5 font-semibold text-slate-700 dark:text-slate-300">
            <Activity className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Digital Health Interop</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 leading-snug">
            All records displayed are synthetic demo data for clinical handover testing.
          </p>
        </div>
      </aside>
    </>
  );
};
