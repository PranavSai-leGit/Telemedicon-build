import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, ShieldAlert } from 'lucide-react';

interface AppLayoutProps {
  allowedRoles?: string[];
}

export const AppLayout: React.FC<AppLayoutProps> = ({ allowedRoles }) => {
  const { user, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Role-based redirection to user's authorized home
    const target =
      user.role === 'clinician'
        ? '/clinician/dashboard'
        : user.role === 'administrator'
        ? '/admin/dashboard'
        : '/patient/dashboard';
    return <Navigate to={target} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <Navbar onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />

      {/* Synthetic Demonstration Notice Banner */}
      <div className="w-full bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/60 dark:border-amber-900/40 px-4 py-1.5 text-center text-xs text-amber-800 dark:text-amber-300 font-medium flex items-center justify-center space-x-2">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span>
          <strong>Hackathon Demonstration:</strong> All patient data, prescriptions, and lab tests shown are synthetic and for demonstration only.
        </span>
      </div>

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        <main className="flex-1 lg:pl-64 p-4 sm:p-6 lg:p-8 max-w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
