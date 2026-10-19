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
  Eye
} from 'lucide-react';
import { api } from '../../services/api';
import { ClinicianDocumentItem } from '../../types';

export const ClinicianDocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<ClinicianDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const data = await api.getClinicianSharedDocuments();
        setDocuments(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, []);

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
            Review original medical records, discharge summaries, prescriptions, and diagnostic lab sheets shared by authorized patients.
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
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${typeFilter === t.id ? 'med-btn-primary' : 'med-btn-secondary'
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
                      <a
                        href={api.getDocumentFileUrl(doc.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="med-btn-secondary py-1 px-2.5 text-xs inline-flex items-center space-x-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
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
    </div>
  );
};
