import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  FileText,
  Search,
  Filter,
  ShieldAlert,
  Send,
  Calendar,
  Eye
} from 'lucide-react';
import { api } from '../../services/api';
import { Discrepancy } from '../../types';
import { EvidenceModal } from '../../components/EvidenceModal';

export const ClinicianDiscrepanciesPage: React.FC = () => {
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [evidenceData, setEvidenceData] = useState<any | null>(null);

  // Review modal state
  const [selectedDisc, setSelectedDisc] = useState<Discrepancy | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string>('confirmed');
  const [reviewNote, setReviewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDiscrepancies = async () => {
    try {
      const data = await api.getAllClinicianDiscrepancies();
      setDiscrepancies(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscrepancies();
  }, []);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDisc) return;
    setSubmitting(true);
    try {
      await api.reviewDiscrepancy(selectedDisc.id, reviewStatus, reviewNote);
      setSelectedDisc(null);
      setReviewNote('');
      await fetchDiscrepancies();
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInspect = async (factId?: number) => {
    if (!factId) return;
    try {
      const ev = await api.getFactEvidence(factId);
      setEvidenceData(ev);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredDiscs = discrepancies.filter((d) => {
    const matchesSearch =
      d.explanation.toLowerCase().includes(search.toLowerCase()) ||
      (d.fact_1?.normalized_value && d.fact_1.normalized_value.toLowerCase().includes(search.toLowerCase())) ||
      (d.fact_2?.normalized_value && d.fact_2.normalized_value.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || d.review_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'med-badge-success';
      case 'unresolved':
        return 'med-badge-error';
      case 'requires_additional_information':
        return 'med-badge-warning';
      case 'needs_review':
      default:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <div className="med-header-banner flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-teal-200">
            Medication Safety • Discrepancy Reconciliation
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Clinical Discrepancy Review
          </h1>
          <p className="text-xs text-teal-100 mt-1 max-w-xl">
            Audit potential medication conflicts, dosage alterations, and timeline discrepancies flagged across authorized patient records.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/20 text-white shrink-0 self-start md:self-auto">
          <ShieldAlert className="w-4 h-4 text-amber-300" />
          <span>Patient Safety Audit</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="med-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: `All Alerts (${discrepancies.length})` },
              { id: 'needs_review', label: 'Needs Review' },
              { id: 'confirmed', label: 'Confirmed' },
              { id: 'unresolved', label: 'Unresolved' },
              { id: 'requires_additional_information', label: 'Requires Info' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${statusFilter === f.id ? 'med-btn-primary' : 'med-btn-secondary'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search discrepancies..."
              className="med-input pl-9 pr-3 py-1.5 text-xs w-full"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading reconciliation alerts...</div>
        ) : (
          <div className="space-y-4">
            {filteredDiscs.map((disc) => (
              <div
                key={disc.id}
                className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-4 h-4" />
                    </span>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        {disc.discrepancy_type.replace('_', ' ')}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        Patient #{disc.patient_id} Reconciliation Alert
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`med-badge text-xs capitalize ${getStatusBadge(disc.review_status)}`}>
                      {disc.review_status.replace('_', ' ')}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedDisc(disc);
                        setReviewStatus(disc.review_status === 'needs_review' ? 'confirmed' : disc.review_status);
                        setReviewNote(disc.review_note || '');
                      }}
                      className="med-btn-primary py-1 px-3 text-xs"
                    >
                      Update Decision
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/40">
                  {disc.explanation}
                </p>

                {/* Side-by-Side Fact Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Record 1 */}
                  {disc.fact_1 ? (
                    <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Earlier Record (Record 1)
                        </span>
                        <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3" /> {disc.fact_1.event_date || 'Date unrecorded'}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {disc.fact_1.normalized_value}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700">
                        <span className="truncate max-w-[200px]">Doc: {disc.fact_1.document_name}</span>
                        <button
                          onClick={() => handleInspect(disc.fact_1?.id)}
                          className="text-teal-600 hover:underline font-semibold flex items-center gap-0.5"
                        >
                          <Eye className="w-3 h-3" /> Inspect Excerpt
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 italic">
                      Prior clinical record not linked.
                    </div>
                  )}

                  {/* Record 2 */}
                  {disc.fact_2 ? (
                    <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Subsequent Record (Record 2)
                        </span>
                        <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3" /> {disc.fact_2.event_date || 'Date unrecorded'}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {disc.fact_2.normalized_value}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700">
                        <span className="truncate max-w-[200px]">Doc: {disc.fact_2.document_name}</span>
                        <button
                          onClick={() => handleInspect(disc.fact_2?.id)}
                          className="text-teal-600 hover:underline font-semibold flex items-center gap-0.5"
                        >
                          <Eye className="w-3 h-3" /> Inspect Excerpt
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 italic">
                      Subsequent clinical record not linked.
                    </div>
                  )}
                </div>

                {/* Clinician Review Notes */}
                {disc.review_note && (
                  <div className="p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/40 text-xs">
                    <span className="font-bold text-teal-800 dark:text-teal-300">
                      Clinician Review Note ({disc.reviewer_name || 'Attending Physician'}):
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 mt-0.5">{disc.review_note}</p>
                  </div>
                )}
              </div>
            ))}

            {filteredDiscs.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                No discrepancies found matching this filter.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review Decision Modal */}
      {selectedDisc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg med-card p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Clinical Reconciliation Decision
            </h3>
            <p className="text-xs text-slate-500">
              Record your clinical judgment regarding this potential medication discrepancy. Your review will be preserved in the audit trail.
            </p>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Reconciliation Status
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'confirmed', label: 'Confirmed Transition', desc: 'Patient transitioned regimen' },
                    { id: 'unresolved', label: 'Unresolved Conflict', desc: 'Active conflicting orders' },
                    { id: 'requires_additional_information', label: 'Requires Info', desc: 'Pending pharmacy consult' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setReviewStatus(s.id)}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                        reviewStatus === s.id
                          ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200 font-bold'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div>{s.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Clinical Reconciliation Note
                </label>
                <textarea
                  rows={3}
                  required
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="e.g. Confirmed with patient that Metformin XR 1000mg QD superseded previous 500mg BID regimen..."
                  className="med-input w-full text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDisc(null)}
                  className="med-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="med-btn-primary flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting...' : 'Save Decision'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ground-Truth Evidence Modal */}
      <EvidenceModal evidence={evidenceData} onClose={() => setEvidenceData(null)} />
    </div>
  );
};
