import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileDown,
  Clock,
  LineChart,
  FileCheck2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Eye,
  Calendar,
  Pill,
  Send,
  UserCheck,
  Network
} from 'lucide-react';
import { api } from '../../services/api';
import {
  MedicalDocument,
  ExtractedFact,
  Discrepancy,
  SummaryResponseData,
  LabTrendSeries,
  RelationshipGraphResponse
} from '../../types';
import { EvidenceModal } from '../../components/EvidenceModal';
import { MedicalRelationshipMap } from '../../components/MedicalRelationshipMap';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export const PatientReviewPage: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const pId = Number(patientId);

  const [activeTab, setActiveTab] = useState<'timeline' | 'map' | 'labs' | 'handover' | 'discrepancies' | 'docs'>('discrepancies');
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [facts, setFacts] = useState<ExtractedFact[]>([]);
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [labTrends, setLabTrends] = useState<LabTrendSeries[]>([]);
  const [handover, setHandover] = useState<SummaryResponseData | null>(null);
  const [graphData, setGraphData] = useState<RelationshipGraphResponse | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [evidenceData, setEvidenceData] = useState<any | null>(null);

  // Review Form state
  const [reviewNote, setReviewNote] = useState<Record<number, string>>({});
  const [reviewingId, setReviewingId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const [docsRes, factsRes, discsRes, labsRes] = await Promise.all([
        api.getDocuments(pId),
        api.getTimelineFacts(pId),
        api.getPatientDiscrepancies(pId),
        api.getPatientLabTrends(pId),
      ]);
      setDocuments(docsRes);
      setFacts(factsRes);
      setDiscrepancies(discsRes);
      setLabTrends(labsRes);
    } catch (err) {
      console.error('Failed to load patient clinical records:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGraph = async () => {
    setGraphLoading(true);
    try {
      const res = await api.getRelationshipGraph(pId);
      setGraphData(res);
    } catch (err) {
      console.error('Failed to load patient relationship graph:', err);
    } finally {
      setGraphLoading(false);
    }
  };

  useEffect(() => {
    if (pId) {
      fetchData();
    }
  }, [pId]);

  const handleGenerateHandover = async () => {
    try {
      const res = await api.generateClinicianHandover(pId);
      setHandover(res);
      setActiveTab('handover');
    } catch (err: any) {
      alert(err.message || 'Failed to generate handover.');
    }
  };

  const handleReviewDiscrepancy = async (discrepancyId: number, status: string) => {
    setReviewingId(discrepancyId);
    try {
      const note = reviewNote[discrepancyId] || '';
      await api.reviewDiscrepancy(discrepancyId, status, note);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit review.');
    } finally {
      setReviewingId(null);
    }
  };

  const handleVerifyFact = async (factId: number) => {
    try {
      await api.updateFact(factId, {
        verification_status: 'clinician_verified',
      });
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Verification failed.');
    }
  };

  const handleInspect = async (factId: number) => {
    try {
      const ev = await api.getFactEvidence(factId);
      setEvidenceData(ev);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            to="/clinician/dashboard"
            className="p-2 rounded-xl med-btn-secondary"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Authorized Clinical Record Review
              </h1>
              <span className="med-badge med-badge-teal">
                Patient #{pId}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Access limited strictly to records included in active patient-granted consents.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleGenerateHandover}
            className="med-btn-secondary"
          >
            <FileCheck2 className="w-4 h-4 text-teal-700 dark:text-teal-400" />
            <span>Generate Handover</span>
          </button>
          <a
            href={api.getHandoverPdfUrl(pId)}
            target="_blank"
            rel="noreferrer"
            className="med-btn-primary"
          >
            <FileDown className="w-4 h-4" />
            <span>Download Handover PDF</span>
          </a>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#DCE5EA] dark:border-slate-800 pb-2">
        {[
          { id: 'discrepancies', label: `Discrepancies (${discrepancies.length})`, icon: AlertTriangle },
          { id: 'timeline', label: `Timeline (${facts.length})`, icon: Clock },
          { id: 'map', label: 'Relationship Map', icon: Network },
          { id: 'labs', label: `Lab Trends (${labTrends.length})`, icon: LineChart },
          { id: 'handover', label: 'Clinical Handover', icon: FileCheck2 },
          { id: 'docs', label: `Shared Records (${documents.length})`, icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'map' && !graphData) {
                  fetchGraph();
                }
              }}
              className={isActive ? 'med-btn-primary' : 'med-btn-secondary'}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab: Medical Relationship Map */}
      {activeTab === 'map' && (
        <MedicalRelationshipMap
          graphData={graphData}
          loading={graphLoading}
          onJumpToTimeline={(factId) => setActiveTab('timeline')}
        />
      )}

      {/* Tab 1: Medication Reconciliation & Discrepancies */}
      {activeTab === 'discrepancies' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-300/60 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Record Reconciliation Engine</p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                MediTale flagged the following potential conflicts across independent health records. Review and confirm whether instructions reflect intentional treatment transitions or contradictory advice.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {discrepancies.map((disc) => (
              <div
                key={disc.id}
                className="med-card p-6 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Potential Discrepancy — Review Required
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-xs text-slate-400">
                      Type: {disc.discrepancy_type.replace('_', ' ')}
                    </span>
                  </div>
                  <span className={`med-badge uppercase tracking-wider ${
                    disc.review_status === 'confirmed'
                      ? 'med-badge-success'
                      : disc.review_status === 'unresolved'
                      ? 'med-badge-error'
                      : 'med-badge-warning'
                  }`}>
                    Status: {disc.review_status.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                  {disc.explanation}
                </p>

                {/* Evidence Comparison Boxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {disc.fact_1 && (
                    <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Record 1</span>
                      <p className="font-bold text-slate-900 dark:text-white">{disc.fact_1.normalized_value}</p>
                      <p className="text-slate-500 dark:text-slate-400">
                        Date: {disc.fact_1.event_date || 'Unrecorded'} • Source: {disc.fact_1.document_name}
                      </p>
                      <button
                        onClick={() => handleInspect(disc.fact_1!.id)}
                        className="text-teal-700 dark:text-teal-400 font-medium hover:underline text-[11px] pt-1"
                      >
                        Inspect Record 1 Excerpt
                      </button>
                    </div>
                  )}

                  {disc.fact_2 && (
                    <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Record 2</span>
                      <p className="font-bold text-slate-900 dark:text-white">{disc.fact_2.normalized_value}</p>
                      <p className="text-slate-500 dark:text-slate-400">
                        Date: {disc.fact_2.event_date || 'Unrecorded'} • Source: {disc.fact_2.document_name}
                      </p>
                      <button
                        onClick={() => handleInspect(disc.fact_2!.id)}
                        className="text-teal-700 dark:text-teal-400 font-medium hover:underline text-[11px] pt-1"
                      >
                        Inspect Record 2 Excerpt
                      </button>
                    </div>
                  )}
                </div>

                {/* Existing Review Note */}
                {disc.review_note && (
                  <div className="p-3 bg-teal-50/60 dark:bg-teal-950/20 rounded-xl border border-teal-200/50 dark:border-teal-900/40 text-xs text-teal-900 dark:text-teal-200">
                    <span className="font-bold">Clinician Review Note (by {disc.reviewer_name || 'Clinician'}):</span>
                    <p className="mt-0.5">{disc.review_note}</p>
                  </div>
                )}

                {/* Clinician Action Review Form */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Add Clinical Reconciliation Note
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Confirmed with patient: transitioned to once-daily 1000mg XR on Oct 15."
                      value={reviewNote[disc.id] || ''}
                      onChange={(e) =>
                        setReviewNote({ ...reviewNote, [disc.id]: e.target.value })
                      }
                      className="med-input w-full"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleReviewDiscrepancy(disc.id, 'confirmed')}
                      disabled={reviewingId === disc.id}
                      className="med-btn-primary"
                    >
                      Mark Confirmed Transition
                    </button>
                    <button
                      onClick={() => handleReviewDiscrepancy(disc.id, 'unresolved')}
                      disabled={reviewingId === disc.id}
                      className="med-btn-danger"
                    >
                      Mark Unresolved Conflict
                    </button>
                    <button
                      onClick={() => handleReviewDiscrepancy(disc.id, 'requires_additional_information')}
                      disabled={reviewingId === disc.id}
                      className="med-btn-secondary"
                    >
                      Requires Additional Info
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {discrepancies.length === 0 && !loading && (
              <div className="med-card p-8 text-center text-xs text-slate-400">
                No medication discrepancies detected within the authorized documents.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Authorized Timeline */}
      {activeTab === 'timeline' && (
        <div className="med-card p-6 space-y-4">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            Authorized Chronological Facts
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {facts.map((fact) => (
              <div key={fact.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold uppercase text-[10px] text-teal-700 dark:text-teal-400">
                      {fact.fact_type.replace('_', ' ')}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-slate-400">{fact.event_date || 'Date unrecorded'}</span>
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{fact.normalized_value}</p>
                  <p className="text-[11px] text-slate-400">Source: {fact.document_name}</p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {fact.verification_status !== 'clinician_verified' && (
                    <button
                      onClick={() => handleVerifyFact(fact.id)}
                      className="med-btn-primary text-xs py-1 px-2.5"
                    >
                      Verify Fact
                    </button>
                  )}
                  <button
                    onClick={() => handleInspect(fact.id)}
                    className="p-1.5 text-slate-400 hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
                    title="View ground-truth excerpt"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Laboratory Trends */}
      {activeTab === 'labs' && (
        <div className="space-y-6">
          {labTrends.map((series, idx) => (
            <div
              key={idx}
              className="med-card p-6 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {series.test_name} ({series.unit})
                </h4>
                <span className="text-xs text-slate-400">
                  Ref Range: {series.reference_range}
                </span>
              </div>

              <div className="h-60 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={series.data_points}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#122131',
                        borderColor: '#1C3349',
                        borderRadius: '0.75rem',
                        color: '#F0F6FA',
                        fontSize: '12px',
                      }}
                    />
                    <Line type="monotone" dataKey="value" stroke="#0F766E" strokeWidth={2.5} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}

          {labTrends.length === 0 && (
            <div className="med-card p-8 text-center text-xs text-slate-400">
              No laboratory diagnostic data in authorized records.
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Clinical Handover & AI Summary */}
      {activeTab === 'handover' && (
        <div className="med-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Evidence-Linked Clinical Handover
              </h3>
              <p className="text-xs text-slate-400">
                Consolidated from authorized records only. Every claim maps to a verified fact ID.
              </p>
            </div>
            <a
              href={api.getHandoverPdfUrl(pId)}
              target="_blank"
              rel="noreferrer"
              className="med-btn-primary"
            >
              <FileDown className="w-4 h-4" />
              <span>Download Official PDF</span>
            </a>
          </div>

          {handover ? (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl">
                <span className="font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 text-[10px]">
                  Executive Summary
                </span>
                <p className="mt-1 text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {handover.summary_payload.executive_summary}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-2">Active Documented Regimens:</h4>
                <div className="space-y-1">
                  {handover.summary_payload.medications?.map((m, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/40">
                      <span>• {m.claim_text}</span>
                      {m.supporting_fact_ids?.[0] && (
                        <button
                          onClick={() => handleInspect(m.supporting_fact_ids[0])}
                          className="med-badge med-badge-teal font-mono cursor-pointer"
                        >
                          Fact #{m.supporting_fact_ids[0]}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-3">
              <p className="text-xs text-slate-400">Click below to synthesize the handover report.</p>
              <button
                onClick={handleGenerateHandover}
                className="med-btn-primary"
              >
                Synthesize Clinical Handover
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Shared Records */}
      {activeTab === 'docs' && (
        <div className="med-card p-6 space-y-4">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            Authorized Original Documents
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {documents.map((doc) => (
              <div key={doc.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <FileText className="w-4 h-4 text-teal-700 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{doc.uploaded_filename}</p>
                    <p className="text-[11px] text-slate-400">
                      {doc.document_type.replace('_', ' ')} • Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <a
                  href={api.getDocumentFileUrl(doc.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="med-btn-ghost text-teal-700 dark:text-teal-400 font-medium"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Download</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evidence Inspector Modal */}
      <EvidenceModal evidence={evidenceData} onClose={() => setEvidenceData(null)} />
    </div>
  );
};
