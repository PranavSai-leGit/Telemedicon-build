import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Edit3,
  FileText,
  Calendar,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Eye,
  History,
  Check,
  ChevronRight,
  User,
  ExternalLink
} from 'lucide-react';
import { api } from '../../services/api';
import { VerificationQueueItem, FactConfidenceDetail } from '../../types';
import { ConfidenceBadge } from '../../components/ConfidenceBadge';
import { ConfidenceInspectorModal } from '../../components/ConfidenceInspectorModal';
import { EvidenceModal } from '../../components/EvidenceModal';
import { Pagination } from '../../components/Pagination';

export const ClinicianVerificationQueuePage: React.FC = () => {
  const [items, setItems] = useState<VerificationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'needs_review' | 'low_conf' | 'discrepancy' | 'verified' | 'rejected'>('needs_review');
  const [searchQuery, setSearchQuery] = useState('');
  const [queuePage, setQueuePage] = useState(1);
  const [queuePageSize, setQueuePageSize] = useState(10);
  
  // Selected item for resolution
  const [selectedItem, setSelectedItem] = useState<VerificationQueueItem | null>(null);
  const [resolutionAction, setResolutionAction] = useState<'verify' | 'reject' | 'needs_review' | 'correct'>('verify');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [correctedValue, setCorrectedValue] = useState('');
  const [correctedDate, setCorrectedDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Confidence & Evidence Modals
  const [confidenceDetail, setConfidenceDetail] = useState<FactConfidenceDetail | null>(null);
  const [evidenceData, setEvidenceData] = useState<any | null>(null);

  // History Tab toggle
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 100 };
      if (filterTab === 'low_conf') {
        params.filter_type = 'low_confidence';
      } else if (filterTab === 'discrepancy') {
        params.filter_type = 'discrepancy';
      } else if (filterTab !== 'all') {
        params.filter_type = filterTab;
      }
      const data = await api.getClinicianVerificationQueue(params);
      setItems(data);
    } catch (err) {
      console.error('Failed to load verification queue:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const data = await api.getClinicianVerificationHistory(50);
      setHistoryItems(data);
    } catch (err) {
      console.error('Failed to load verification history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [filterTab]);

  const handleInspectConfidence = async (factId: number) => {
    try {
      const detail = await api.getFactConfidence(factId);
      setConfidenceDetail(detail);
    } catch (err) {
      console.error('Failed to load confidence detail:', err);
    }
  };

  const handleInspectEvidence = async (factId: number) => {
    try {
      const ev = await api.getFactEvidence(factId);
      setEvidenceData(ev);
    } catch (err) {
      console.error('Failed to load fact evidence:', err);
    }
  };

  const openResolution = (item: VerificationQueueItem, action: 'verify' | 'reject' | 'needs_review' | 'correct') => {
    setSelectedItem(item);
    setResolutionAction(action);
    setResolutionNotes('');
    setCorrectedValue(item.normalized_value);
    setCorrectedDate(item.event_date || '');
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  const handleSubmitResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      setSubmitting(true);
      setSubmitError(null);
      await api.resolveVerificationQueueItem(
        selectedItem.fact_id,
        resolutionAction,
        resolutionNotes,
        resolutionAction === 'correct' ? correctedValue : undefined
      );
      setSubmitSuccess(`Claim successfully updated as ${resolutionAction.replace('_', ' ')}.`);
      setTimeout(() => {
        setSelectedItem(null);
        setSubmitSuccess(null);
        fetchQueue();
      }, 1000);
    } catch (err: any) {
      setSubmitError(err.response?.data?.detail || 'Failed to submit verification resolution.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.normalized_value.toLowerCase().includes(q) ||
      item.fact_type.toLowerCase().includes(q) ||
      item.patient_name.toLowerCase().includes(q) ||
      item.document_name.toLowerCase().includes(q)
    );
  });

  const totalCount = items.length;
  const pendingCount = items.filter(i => i.verification_status === 'pending' || i.verification_status === 'needs_review').length;
  const lowConfCount = items.filter(i => (i.confidence_score || 0) < 60).length;
  const discrepancyCount = items.filter(i => i.has_discrepancy).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="med-badge med-badge-teal">Clinician Verification</span>
            <span className="text-xs text-slate-400">Human-in-the-Loop Governance</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Clinical Verification Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Evaluate candidate medical extractions against ground-truth source records with 5-dimensional confidence breakdown.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setShowHistory(!showHistory);
              if (!showHistory) fetchHistory();
            }}
            className={`med-btn-secondary flex items-center space-x-1.5 ${showHistory ? 'ring-2 ring-teal-500' : ''}`}
          >
            <History className="w-4 h-4 text-teal-600" />
            <span>{showHistory ? 'Close History' : 'Review History'}</span>
          </button>
          <button
            onClick={() => {
              setRefreshing(true);
              fetchQueue();
            }}
            disabled={refreshing}
            className="med-btn-secondary flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-teal-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="med-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Queue Total</span>
            <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600">
              <FileText className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{totalCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Claims in active view</p>
        </div>

        <div className="med-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Awaiting Review</span>
            <span className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600">
              <HelpCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">{pendingCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Require clinician sign-off</p>
        </div>

        <div className="med-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Low Confidence</span>
            <span className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600">
              <ShieldAlert className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">{lowConfCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Score &lt; 60 (Heuristic)</p>
        </div>

        <div className="med-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Discrepancies</span>
            <span className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-purple-600">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">{discrepancyCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Conflicting records detected</p>
        </div>
      </div>

      {/* Review History Drawer if open */}
      {showHistory && (
        <div className="med-card p-5 space-y-4 border-teal-200 dark:border-teal-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Recent Clinical Verification Decisions & Audit History
              </h3>
            </div>
            <button
              onClick={() => setShowHistory(false)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Close
            </button>
          </div>

          {historyLoading ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading audit trail...</div>
          ) : historyItems.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 italic">No past verification actions recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                    <th className="pb-2">Fact ID</th>
                    <th className="pb-2">Claim / Type</th>
                    <th className="pb-2">Patient</th>
                    <th className="pb-2">Action / Status</th>
                    <th className="pb-2">Clinician Notes</th>
                    <th className="pb-2">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {historyItems.map((h) => (
                    <tr key={h.fact_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 font-mono text-slate-400">#{h.fact_id}</td>
                      <td className="py-2.5">
                        <span className="font-semibold text-slate-900 dark:text-white">{h.normalized_value}</span>
                        <span className="block text-[10px] text-slate-400 capitalize">{h.fact_type}</span>
                      </td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-300">{h.patient_name}</td>
                      <td className="py-2.5">
                        <span className="capitalize font-semibold text-teal-600 dark:text-teal-400">
                          {h.verification_status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-500 italic max-w-xs truncate">
                        {h.reviewer_notes || 'No review notes'}
                      </td>
                      <td className="py-2.5 text-slate-400 text-[10px]">
                        {h.reviewed_at ? new Date(h.reviewed_at).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
          {[
            { id: 'needs_review', label: 'Needs Review' },
            { id: 'low_conf', label: 'Low Confidence (<60)' },
            { id: 'discrepancy', label: 'Discrepancies' },
            { id: 'all', label: 'All Extractions' },
            { id: 'verified', label: 'Verified' },
            { id: 'rejected', label: 'Rejected' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filterTab === tab.id
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search claim, patient, or doc..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Queue Table */}
      <div className="med-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-medium text-slate-500 mt-3">Loading candidate medical claims...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-teal-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Queue Empty</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No medical claims match the current filter. All candidate extractions have been validated or resolved.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3 px-4">Claim / Entity</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Source Document</th>
                  <th className="py-3 px-4">System Confidence</th>
                  <th className="py-3 px-4">Status & Conflict</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems
                  .slice((queuePage - 1) * queuePageSize, queuePage * queuePageSize)
                  .map((item) => (
                  <tr key={item.fact_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {item.normalized_value}
                          </span>
                          {item.unit && (
                            <span className="text-[10px] text-slate-400 font-mono">({item.unit})</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                          <span className="med-badge med-badge-teal py-0 text-[9px] uppercase tracking-wider">
                            {item.fact_type}
                          </span>
                          {item.event_date && (
                            <span className="flex items-center gap-0.5">
                              <Calendar className="w-2.5 h-2.5" /> {item.event_date}
                              {item.date_precision && item.date_precision !== 'day' && (
                                <span className="text-[9px] text-amber-500 font-mono">({item.date_precision})</span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {item.patient_name}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1 max-w-[200px]">
                        <div className="flex items-center space-x-1.5 truncate text-slate-600 dark:text-slate-300 font-medium">
                          <FileText className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span className="truncate">{item.document_name}</span>
                        </div>
                        {item.source_page && (
                          <span className="text-[10px] text-slate-400 block">Page {item.source_page}</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <ConfidenceBadge
                        score={item.confidence_score}
                        label={item.confidence_label}
                        compact
                        onClick={() => handleInspectConfidence(item.fact_id)}
                      />
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                          item.verification_status === 'verified'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
                            : item.verification_status === 'rejected'
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200'
                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200'
                        }`}>
                          {item.verification_status.replace('_', ' ')}
                        </span>
                        {item.has_discrepancy && (
                          <div className="flex items-center space-x-1 text-purple-600 dark:text-purple-400 text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>Conflict Flagged</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleInspectEvidence(item.fact_id)}
                          title="Inspect Ground Truth Excerpt"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-teal-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openResolution(item, 'verify')}
                          title="Mark Verified Against Source"
                          className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors border border-emerald-200/60"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openResolution(item, 'correct')}
                          title="Correct Claim Value"
                          className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors border border-teal-200/60"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openResolution(item, 'reject')}
                          title="Reject Unsupported Claim"
                          className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors border border-rose-200/60"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredItems.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800">
            <Pagination
              currentPage={queuePage}
              pageSize={queuePageSize}
              totalRecords={filteredItems.length}
              onPageChange={setQueuePage}
              onPageSizeChange={(sz) => {
                setQueuePageSize(sz);
                setQueuePage(1);
              }}
              pageSizeOptions={[10, 20, 50]}
            />
          </div>
        )}
      </div>

      {/* Resolution Modal / Workflow */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600">
                  Clinical Verification Action
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Resolve Claim: {selectedItem.normalized_value}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {/* Source Ground Truth excerpt */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-teal-600" /> {selectedItem.document_name}
                </span>
                <span>Page {selectedItem.source_page || 1}</span>
              </div>
              <blockquote className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 italic text-xs leading-relaxed">
                "{selectedItem.source_excerpt || 'Source excerpt not recorded during OCR.'}"
              </blockquote>
            </div>

            <form onSubmit={handleSubmitResolution} className="space-y-4">
              {/* Action Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Resolution Decision
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'verify', label: 'Verify', color: 'emerald' },
                    { id: 'needs_review', label: 'Needs Review', color: 'amber' },
                    { id: 'correct', label: 'Correct', color: 'teal' },
                    { id: 'reject', label: 'Reject', color: 'rose' },
                  ].map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => setResolutionAction(act.id as any)}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${
                        resolutionAction === act.id
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 ring-2 ring-teal-500/30'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Correction Fields if 'correct' chosen */}
              {resolutionAction === 'correct' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/50 dark:border-teal-900/40">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Corrected Value
                    </label>
                    <input
                      type="text"
                      value={correctedValue}
                      onChange={(e) => setCorrectedValue(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Corrected Event Date
                    </label>
                    <input
                      type="date"
                      value={correctedDate}
                      onChange={(e) => setCorrectedDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* Reviewer Clinical Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Clinician Notes & Verification Rationale
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Record justification, cross-checks against physical chart, or discrepancy explanation..."
                  rows={3}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {submitError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 text-xs">
                  {submitError}
                </div>
              )}

              {submitSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 text-xs flex items-center space-x-1.5">
                  <Check className="w-4 h-4" />
                  <span>{submitSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="med-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="med-btn-primary text-xs flex items-center space-x-1.5"
                >
                  {submitting && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>Save Decision</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confidence Detail Modal */}
      <ConfidenceInspectorModal
        confidenceDetail={confidenceDetail}
        isOpen={!!confidenceDetail}
        onClose={() => setConfidenceDetail(null)}
      />

      {/* Ground-Truth Evidence Modal */}
      <EvidenceModal evidence={evidenceData} onClose={() => setEvidenceData(null)} />
    </div>
  );
};
