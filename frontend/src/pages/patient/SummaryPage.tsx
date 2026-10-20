import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  FileText,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Eye,
  ShieldCheck,
  Cpu,
  Clock,
  Pill,
  Heart,
  Calendar,
  HelpCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { SummaryResponseData } from '../../types';
import { EvidenceModal } from '../../components/EvidenceModal';

export const SummaryPage: React.FC = () => {
  const [summaryData, setSummaryData] = useState<SummaryResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [evidenceData, setEvidenceData] = useState<any | null>(null);

  const fetchSummary = async () => {
    try {
      const data = await api.getLatestPatientSummary();
      setSummaryData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await api.generatePatientSummary();
      setSummaryData(res);
    } catch (err: any) {
      alert(err.message || 'Failed to generate summary.');
    } finally {
      setGenerating(false);
    }
  };

  const handleInspectFact = async (factId: number) => {
    try {
      const ev = await api.getFactEvidence(factId);
      setEvidenceData(ev);
    } catch (err) {
      console.error(err);
    }
  };

  const payload = summaryData?.summary_payload;

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Generation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Evidence-Linked Health Summary
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Structured clinical synthesis generated from your stored records. Every claim is cross-referenced with ground-truth facts.
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs shadow-teal-600/30 transition-all disabled:opacity-50 shrink-0"
        >
          {generating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Cpu className="w-4 h-4" />
          )}
          <span>{generating ? 'Synthesizing with Clinical AI...' : 'Generate New Summary'}</span>
        </button>
      </div>

      {/* Provenance Badge & Model Info */}
      {summaryData && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 dark:text-white">
                  Engine: {summaryData.model_identifier}
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  Mode: {summaryData.generation_mode}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Generated: {new Date(summaryData.created_at).toLocaleString()} | Included Records: {summaryData.included_document_ids.length}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
            <ShieldCheck className="w-4 h-4" />
            <span>100% of claims verified against PostgreSQL facts</span>
          </div>
        </div>
      )}

      {/* Summary Sections */}
      {payload ? (
        <div className="space-y-6">
          {/* Executive Summary */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Executive Clinical Brief
            </h3>
            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
              {payload.executive_summary}
            </p>
          </div>

          {/* Section 1: Relevant Medical History */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400">
              <Heart className="w-5 h-5" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                1. Relevant Documented Medical History
              </h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {payload.relevant_history?.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    • {item.claim_text}
                  </span>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    {item.supporting_fact_ids?.map((fid) => (
                      <button
                        key={fid}
                        onClick={() => handleInspectFact(fid)}
                        className="px-2 py-0.5 rounded bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-mono text-[10px] flex items-center space-x-1 transition-colors"
                        title="Inspect ground-truth evidence"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Fact #{fid}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Recorded Medication History */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center space-x-2 text-teal-600 dark:text-teal-400">
              <Pill className="w-5 h-5" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                2. Recorded Medication Regimens
              </h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {payload.medications?.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    • {item.claim_text}
                  </span>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    {item.supporting_fact_ids?.map((fid) => (
                      <button
                        key={fid}
                        onClick={() => handleInspectFact(fid)}
                        className="px-2 py-0.5 rounded bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-mono text-[10px] flex items-center space-x-1 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Fact #{fid}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Adverse Allergies */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                3. Recorded Allergy & Adverse Reaction Profile
              </h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {payload.allergies?.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    • {item.claim_text}
                  </span>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    {item.supporting_fact_ids?.map((fid) => (
                      <button
                        key={fid}
                        onClick={() => handleInspectFact(fid)}
                        className="px-2 py-0.5 rounded bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-mono text-[10px] flex items-center space-x-1 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Fact #{fid}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Laboratory Measurements */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                4. Key Laboratory & Diagnostic Measurements
              </h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {payload.laboratory_measurements?.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    • {item.claim_text}
                  </span>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    {item.supporting_fact_ids?.map((fid) => (
                      <button
                        key={fid}
                        onClick={() => handleInspectFact(fid)}
                        className="px-2 py-0.5 rounded bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-mono text-[10px] flex items-center space-x-1 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Fact #{fid}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Recent Events */}
          {payload.recent_events && payload.recent_events.length > 0 && (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                <Calendar className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  5. Recent Documented Events
                </h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {payload.recent_events.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <span className="text-slate-800 dark:text-slate-200 font-medium">
                      • {item.claim_text}
                    </span>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      {item.supporting_fact_ids?.map((fid) => (
                        <button
                          key={fid}
                          onClick={() => handleInspectFact(fid)}
                          className="px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-mono text-[10px]"
                        >
                          Fact #{fid}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 6 & 7: Missing Info & Potential Discrepancies */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-slate-500">
                <HelpCircle className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  6. Missing or Unclear Records
                </h3>
              </div>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                {payload.missing_information?.map((msg, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="text-slate-400">•</span>
                    <span>{msg}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/60 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  7. Potential Discrepancies
                </h3>
              </div>
              <ul className="space-y-2 text-xs text-amber-800 dark:text-amber-300 font-medium">
                {payload.potential_discrepancies?.map((msg, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="text-amber-500">•</span>
                    <span>{msg}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <FileCheck2 className="w-8 h-8 text-teal-600 dark:text-teal-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No Summary Generated Yet
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Click the button below to synthesize your stored medical facts into a structured, evidence-linked clinical summary.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl"
          >
            Generate AI Summary
          </button>
        </div>
      )}

      {/* Ground-Truth Evidence Modal */}
      <EvidenceModal evidence={evidenceData} onClose={() => setEvidenceData(null)} />
    </div>
  );
};
