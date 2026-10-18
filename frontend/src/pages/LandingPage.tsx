import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  Clock,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  UserCheck,
  Stethoscope,
  Lock,
  FileText,
  AlertTriangle,
  ChevronRight,
  Database,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const LandingPage: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const handleQuickDemoLogin = async (email: string, targetPath: string) => {
    try {
      await login(email, 'Password123!');
      navigate(targetPath);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F9FA] dark:bg-[#0B1520] text-[#172B3A] dark:text-[#F0F6FA] flex flex-col transition-colors">
      {/* Top Banner */}
      <div className="bg-[#0F766E] text-white text-xs font-medium py-2 px-4 text-center">
        <span>Digital Health & Public Health Platform — Unified Records with Clinical Provenance & PostgreSQL</span>
      </div>

      {/* Navigation */}
      <nav className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#0F766E] flex items-center justify-center text-white shadow-xs">
            <Activity className="w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight text-[#172B3A] dark:text-white">
            Telemedicon <span className="text-xs font-normal text-slate-500">by MediTale</span>
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {user ? (
            <Link
              to={
                user.role === 'clinician'
                  ? '/clinician/dashboard'
                  : user.role === 'administrator'
                  ? '/admin/dashboard'
                  : '/patient/dashboard'
              }
              className="med-btn-primary"
            >
              <span>Go to {user.role} Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="med-btn-secondary"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="med-btn-primary"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 text-center space-y-6">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200/60 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
          <span>Patient-Controlled Health Interoperability</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight">
          Your health history, connected and ready for every consultation.
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Patients organize medical records collected from disparate clinics, hospitals, and labs.
          Authorized clinicians review chronological timelines, evidence-linked AI summaries, and discrepancy alerts before consultations.
        </p>

        {/* CTA Buttons */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/register"
            className="med-btn-primary px-6 py-3 text-sm"
          >
            <span>Create Patient Account</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="med-btn-secondary px-6 py-3 text-sm"
          >
            Sign In with Existing Account
          </Link>
        </div>
      </section>

      {/* Interactive Quick-Demo Access Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="med-card p-6">
          <div className="text-center max-w-2xl mx-auto mb-6">
            <span className="text-xs uppercase font-bold tracking-wider text-teal-700 dark:text-teal-400">
              Interactive Platform Demonstration
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
              Test Any Role with One Click
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select a pre-seeded synthetic account to explore role-specific permissions and workflows instantly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Patient Card */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col justify-between hover:border-teal-500 transition-all">
              <div>
                <div className="flex items-center space-x-2.5 mb-2">
                  <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Eleanor Vance</h3>
                    <span className="med-badge med-badge-teal">Patient Account</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  Upload records, review extracted facts, correct errors, plot lab trends, generate AI summaries, and grant/revoke clinician sharing.
                </p>
                <div className="mt-3 p-2 bg-slate-50 dark:bg-slate-900/50 rounded text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  patient@meditale.demo
                </div>
              </div>

              <button
                onClick={() => handleQuickDemoLogin('patient@meditale.demo', '/patient/dashboard')}
                className="mt-4 med-btn-primary w-full"
              >
                <span>Launch Patient Experience</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Clinician Card */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col justify-between hover:border-teal-600 transition-all">
              <div>
                <div className="flex items-center space-x-2.5 mb-2">
                  <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Dr. Marcus Chen, MD</h3>
                    <span className="med-badge med-badge-blue">Clinician Account</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  Review authorized records only, inspect source evidence excerpts, resolve medication discrepancies, and download PDF clinical handovers.
                </p>
                <div className="mt-3 p-2 bg-slate-50 dark:bg-slate-900/50 rounded text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  clinician@meditale.demo
                </div>
              </div>

              <button
                onClick={() => handleQuickDemoLogin('clinician@meditale.demo', '/clinician/dashboard')}
                className="mt-4 med-btn-primary w-full"
              >
                <span>Launch Clinician Experience</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Administrator Card */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col justify-between hover:border-slate-400 transition-all">
              <div>
                <div className="flex items-center space-x-2.5 mb-2">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Sarah Jenkins</h3>
                    <span className="med-badge med-badge-teal">Administrator Account</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  Monitor user counts, document processing statistics, and security audit logs. Strictly isolated from patient medical records.
                </p>
                <div className="mt-3 p-2 bg-slate-50 dark:bg-slate-900/50 rounded text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  admin@meditale.demo
                </div>
              </div>

              <button
                onClick={() => handleQuickDemoLogin('admin@meditale.demo', '/admin/dashboard')}
                className="mt-4 med-btn-secondary w-full"
              >
                <span>Launch Admin Experience</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Core Feature Cards */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="med-card p-6">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 flex items-center justify-center text-teal-700 dark:text-teal-400 mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
              Chronological Health Timeline
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Medical events ordered by documented clinical date rather than upload timestamp. Filter by conditions, prescriptions, lab results, and procedures.
            </p>
          </div>

          <div className="med-card p-6">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 flex items-center justify-center text-teal-700 dark:text-teal-400 mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
              Evidence-Linked AI Summaries
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Every summary claim cites stored fact IDs verified against PostgreSQL. One click displays exact source document excerpts and page numbers.
            </p>
          </div>

          <div className="med-card p-6">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-700 dark:text-amber-400 mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
              Discrepancy Detection & Handover
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Detects dosage mismatches and conflicting instructions across different providers, enabling clinicians to reconcile records and download handover PDFs.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200/80 dark:border-slate-800/80 py-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
        <p>MediTale Platform — Digital Health Interoperability Prototype</p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Built with React, Vite, Tailwind CSS, FastAPI, PostgreSQL (JSONB), and Gemini AI. Synthetic healthcare data only.
        </p>
      </footer>
    </div>
  );
};
