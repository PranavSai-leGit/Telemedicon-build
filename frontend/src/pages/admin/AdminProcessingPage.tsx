import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';
import { AdminDocumentItem } from '../../types';

export const AdminProcessingPage: React.FC = () => {
  const [documents, setDocuments] = useState<AdminDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [reprocessingId, setReprocessingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchDocs = async () => {
    try {
      const data = await api.getAdminDocuments();
      setDocuments(data);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Failed to load document processing queue.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleReprocess = async (docId: number) => {
    setReprocessingId(docId);
    try {
      await api.reprocessAdminDocument(docId);
      setMessage({ type: 'success', text: `Document #${docId} reprocessed successfully.` });
      await fetchDocs();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Reprocessing failed.' });
    } finally {
      setReprocessingId(null);
    }
  };

  const filtered = documents.filter((d) => {
    const matchesSearch =
      d.uploaded_filename.toLowerCase().includes(search.toLowerCase()) ||
      d.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      d.sha256_hash.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.processing_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <div className="med-header-banner flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-teal-200">
            System Administration • Ingestion Pipeline
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Document Processing Monitor
          </h1>
          <p className="text-xs text-teal-100 mt-1 max-w-xl">
            Monitor OCR text extraction, AI entity structuring, deduplication audits, and trigger safe reprocessing jobs.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/20 text-white shrink-0 self-start md:self-auto">
          <Sparkles className="w-4 h-4 text-emerald-300" />
          <span>Gemini & PyMuPDF Pipeline</span>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${message.type === 'success'
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

      {/* Main Queue Card */}
      <div className="med-card p-6 space-y-4">
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
                  <tr key={doc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center space-x-2.5">
                        <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                        <div>
                          <div className="font-bold truncate max-w-xs">{doc.uploaded_filename}</div>
                          <div className="text-[10px] text-slate-400">
                            {(doc.size_bytes / 1024).toFixed(1)} KB • {doc.facts_count} facts
                          </div>
                        </div>
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
                        <span className="med-badge med-badge-success text-[10px] flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      )}
                      {doc.processing_status === 'duplicate' && (
                        <span className="med-badge med-badge-warning text-[10px] flex items-center gap-1 w-fit">
                          <AlertTriangle className="w-3 h-3" /> Duplicate
                        </span>
                      )}
                      {doc.processing_status === 'failed' && (
                        <span className="med-badge med-badge-error text-[10px] flex items-center gap-1 w-fit">
                          Failed
                        </span>
                      )}
                      {doc.processing_status === 'pending' && (
                        <span className="med-badge text-[10px] flex items-center gap-1 w-fit bg-slate-100 text-slate-600">
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
                        <RotateCcw className={`w-3.5 h-3.5 ${reprocessingId === doc.id ? 'animate-spin' : ''}`} />
                        <span>{reprocessingId === doc.id ? 'Processing...' : 'Reprocess'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
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
    </div>
  );
};
