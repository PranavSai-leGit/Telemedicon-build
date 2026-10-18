import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  AlertTriangle,
  Users,
  Upload,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Calendar,
  ChevronRight,
  Eye,
  FileCheck2,
  LineChart
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { MedicalDocument, ExtractedFact, SharingGrant } from '../../types';
import { EvidenceModal } from '../../components/EvidenceModal';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [facts, setFacts] = useState<ExtractedFact[]>([]);
  const [grants, setGrants] = useState<SharingGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [evidenceData, setEvidenceData] = useState<any | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docsRes, factsRes, grantsRes] = await Promise.all([
          api.getDocuments(),
          api.getTimelineFacts(),
          api.getSharingGrants(),
        ]);
        setDocuments(docsRes);
        setFacts(factsRes);
        setGrants(grantsRes);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeGrants = grants.filter((g) => g.status === 'active');
  const needsReviewCount = facts.filter((f) => f.extraction_status === 'needs_review').length;

  const handleInspectFact = async (factId: number) => {
    try {
      const ev = await api.getFactEvidence(factId);
      setEvidenceData(ev);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-teal-100">Patient Health Portal</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
            Welcome back, {user?.full_name}
          </h1>
          <p className="text-xs sm:text-sm text-teal-50 mt-1 max-w-xl">
            Your connected medical records are unified across providers, indexed with ground-truth citations, and ready for your next consultation.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to="/patient/records"
            className="px-4 py-2.5 text-xs font-semibold bg-white text-teal-700 hover:bg-teal-50 rounded-xl shadow-xs transition-colors flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </Link>
          <Link
            to="/patient/summary"
            className="px-4 py-2.5 text-xs font-semibold bg-teal-700/60 hover:bg-teal-700/80 text-white rounded-xl border border-teal-400/40 transition-colors flex items-center space-x-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Summary</span>
          </Link>
        </div>
      </div>

      {/* 4 PostgreSQL Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Uploaded Documents</span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {documents.length}
            </span>
            <span className="text-xs text-slate-400">records in storage</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Recorded Health Events</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {facts.length}
            </span>
            <span className="text-xs text-slate-400">normalized facts</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Records Requiring Review</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {needsReviewCount}
            </span>
            <span className="text-xs text-slate-400">items pending confirmation</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Clinician Access</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {activeGrants.length}
            </span>
            <span className="text-xs text-slate-400">authorized clinicians</span>
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Uploads & Timeline Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Uploads */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Recent Medical Documents</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Stored in private backend repository</p>
            </div>
            <Link
              to="/patient/records"
              className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center space-x-1"
            >
              <span>View all ({documents.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {documents.slice(0, 4).map((doc) => (
              <div key={doc.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0 pr-3">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {doc.uploaded_filename}
                    </p>
                    <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-slate-400">
                      <span className="capitalize">{doc.document_type.replace('_', ' ')}</span>
                      <span>•</span>
                      <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${doc.processing_status === 'completed'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : doc.processing_status === 'duplicate'
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                    {doc.processing_status}
                  </span>
                  <a
                    href={api.getDocumentFileUrl(doc.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                    title="Download document"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}

            {documents.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">
                No medical documents uploaded yet.
              </div>
            )}
          </div>
        </div>

        {/* Recent Timeline Facts */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Recent Timeline Events</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Chronological ground-truth facts</p>
            </div>
            <Link
              to="/patient/timeline"
              className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center space-x-1"
            >
              <span>Full timeline</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {facts.slice(0, 4).map((fact) => (
              <div key={fact.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0 pr-3">
                  <div className={`p-2 rounded-lg shrink-0 ${fact.fact_type === 'condition'
                      ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
                      : fact.fact_type === 'medication'
                        ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400'
                        : fact.fact_type === 'lab_result'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600'
                    }`}>
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {fact.normalized_value}
                    </p>
                    <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-slate-400">
                      <span className="capitalize font-medium text-teal-600 dark:text-teal-400">
                        {fact.fact_type.replace('_', ' ')}
                      </span>
                      <span>•</span>
                      <span>{fact.event_date || 'Date unrecorded'}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleInspectFact(fact.id)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-teal-950/50 text-slate-700 hover:text-teal-700 dark:text-slate-300 dark:hover:text-teal-300 rounded-lg transition-colors flex items-center space-x-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Evidence</span>
                </button>
              </div>
            ))}

            {facts.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">
                No health events indexed yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <Link
          to="/patient/timeline"
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-teal-500 transition-all flex items-center space-x-4 shadow-xs"
        >
          <div className="p-3 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Health Timeline</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Filter and inspect medical events</p>
          </div>
        </Link>

        <Link
          to="/patient/labs"
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-teal-500 transition-all flex items-center space-x-4 shadow-xs"
        >
          <div className="p-3 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
            <LineChart className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Laboratory Trends</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Interactive biomarker trajectories</p>
          </div>
        </Link>

        <Link
          to="/patient/sharing"
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-teal-500 transition-all flex items-center space-x-4 shadow-xs"
        >
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Consent & Sharing</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Manage clinician permissions</p>
          </div>
        </Link>
      </div>

      {/* Ground-Truth Evidence Inspector Modal */}
      <EvidenceModal evidence={evidenceData} onClose={() => setEvidenceData(null)} />
    </div>
  );
};
