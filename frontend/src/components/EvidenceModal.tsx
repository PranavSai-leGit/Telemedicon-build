import React from 'react';
import { X, FileText, CheckCircle2, ShieldCheck, Download, ExternalLink } from 'lucide-react';
import { api } from '../services/api';

interface EvidenceModalProps {
  evidence: {
    fact_id: number;
    normalized_value: string;
    fact_type: string;
    source_document_id: number;
    source_document_name: string;
    source_page: number;
    source_excerpt: string;
    sha256_hash: string;
    uploaded_at: string;
    extraction_status: string;
    verification_status: string;
  } | null;
  onClose: () => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({ evidence, onClose }) => {
  if (!evidence) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Source Evidence Inspector
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ground-truth clinical verification for Fact #{evidence.fact_id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Claim Box */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-700/50">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Normalized Claim / Measurement
            </span>
            <p className="mt-1 text-base font-medium text-slate-800 dark:text-slate-200">
              {evidence.normalized_value}
            </p>
            <div className="mt-2 flex items-center space-x-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium capitalize">
                Category: {evidence.fact_type.replace('_', ' ')}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${evidence.verification_status === 'clinician_verified'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                }`}>
                Status: {evidence.verification_status.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Exact Source Excerpt */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Exact Excerpt from Source Document (Page {evidence.source_page})
            </label>
            <div className="p-4 bg-teal-50/50 dark:bg-teal-950/20 border-l-4 border-teal-500 rounded-r-lg text-slate-800 dark:text-slate-200 font-mono text-sm leading-relaxed whitespace-pre-wrap">
              "{evidence.source_excerpt}"
            </div>
          </div>

          {/* Document Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
              <span className="text-slate-400">Source Document:</span>
              <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                {evidence.source_document_name}
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
              <span className="text-slate-400">Page Number:</span>
              <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                Page {evidence.source_page}
              </p>
            </div>
          </div>

          {/* Cryptographic SHA-256 Proof */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Cryptographic Integrity SHA-256:</span>
            </div>
            <p className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all select-all">
              {evidence.sha256_hash}
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <a
              href={api.getDocumentViewUrl(evidence.source_document_id)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Inspect Original Document / Image</span>
            </a>
            <a
              href={api.getDocumentFileUrl(evidence.source_document_id)}
              className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </a>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
