import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Clock,
  ShieldCheck,
  ArrowRight,
  UserCheck,
  Stethoscope,
  Lock,
  FileText,
  AlertTriangle,
  ChevronRight,
  Database,
  CheckCircle2,
  Network,
  FileCheck2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { MediTaleLogo } from '../components/MediTaleLogo';

export const LandingPage: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const handleQuickDemoLogin = async (email: string, pass: string, targetPath: string) => {
    try {
      await login(email, pass);
      navigate(targetPath);
    } catch (err) {
      // Fallback attempt with Password123!
      try {
        await login(email, 'Password123!');
        navigate(targetPath);
      } catch (e2) {
        console.error('Demo login error:', e2);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F8FB] dark:bg-[#0B1220] text-[#172B3A] dark:text-[#E7EEF5] flex flex-col transition-colors">
      {/* Top Clinical Strip */}
      <div className="bg-[#173B57] text-[#E7EEF5] text-xs font-medium py-2 px-4 text-center border-b border-[#102D43]">
        <span>Evidence-Linked Multimodal Medical History & Clinical Handover Platform</span>
      </div>

      {/* Navigation */}
      <nav className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2.5">
          <MediTaleLogo variant="full" size="md" showTagline={true} />
        </Link>

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
              <span>Go to {user.role} Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link to="/login" className="med-btn-secondary">
                Sign In
              </Link>
              <Link to="/register" className="med-btn-primary">
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 text-center space-y-6">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#E4F3F0] dark:bg-[#123831] border border-[#0F766E]/20 text-[#0F766E] dark:text-[#5EEAD4] text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>Patient-Controlled Clinical Provenance & Traceability</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#172B3A] dark:text-[#E7EEF5] max-w-4xl mx-auto leading-tight">
          Medical history, connected to its evidence.
        </h1>

        <p className="text-base sm:text-lg text-[#536777] dark:text-[#91A3B5] max-w-2xl mx-auto leading-relaxed">
          MediTale transforms fragmented health records into structured chronological timelines and an interactive relationship graph. Every clinical claim is verifiable against source document excerpts.
        </p>

        {/* CTA Buttons */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
          <Link to="/register" className="med-btn-primary px-6 py-3 text-sm">
            <span>Create Patient Account</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/login" className="med-btn-secondary px-6 py-3 text-sm">
            Sign In with Existing Account
          </Link>
        </div>
      </section>

      {/* Interactive Quick-Demo Access Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="med-card p-6">
          <div className="text-center max-w-2xl mx-auto mb-6">
            <span className="text-xs uppercase font-bold tracking-wider text-[#0F766E] dark:text-[#5EEAD4]">
              Platform Workspaces
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#172B3A] dark:text-[#E7EEF5] mt-1">
              Test Any Role with One Click
            </h2>
            <p className="text-xs text-[#536777] dark:text-[#91A3B5] mt-1">
              Select a pre-seeded account to explore role-specific permissions and verified clinical workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Patient Card */}
            <div className="p-5 rounded-lg bg-white dark:bg-[#111C2C] border border-[#D9E3EB] dark:border-[#2A3A4D] shadow-xs flex flex-col justify-between hover:border-[#0F766E] transition-all">
              <div>
                <div className="flex items-center space-x-2.5 mb-2">
                  <div className="p-2 rounded-lg bg-[#E4F3F0] dark:bg-[#123831] text-[#0F766E] dark:text-[#5EEAD4]">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#172B3A] dark:text-[#E7EEF5]">Eleanor Vance</h3>
                    <span className="med-badge med-badge-teal">Patient Workspace</span>
                  </div>
                </div>
                <p className="text-xs text-[#536777] dark:text-[#91A3B5] mt-2 leading-relaxed">
                  Upload records, review extracted facts, navigate the relationship explorer, plot lab trends, and manage clinician sharing consent.
                </p>
                <div className="mt-3 p-2 bg-[#EDF3F7] dark:bg-[#162437] rounded text-[11px] font-mono text-[#536777] dark:text-[#91A3B5] flex justify-between">
                  <span>patient@meditale.demo</span>
                  <span className="text-[#0F766E] dark:text-[#5EEAD4]">Password123!</span>
                </div>
              </div>

              <button
                onClick={() => handleQuickDemoLogin('patient@meditale.demo', 'Password123!', '/patient/dashboard')}
                className="mt-4 med-btn-primary w-full"
              >
                <span>Launch Patient Experience</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Clinician Card */}
            <div className="p-5 rounded-lg bg-white dark:bg-[#111C2C] border border-[#D9E3EB] dark:border-[#2A3A4D] shadow-xs flex flex-col justify-between hover:border-[#0F766E] transition-all">
              <div>
                <div className="flex items-center space-x-2.5 mb-2">
                  <div className="p-2 rounded-lg bg-[#EFF6FF] dark:bg-[#1E293B] text-[#1E40AF] dark:text-[#93C5FD]">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#172B3A] dark:text-[#E7EEF5]">Dr. Marcus Chen, MD</h3>
                    <span className="med-badge med-badge-blue">Clinician Workspace</span>
                  </div>
                </div>
                <p className="text-xs text-[#536777] dark:text-[#91A3B5] mt-2 leading-relaxed">
                  Clinical verification queue, split-view document inspection, medication reconciliation, and evidence-linked handover reports.
                </p>
                <div className="mt-3 p-2 bg-[#EDF3F7] dark:bg-[#162437] rounded text-[11px] font-mono text-[#536777] dark:text-[#91A3B5] flex justify-between">
                  <span>clinician@meditale.demo</span>
                  <span className="text-[#2563EB] dark:text-[#93C5FD]">Password123!</span>
                </div>
              </div>

              <button
                onClick={() => handleQuickDemoLogin('clinician@meditale.demo', 'Password123!', '/clinician/dashboard')}
                className="mt-4 med-btn-primary w-full"
              >
                <span>Launch Clinician Experience</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Administrator Card */}
            <div className="p-5 rounded-lg bg-white dark:bg-[#111C2C] border border-[#D9E3EB] dark:border-[#2A3A4D] shadow-xs flex flex-col justify-between hover:border-[#0F766E] transition-all">
              <div>
                <div className="flex items-center space-x-2.5 mb-2">
                  <div className="p-2 rounded-lg bg-[#EDF3F7] dark:bg-[#162437] text-[#173B57] dark:text-[#8FB8D8]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#172B3A] dark:text-[#E7EEF5]">Sarah Jenkins</h3>
                    <span className="med-badge med-badge-neutral">Admin Workspace</span>
                  </div>
                </div>
                <p className="text-xs text-[#536777] dark:text-[#91A3B5] mt-2 leading-relaxed">
                  AI pipeline usage telemetry, token cost tracking, user management, and security audit logs. Strictly isolated from patient medical records.
                </p>
                <div className="mt-3 p-2 bg-[#EDF3F7] dark:bg-[#162437] rounded text-[11px] font-mono text-[#536777] dark:text-[#91A3B5] flex justify-between">
                  <span>admin@meditale.demo</span>
                  <span className="text-[#536777] dark:text-[#91A3B5]">Password123!</span>
                </div>
              </div>

              <button
                onClick={() => handleQuickDemoLogin('admin@meditale.demo', 'Password123!', '/admin/dashboard')}
                className="mt-4 med-btn-secondary w-full"
              >
                <span>Launch Admin Experience</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Core Architectural Capability Pillars */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="med-card p-5 space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#E4F3F0] dark:bg-[#123831] flex items-center justify-center text-[#0F766E] dark:text-[#5EEAD4]">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-[#172B3A] dark:text-[#E7EEF5]">
              Chronological Health Timeline
            </h3>
            <p className="text-xs text-[#536777] dark:text-[#91A3B5] leading-relaxed">
              Medical events ordered by documented clinical date rather than upload timestamp. Preserves date precision without inventing days or months.
            </p>
          </div>

          <div className="med-card p-5 space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] dark:bg-[#1E293B] flex items-center justify-center text-[#1E40AF] dark:text-[#93C5FD]">
              <Network className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-[#172B3A] dark:text-[#E7EEF5]">
              Medical Relationship Explorer
            </h3>
            <p className="text-xs text-[#536777] dark:text-[#91A3B5] leading-relaxed">
              Focused 3-region exploration linking diagnoses to prescribed medications, laboratory markers, and source documents with verifiable provenance.
            </p>
          </div>

          <div className="med-card p-5 space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#FFFBEB] dark:bg-[#451A03]/30 flex items-center justify-center text-[#92400E] dark:text-[#FCD34D]">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-[#172B3A] dark:text-[#E7EEF5]">
              5-Dimension Confidence & Reconciliation
            </h3>
            <p className="text-xs text-[#536777] dark:text-[#91A3B5] leading-relaxed">
              Transparent 0–100 extraction scoring across evidence grounding, schema validity, and cross-record consistency checks with clinical verification queues.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#D9E3EB] dark:border-[#2A3A4D] py-6 text-center text-xs text-[#536777] dark:text-[#91A3B5] space-y-1">
        <p className="font-semibold text-[#172B3A] dark:text-[#E7EEF5]">
          MediTale — Evidence-Linked Multimodal Medical History & Clinical Handover
        </p>
        <p className="text-[11px] text-[#536777] dark:text-[#91A3B5]">
          Built with React, Vite, Tailwind CSS, FastAPI, PostgreSQL, and multi-stage extraction pipeline.
        </p>
      </footer>
    </div>
  );
};
