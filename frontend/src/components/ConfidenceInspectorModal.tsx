import React from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Info,
  Layers,
  Database,
  Search
} from 'lucide-react';
import { FactConfidenceDetail } from '../types';
import { api } from '../services/api';

interface ConfidenceInspectorModalProps {
  confidenceDetail: FactConfidenceDetail | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ConfidenceInspectorModal: React.FC<ConfidenceInspectorModalProps> = ({
  confidenceDetail,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !confidenceDetail) return null;

  const { system_confidence, extracted_value, entity_type, verification_status } = confidenceDetail;
  const score = system_confidence.score;
  const label = system_confidence.label;
  const breakdown = system_confidence.breakdown || {
    evidence_grounding: 0,
    evidence_support: 0,
    schema_validity: 0,
    consistency: 0,
    source_quality: 0
  };

  const isHigh = score >= 85 || label === 'High';
  const isMedium = (score >= 60 && score < 85) || label === 'Medium';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl ${
              isHigh
                ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400'
                : isMedium
                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400'
                : 'bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400'
            }`}>
              {isHigh ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Extraction Confidence Breakdown</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                  isHigh
                    ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200'
                    : isMedium
                    ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200'
                    : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200'
                }`}>
                  {score}/100 — {label}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verifiable heuristic extraction score for Claim #{confidenceDetail.claim_id} ({entity_type})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Prominent Mandatory Clinical Clarification Alert */}
          <div className="p-3.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 rounded-xl text-sky-800 dark:text-sky-200 text-xs flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Important Clinical Verification Notice</p>
              <p className="mt-0.5 leading-relaxed text-sky-700 dark:text-sky-300">
                Extraction confidence reflects evidence and deterministic validation checks. It is NOT a calibrated probability of clinical correctness. A high score signifies strong document provenance, not autonomous medical diagnosis.
              </p>
            </div>
          </div>

          {/* Claim Summary Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Normalized Fact
              </span>
              <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {extracted_value}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                Entity: {entity_type.replace('_', ' ')}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                Verification State
              </span>
              <span className={`inline-block mt-0.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${
                verification_status.includes('verified')
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200'
                  : verification_status.includes('contradicted') || verification_status.includes('rejected')
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200'
              }`}>
                {verification_status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* 5-Dimension Score Breakdown */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-teal-600" />
              <span>5-Dimensional Score Breakdown</span>
            </h4>
            <div className="space-y-3 bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
              {/* Dim 1: Grounding */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-700 dark:text-slate-300">1. Evidence Grounding (Quotation & Token Match)</span>
                  <span className="font-bold text-slate-900 dark:text-white">{breakdown.evidence_grounding} / 40 pts</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(breakdown.evidence_grounding / 40) * 100}%` }}
                  />
                </div>
              </div>

              {/* Dim 2: Support */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-700 dark:text-slate-300">2. Evidence Support Verification (Dosage & Entity Excerpt Match)</span>
                  <span className="font-bold text-slate-900 dark:text-white">{breakdown.evidence_support} / 25 pts</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(breakdown.evidence_support / 25) * 100}%` }}
                  />
                </div>
              </div>

              {/* Dim 3: Validity */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-700 dark:text-slate-300">3. Structural & Field Validity (Schema, Entity Enum, Dates)</span>
                  <span className="font-bold text-slate-900 dark:text-white">{breakdown.schema_validity} / 15 pts</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(breakdown.schema_validity / 15) * 100}%` }}
                  />
                </div>
              </div>

              {/* Dim 4: Consistency */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-700 dark:text-slate-300">4. Deterministic Consistency (No Dosage Conflicts or Chronology Errors)</span>
                  <span className="font-bold text-slate-900 dark:text-white">{breakdown.consistency} / 15 pts</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(breakdown.consistency / 15) * 100}%` }}
                  />
                </div>
              </div>

              {/* Dim 5: Source Quality */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-700 dark:text-slate-300">5. Source Document Quality (Digital vs OCR Fidelity)</span>
                  <span className="font-bold text-slate-900 dark:text-white">{breakdown.source_quality} / 5 pts</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(breakdown.source_quality / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Score Rationale Reasons */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Specific Deterministic Validation Reasons
            </h4>
            <ul className="space-y-1.5">
              {(system_confidence.reasons || []).map((reason, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-xs text-slate-700 dark:text-slate-300">
                  {reason.includes('conflict') || reason.includes('Contradiction') || reason.includes('Missing') ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  )}
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Exact Source Evidence Box */}
          {confidenceDetail.source_excerpt && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Supporting Passage in Document (Page {confidenceDetail.source_page || 1})
              </label>
              <div className="p-3.5 bg-teal-50/60 dark:bg-teal-950/20 border-l-4 border-teal-500 rounded-r-xl font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                "{confidenceDetail.source_excerpt}"
              </div>
              {confidenceDetail.char_offset_start !== null && confidenceDetail.char_offset_start !== undefined && (
                <p className="text-[11px] text-slate-400 mt-1">
                  Text Coordinates: Characters [{confidenceDetail.char_offset_start}–{confidenceDetail.char_offset_end}]
                </p>
              )}
            </div>
          )}

          {confidenceDetail.reviewer_notes && (
            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl text-xs">
              <span className="font-semibold text-purple-700 dark:text-purple-300">Clinician Reviewer Notes:</span>
              <p className="text-slate-700 dark:text-slate-200 mt-0.5">{confidenceDetail.reviewer_notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
          <a
            href={api.getDocumentViewUrl(confidenceDetail.source_document_id)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open Source Document ({confidenceDetail.source_document_name || 'File'})</span>
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
