import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  Cpu
} from 'lucide-react';
import { api } from '../../services/api';
import { AdminDocumentItem } from '../../types';

export const AdminProcessingPage: React.FC = () => {
  const [documents, setDocuments] = useState<AdminDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reprocessingId, setReprocessingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchDocuments = async () => {
    try {
      const data = await api.getAdminDocuments(undefined, 100);
      setDocuments(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleReprocess = async (docId: number) => {
    setReprocessingId(docId);
    setMessage(null);
    try {
      const res = await api.reprocessAdminDocument(docId);
      setMessage({ text: res.message, type: 'success' });
      fetchDocuments();
    } catch (err: any) {
      setMessage({
        text: err.response?.data?.detail || 'Reprocessing failed.',
        type: 'error',
      });
    } finally {
      setReprocessingId(null);
    }
  };

  const filtered = documents.filter((doc) => {
    const matchesSearch =
      doc.uploaded_filename.toLowerCase().includes(search.toLowerCase()) ||
      doc.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      (doc.sha256_hash && doc.sha256_hash.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus =
      statusFilter === 'all' || doc.processing_status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const completedCount = documents.filter((d) => d.processing_status === 'completed').length;
  const duplicateCount = documents.filter((d) => d.processing_status === 'duplicate').length;
  const failedCount = documents.filter((d) => d.processing_status === 'failed').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="med-header-banner flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-teal-200">
            Pipeline Operations • Ingestion & Extraction
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Document Ingestion & Processing Monitor
          </h1>
          <p className="text-xs text-teal-100 mt-1 max-w-xl">
            Monitor OCR text extraction, AI entity structuring, deduplication audits, and trigger safe reprocessing jobs.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/20 text-white shrink-0 self-start md:self-auto">
          <Sparkles className="w-4 h-4 text-emerald-300" />
          <span>Gemini & PyMuPDF Engine Active</span>
        </div>
      </div>

      {/* Metric Stat Containers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="med-card med-card-hover p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Total Ingested</span>
            <FileText className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{documents.length}</div>
          <div className="text-[11px] text-slate-400">Total clinical uploads</div>
        </div>
        <div className="med-card med-card-hover p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Completed Jobs</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{completedCount}</div>
          <div className="text-[11px] text-slate-400">Entities extracted</div>
        </div>
        <div className="med-card med-card-hover p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Duplicates Filtered</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{duplicateCount}</div>
          <div className="text-[11px] text-slate-400">SHA-256 matches</div>
        </div>
        <div className="med-card med-card-hover p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Ingestion Errors</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600">{failedCount}</div>
          <div className="text-[11px] text-slate-400">Requiring retry</div>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="font-bold underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Queue Card Container */}
      <div className="med-card med-card-hover p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: `All Jobs (${documents.length})` },
              { id: 'completed', label: 'Completed' },
              { id: 'duplicate', label: 'Duplicates' },
              { id: 'failed', label: 'Failed' },
              { id: 'pending', label: 'Pending' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  statusFilter === f.id ? 'med-btn-primary' : 'med-btn-secondary'
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
              placeholder="Search by file, patient, hash..."
              className="med-input pl-9 pr-3 py-1.5 text-xs w-full"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading document monitor...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200/80 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4 font-bold">Document</th>
                  <th className="py-3 px-4 font-bold">Patient</th>
                  <th className="py-3 px-4 font-bold">SHA-256 Checksum</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold">Uploaded At</th>
                  <th className="py-3 px-4 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                        <span className="truncate max-w-[200px]" title={doc.uploaded_filename}>{doc.uploaded_filename}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 ml-6">
                        {doc.size_bytes ? `${Math.round(doc.size_bytes / 1024)} KB` : 'Unknown size'} • {doc.mime_type || 'PDF'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{doc.patient_name}</div>
                      <div className="text-[10px] text-slate-400">Patient #{doc.patient_id}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[10px] text-slate-500">
                      {doc.sha256_hash ? doc.sha256_hash.substring(0, 16) + '...' : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      {doc.processing_status === 'completed' && (
                        <span className="med-badge med-badge-success flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      )}
                      {doc.processing_status === 'duplicate' && (
                        <span className="med-badge med-badge-warning flex items-center gap-1 w-fit">
                          <AlertTriangle className="w-3 h-3" /> Duplicate
                        </span>
                      )}
                      {doc.processing_status === 'failed' && (
                        <span className="med-badge med-badge-error flex items-center gap-1 w-fit">
                          Failed
                        </span>
                      )}
                      {doc.processing_status === 'pending' && (
                        <span className="med-badge med-badge-slate flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(doc.uploaded_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleReprocess(doc.id)}
                        disabled={reprocessingId === doc.id}
                        className="med-btn-secondary py-1 px-2.5 text-xs inline-flex items-center space-x-1"
                        title="Safely re-run OCR & entity extraction"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${reprocessingId === doc.id ? 'animate-spin' : ''}`} />
                        <span>Reprocess</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                      No documents found matching this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Information Container: Pipeline Architecture Standards */}
      <div className="med-card med-card-hover p-5 space-y-3">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
            Ingestion Pipeline Standards & Deduplication Protocols
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200">Cryptographic Checksumming</span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Every upload is hashed via SHA-256 immediately upon arrival to detect and prevent duplicate document ingestion.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200">Dual-Engine Text Extraction</span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Native text streams are processed via PyMuPDF, with fallback to Tesseract OCR for scanned physical documents.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200">Idempotent Reprocessing</span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Triggering a reprocess safely updates extracted entities and relations without duplicating historical timeline events.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
