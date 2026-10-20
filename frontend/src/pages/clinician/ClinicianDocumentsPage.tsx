import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Download,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Eye,
  Check,
  XCircle,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { api } from '../../services/api';
import { ClinicianDocumentItem, ExtractedFact, FactConfidenceDetail } from '../../types';
import { ConfidenceBadge } from '../../components/ConfidenceBadge';
import { ConfidenceInspectorModal } from '../../components/ConfidenceInspectorModal';

export const ClinicianDocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<ClinicianDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Split-view inspection modal state
  const [inspectingDoc, setInspectingDoc] = useState<ClinicianDocumentItem | null>(null);
  const [docFacts, setDocFacts] = useState<ExtractedFact[]>([]);
  const [loadingFacts, setLoadingFacts] = useState(false);
  const [confidenceDetail, setConfidenceDetail] = useState<FactConfidenceDetail | null>(null);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const data = await api.getClinicianSharedDocuments();
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load shared clinician documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleOpenInspection = async (doc: ClinicianDocumentItem) => {
    setInspectingDoc(doc);
    setLoadingFacts(true);
    try {
      const facts = await api.getTimelineFacts(doc.patient_id, undefined, doc.id);
      setDocFacts(facts);
    } catch (err) {
      console.error('Failed to load facts for document:', err);
    } finally {
      setLoadingFacts(false);
    }
  };

  const handleInspectConfidence = async (factId: number) => {
    try {
      const detail = await api.getFactConfidence(factId);
      setConfidenceDetail(detail);
    } catch (err) {
      console.error('Failed to load confidence detail:', err);
    }
  };

  const handleQuickVerify = async (factId: number) => {
    try {
      await api.verifyFactClinician(factId, {
        verification_status: 'verified',
        reviewer_notes: 'Verified directly in split-view clinician document review.'
      });
      // Update local state
      setDocFacts(prev => prev.map(f => f.id === factId ? { ...f, verification_status: 'verified' } : f));
    } catch (err) {
      console.error('Failed to verify fact:', err);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.uploaded_filename.toLowerCase().includes(search.toLowerCase()) ||
      doc.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      doc.patient_email.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.document_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <div className="med-header-banner flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-teal-200">
            Clinical Practice • Document Repository
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Shared Clinical Documents
          </h1>
          <p className="text-xs text-teal-100 mt-1 max-w-xl">
            Review original medical records, discharge summaries, prescriptions, and diagnostic lab sheets shared by authorized patients with side-by-side evidence inspection.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/20 text-white shrink-0 self-start md:self-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-300" />
          <span>Restricted to Authorized Grants</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="med-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          {/* Type filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: `All Records (${documents.length})` },
              { id: 'prescription', label: 'Prescriptions' },
              { id: 'laboratory_report', label: 'Lab Reports' },
              { id: 'discharge_summary', label: 'Discharge Summaries' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  typeFilter === t.id ? 'med-btn-primary' : 'med-btn-secondary'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by file or patient..."
              className="med-input pl-9 pr-3 py-1.5 text-xs w-full"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading authorized records...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200/80 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4 font-bold">Document</th>
                  <th className="py-3 px-4 font-bold">Patient</th>
                  <th className="py-3 px-4 font-bold">Type</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold">Uploaded Date</th>
                  <th className="py-3 px-4 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center space-x-2.5">
                        <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white truncate max-w-xs">
                            {doc.uploaded_filename}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {(doc.size_bytes / 1024).toFixed(1)} KB • {doc.facts_count} facts extracted
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                      <div>{doc.patient_name}</div>
                      <div className="text-[10px] text-slate-400">{doc.patient_email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="med-badge med-badge-teal text-[10px] capitalize">
                        {doc.document_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="med-badge med-badge-success text-[10px] capitalize flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3" /> {doc.processing_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleOpenInspection(doc)}
                          className="med-btn-primary py-1 px-2.5 text-xs inline-flex items-center space-x-1"
                          title="Inspect Extracted Facts alongside Source Document"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review Claims</span>
                        </button>
                        <a
                          href={api.getDocumentFileUrl(doc.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="med-btn-secondary py-1 px-2 text-xs inline-flex items-center"
                          title="Download original file"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredDocs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No documents found matching this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Split-View Document & Extraction Review Modal */}
      {inspectingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-teal-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Document & Extraction Split-View: {inspectingDoc.uploaded_filename}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Patient: {inspectingDoc.patient_name} • {docFacts.length} structured facts extracted
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href={api.getDocumentFileUrl(inspectingDoc.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="med-btn-secondary py-1 px-2.5 text-xs flex items-center space-x-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Tab</span>
                </a>
                <button
                  onClick={() => setInspectingDoc(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Split Body */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 overflow-hidden">
              {/* Left Pane: Original Document View */}
              <div className="h-full flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden">
                <div className="p-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Source Document Preview
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {(inspectingDoc.size_bytes / 1024).toFixed(1)} KB
                  </span>
                </div>
                <div className="flex-1 p-2 overflow-auto">
                  <iframe
                    src={api.getDocumentFileUrl(inspectingDoc.id)}
                    className="w-full h-full min-h-[400px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white"
                    title="Source Document Viewer"
                  />
                </div>
              </div>

              {/* Right Pane: Extracted Facts & Confidence */}
              <div className="h-full flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
                <div className="p-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Extracted Claims & Confidence Scores ({docFacts.length})
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    5-Dimension System Assessment
                  </span>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {loadingFacts ? (
                    <div className="py-12 text-center text-xs text-slate-400">Loading extracted claims...</div>
                  ) : docFacts.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 italic">
                      No medical facts recorded for this document.
                    </div>
                  ) : (
                    docFacts.map((fact) => (
                      <div
                        key={fact.id}
                        className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-2 hover:border-teal-400 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="med-badge med-badge-teal uppercase text-[9px] py-0">
                                {fact.fact_type}
                              </span>
                              {fact.event_date && (
                                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                  <Calendar className="w-2.5 h-2.5" /> {fact.event_date}
                                  {fact.date_precision && fact.date_precision !== 'day' && (
                                    <span className="text-amber-500 font-mono">({fact.date_precision})</span>
                                  )}
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                              {fact.normalized_value}
                            </h4>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            <ConfidenceBadge
                              score={fact.confidence_score}
                              label={fact.confidence_label}
                              compact
                              onClick={() => handleInspectConfidence(fact.id)}
                            />
                            <button
                              onClick={() => handleQuickVerify(fact.id)}
                              disabled={fact.verification_status === 'verified'}
                              className={`p-1 rounded-md text-xs font-semibold ${
                                fact.verification_status === 'verified'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 cursor-default'
                                  : 'med-btn-primary py-0.5 px-2'
                              }`}
                              title={fact.verification_status === 'verified' ? 'Verified against source' : 'One-click verify against source'}
                            >
                              {fact.verification_status === 'verified' ? <Check className="w-3 h-3" /> : 'Verify'}
                            </button>
                          </div>
                        </div>

                        {/* Source Ground Truth excerpt */}
                        {fact.source_excerpt && (
                          <blockquote className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-300 italic text-[11px] leading-relaxed">
                            "{fact.source_excerpt}"
                          </blockquote>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confidence Inspector Modal */}
      <ConfidenceInspectorModal
        confidenceDetail={confidenceDetail}
        isOpen={!!confidenceDetail}
        onClose={() => setConfidenceDetail(null)}
      />
    </div>
  );
};
