import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Download,
  Calendar,
  Users,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Search
} from 'lucide-react';
import { api } from '../../services/api';
import { ClinicianHandoverItem } from '../../types';

export const ClinicianHandoversPage: React.FC = () => {
  const [handovers, setHandovers] = useState<ClinicianHandoverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchHandovers = async () => {
      try {
        const data = await api.getClinicianHandovers();
        setHandovers(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHandovers();
  }, []);

  const filteredHandovers = handovers.filter(
    (h) =>
      h.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      h.patient_email.toLowerCase().includes(search.toLowerCase()) ||
      h.executive_summary.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <div className="med-header-banner flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-teal-200">
            Clinical Handover • Shift & Transfer Briefs
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Structured Clinical Handovers
          </h1>
          <p className="text-xs text-teal-100 mt-1 max-w-xl">
            Formal, evidence-grounded clinical summaries generated for patient handover, cross-provider consultations, and outpatient referrals.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/20 text-white shrink-0 self-start md:self-auto">
          <ShieldCheck className="w-4 h-4 text-teal-300" />
          <span>ReportLab Verified PDF Exports</span>
        </div>
      </div>

      {/* Main List Card */}
      <div className="med-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <FileCheck2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Generated Handover Records ({filteredHandovers.length})
            </h3>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search handovers..."
              className="med-input pl-9 pr-3 py-1.5 text-xs w-full"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading clinical handovers...</div>
        ) : (
          <div className="space-y-4">
            {filteredHandovers.map((h) => (
              <div
                key={h.id}
                className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-teal-400 dark:hover:border-teal-700 transition-all bg-white dark:bg-slate-900/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-base text-slate-900 dark:text-white">
                      {h.patient_name}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-xs text-slate-400">{h.patient_email}</span>
                    <span className="med-badge med-badge-teal text-[10px]">
                      {h.model_identifier || 'Gemini 1.5 Pro'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {h.executive_summary || 'Evidence-linked structured handover prepared from authorized records.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Generated {new Date(h.created_at).toLocaleString()}
                    </span>
                    <span>•</span>
                    <span>{h.relevant_history_count} history items</span>
                    <span>•</span>
                    <span>{h.medications_count} active medications</span>
                    {h.discrepancies_count > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          {h.discrepancies_count} reconciliation notes
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <a
                    href={api.getHandoverPdfUrl(h.patient_id)}
                    target="_blank"
                    rel="noreferrer"
                    className="med-btn-primary flex items-center space-x-1.5 py-2 px-3.5 text-xs shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Handover PDF</span>
                  </a>
                </div>
              </div>
            ))}

            {filteredHandovers.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                No clinical handovers generated yet. Visit an authorized patient's review page to generate a handover.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
