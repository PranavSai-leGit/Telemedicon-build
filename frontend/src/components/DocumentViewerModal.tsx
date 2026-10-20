import React, { useState } from 'react';
import {
  X,
  FileText,
  Download,
  ExternalLink,
  Cpu,
  ShieldCheck,
  Calendar,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Pill,
  Activity,
  HeartPulse,
  AlertCircle,
  Plus,
  RefreshCw,
  Maximize2,
  Loader2,
  ZoomIn,
  ZoomOut,
  TrendingUp
} from 'lucide-react';
import { api } from '../services/api';
import { MedicalDocument } from '../types';
import { LabTrendModal } from './LabTrendModal';

interface DocumentViewerModalProps {
  document: MedicalDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onReprocess?: (docId: number) => Promise<void>;
  onOpenManualEntry?: (doc: MedicalDocument) => void;
  aiConfigured: boolean;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document: doc,
  isOpen,
  onClose,
  onReprocess,
  onOpenManualEntry,
  aiConfigured,
}) => {
  const [reprocessing, setReprocessing] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeTab, setActiveTab] = useState<'facts' | 'metadata'>('facts');
  const [trendModalOpen, setTrendModalOpen] = useState(false);
  const [targetTestName, setTargetTestName] = useState<string | undefined>();

  if (!isOpen || !doc) return null;

  const isImage = doc.mime_type.startsWith('image/') || /\.(jpg|jpeg|png)$/i.test(doc.uploaded_filename);
  const isPdf = doc.mime_type === 'application/pdf' || /\.pdf$/i.test(doc.uploaded_filename);

  const handleReprocess = async () => {
    if (!onReprocess) return;
    setReprocessing(true);
    try {
      await onReprocess(doc.id);
    } finally {
      setReprocessing(false);
    }
  };

  const extractedData = doc.extracted_data || {};
  const medications = extractedData.medications || [];
  const conditions = extractedData.conditions || [];
  const labTests = extractedData.lab_tests || [];
  const allergies = extractedData.allergies || [];
  const missingFields = extractedData.missing_fields || [];
  const clinicalNotes = extractedData.clinical_notes;
  const totalFacts = medications.length + conditions.length + labTests.length + allergies.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-6xl h-[92vh] max-h-[900px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {doc.uploaded_filename}
                </h2>
                <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-100/70 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300">
                  {doc.document_type.replace('_', ' ')}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize border ${
                    doc.processing_status === 'completed'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200'
                      : doc.processing_status === 'pending'
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {doc.processing_status === 'pending' ? 'Pending AI Extraction' : doc.processing_status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Uploaded on {new Date(doc.uploaded_at).toLocaleString()} • {(doc.size_bytes / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <a
              href={api.getDocumentViewUrl(doc.id)}
              target="_blank"
              rel="noreferrer"
              className="p-2 text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Open raw file in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <a
              href={api.getDocumentFileUrl(doc.id)}
              className="p-2 text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Download original file"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body (2 Columns) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800">
          {/* Left Column: Source Document / Image Viewer (7 cols) */}
          <div className="lg:col-span-7 flex flex-col h-full bg-slate-950/5 dark:bg-slate-950/40 overflow-hidden">
            <div className="px-4 py-2 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 bg-white/50 dark:bg-slate-900/50">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Original Ground-Truth Document</span>
              </span>
              {isImage && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono w-10 text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoomLevel(1)}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 text-[10px] font-medium"
                    title="Reset Zoom"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>

            {/* Document Render Area */}
            <div className="flex-1 p-4 overflow-auto flex items-center justify-center">
              {isImage ? (
                <div className="overflow-auto max-h-full max-w-full flex items-center justify-center">
                  <img
                    src={api.getDocumentViewUrl(doc.id)}
                    alt={doc.uploaded_filename}
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                    className="max-h-[64vh] max-w-full object-contain rounded-xl border border-slate-200 dark:border-slate-800 shadow-md transition-transform duration-150"
                  />
                </div>
              ) : isPdf ? (
                <iframe
                  src={api.getDocumentViewUrl(doc.id)}
                  title={doc.uploaded_filename}
                  className="w-full h-full min-h-[500px] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
                />
              ) : (
                <div className="text-center p-8 space-y-3">
                  <FileText className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-700" />
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                    Preview not directly available for this MIME format.
                  </p>
                  <a
                    href={api.getDocumentFileUrl(doc.id)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Original File</span>
                  </a>
                </div>
              )}
            </div>

            {/* Bottom Proof Ribbon */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <div className="flex items-center space-x-1 font-mono truncate max-w-md">
                <span className="text-slate-400 shrink-0">SHA-256:</span>
                <span className="truncate select-all text-slate-700 dark:text-slate-300">
                  {doc.sha256_hash}
                </span>
              </div>
              <span className="shrink-0 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Encrypted & Stored</span>
              </span>
            </div>
          </div>

          {/* Right Column: Extracted Clinical Facts & AI Controls (5 cols) */}
          <div className="lg:col-span-5 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
            {/* Action Bar */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/40 dark:bg-slate-850">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Structured Clinical Facts ({totalFacts})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Extracted by Gemini AI & Verified Relational Facts
                </p>
              </div>
              <div className="flex items-center space-x-1.5">
                {onOpenManualEntry && (
                  <button
                    onClick={() => onOpenManualEntry(doc)}
                    className="px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors flex items-center space-x-1"
                    title="Add or correct facts manually"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Edit Facts</span>
                  </button>
                )}
                {onReprocess && (
                  <button
                    onClick={handleReprocess}
                    disabled={reprocessing}
                    className="px-3 py-1 text-xs font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs"
                    title="Run Gemini AI extraction on this document"
                  >
                    {reprocessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Cpu className="w-3.5 h-3.5" />
                        <span>{totalFacts === 0 ? 'Analyze with AI' : 'Re-analyze'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Fact Contents List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Alert if pending or no facts extracted */}
              {totalFacts === 0 && (
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                  <div className="flex items-center space-x-2 font-bold text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>No Clinical Facts Extracted Yet</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/90">
                    {!aiConfigured ? (
                      <>
                        Automated AI extraction is awaiting configuration by your hospital system administrator. The original file has been securely stored and integrity verified. You can enter structured clinical facts manually or re-analyze once administrative setup is completed.
                      </>
                    ) : (
                      <>
                        No structured facts have been indexed for this record. Click "Analyze with AI" above to run Gemini multimodal vision on this document.
                      </>
                    )}
                  </p>
                  <div className="pt-2 flex items-center space-x-2">
                    {onOpenManualEntry && (
                      <button
                        onClick={() => onOpenManualEntry(doc)}
                        className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-medium"
                      >
                        ✏️ Enter Facts Manually
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Clinical Notes Summary */}
              {clinicalNotes && (
                <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Clinical Overview
                  </span>
                  <p className="text-xs text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">
                    {clinicalNotes}
                  </p>
                </div>
              )}

              {/* 1. Medications */}
              {medications.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Pill className="w-4 h-4 text-teal-600" />
                    <span>Prescribed Medications ({medications.length})</span>
                  </div>
                  <div className="space-y-2">
                    {medications.map((m: any, i: number) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-750 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {m.name}
                          </span>
                          {m.dosage && (
                            <span className="font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/80 px-2 py-0.5 rounded-md text-[11px]">
                              {m.dosage}
                            </span>
                          )}
                        </div>
                        {m.instructions && (
                          <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                            {m.instructions}
                          </p>
                        )}
                        {m.source_excerpt && (
                          <div className="mt-1 pt-1 border-t border-slate-200/50 dark:border-slate-700/50 text-[10px] text-slate-400 italic">
                            Excerpt: "{m.source_excerpt}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Diagnosed Conditions */}
              {conditions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <HeartPulse className="w-4 h-4 text-rose-500" />
                    <span>Diagnosed Conditions ({conditions.length})</span>
                  </div>
                  <div className="space-y-2">
                    {conditions.map((c: any, i: number) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-750 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {c.name}
                          </span>
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                            {c.status || 'Active'}
                          </span>
                        </div>
                        {c.source_excerpt && (
                          <div className="mt-1 text-[10px] text-slate-400 italic">
                            Excerpt: "{c.source_excerpt}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Laboratory Measurements */}
              {labTests.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <Activity className="w-4 h-4 text-blue-500" />
                      <span>Laboratory Measurements ({labTests.length})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetTestName(undefined);
                        setTrendModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200/60 dark:border-teal-900/40 rounded-lg transition-colors cursor-pointer"
                      title="Plot longitudinal trends for tests in this report"
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
                      <span>View Report Lab Trends</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {labTests.map((l: any, i: number) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-750 text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {l.name}
                          </div>
                          {l.reference_range && (
                            <div className="text-[10px] text-slate-400">
                              Ref: {l.reference_range}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setTargetTestName(l.name);
                              setTrendModalOpen(true);
                            }}
                            className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:underline cursor-pointer"
                          >
                            <TrendingUp className="w-3 h-3" />
                            <span>Plot Trend</span>
                          </button>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {l.value}
                          </span>
                          {l.unit && (
                            <span className="ml-1 text-[11px] text-slate-500">{l.unit}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Allergies */}
              {allergies.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span>Documented Allergies ({allergies.length})</span>
                  </div>
                  <div className="space-y-2">
                    {allergies.map((a: any, i: number) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-xs space-y-1"
                      >
                        <div className="font-bold text-amber-900 dark:text-amber-200">
                          {a.allergen}
                        </div>
                        {a.reaction && (
                          <p className="text-[11px] text-amber-800 dark:text-amber-300">
                            Reaction: {a.reaction}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Fields Note */}
              {missingFields.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/50 dark:border-slate-800 text-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Clinical Data Gaps Detected
                  </span>
                  <ul className="list-disc pl-4 text-[11px] text-slate-500 space-y-0.5">
                    {missingFields.map((f: string, i: number) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Laboratory Trend Modal */}
      <LabTrendModal
        isOpen={trendModalOpen}
        onClose={() => setTrendModalOpen(false)}
        testName={targetTestName}
        documentId={doc.id}
        documentName={doc.uploaded_filename}
      />
    </div>
  );
};
