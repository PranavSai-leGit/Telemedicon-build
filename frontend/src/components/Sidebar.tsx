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
  AlertTriangle,
  Users,
  FileText,
  Settings,
  Server,
  ShieldAlert,
  Cpu
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
    { to: '/clinician/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/clinician/patients', label: 'Patient Directory', icon: Users },
    { to: '/clinician/verification', label: 'Verification Queue', icon: ShieldAlert },
    { to: '/clinician/documents', label: 'Shared Documents', icon: FileText },
    { to: '/clinician/handovers', label: 'Clinical Handovers', icon: FileCheck2 },
    { to: '/clinician/discrepancies', label: 'Discrepancy Review', icon: AlertTriangle },
    { to: '/clinician/consents', label: 'Consent & Sharing', icon: Share2 },
    { to: '/clinician/activity', label: 'Audit Activity', icon: Activity },
  ];

  const adminNav = [
    { to: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/admin/users', label: 'User Management', icon: Users },
    { to: '/admin/clinicians', label: 'Clinician Accounts', icon: Stethoscope },
    { to: '/admin/patients', label: 'Patient Accounts', icon: ShieldCheck },
    { to: '/admin/ai-monitoring', label: 'AI Operations & Telemetry', icon: Cpu },
    { to: '/admin/processing', label: 'Processing Monitor', icon: FileText },
    { to: '/admin/audit', label: 'Security Audit Logs', icon: Activity },
    { to: '/admin/config', label: 'System Configuration', icon: Settings },
    { to: '/admin/health', label: 'Service Health', icon: Server },
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
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-white dark:bg-[#0E1726] border-r border-[#D9E3EB] dark:border-[#2A3A4D] transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col justify-between`}
      >
        <div className="p-4 space-y-1">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#536777] dark:text-[#91A3B5]">
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
                    `flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#E4F3F0] dark:bg-[#123831] text-[#0F766E] dark:text-[#5EEAD4] font-semibold border border-[#0F766E]/25 dark:border-[#5EEAD4]/30'
                        : 'text-[#536777] dark:text-[#B2C0CE] hover:bg-[#EDF3F7] dark:hover:bg-[#162437] hover:text-[#172B3A] dark:hover:text-[#E7EEF5]'
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

        {/* Brand Principle & Provenance Note */}
        <div className="p-3.5 m-3 rounded-lg bg-[#EDF3F7] dark:bg-[#162437] border border-[#D9E3EB] dark:border-[#2A3A4D] text-[11px] space-y-1">
          <div className="flex items-center space-x-1.5 font-semibold text-[#172B3A] dark:text-[#E7EEF5]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#5EEAD4]" />
            <span>MediTale Provenance</span>
          </div>
          <p className="text-[#536777] dark:text-[#91A3B5] leading-snug">
            Medical history, connected to its evidence. Verifiable audit trails for clinical safety.
          </p>
        </div>
      </aside>
    </>
  );
};
