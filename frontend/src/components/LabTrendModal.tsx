import React, { useEffect, useState } from 'react';
import { X, FlaskConical, AlertCircle, RefreshCw, Search, Filter, Info, FileText } from 'lucide-react';
import { LabTrendSeries } from '../types';
import { LabTrendCard } from './LabTrendCard';
import { api } from '../services/api';

interface LabTrendModalProps {
  isOpen: boolean;
  onClose: () => void;
  canonicalId?: string;
  testName?: string;
  patientId?: number;
  documentId?: number;
  documentName?: string;
}

export const LabTrendModal: React.FC<LabTrendModalProps> = ({
  isOpen,
  onClose,
  canonicalId,
  testName,
  patientId,
  documentId,
  documentName,
}) => {
  const [trends, setTrends] = useState<LabTrendSeries[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'focused' | 'all'>('focused');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const fetchTrends = async () => {
      setLoading(true);
      setError(null);
      try {
        let data: LabTrendSeries[] = [];
        if (patientId) {
          data = await api.getPatientLabTrends(patientId, documentId);
        } else {
          data = await api.getCanonicalLabTrends(undefined, documentId);
        }
        setTrends(data);
      } catch (err: any) {
        console.error('Failed to load lab trends:', err);
        setError(err.message || 'Failed to load laboratory trends.');
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, [isOpen, patientId, documentId]);

  if (!isOpen) return null;

  // Filter trends to match requested canonicalId, testName, or documentId if provided
  const matchingTrends = trends.filter((t) => {
    if (canonicalId && t.canonical_id === canonicalId) return true;
    if (testName) {
      const q = testName.toLowerCase().trim();
      if (t.test_name.toLowerCase().includes(q) || q.includes(t.test_name.toLowerCase())) return true;
      if (t.canonical_id?.toLowerCase().includes(q)) return true;
      if (
        t.data_points?.some(
          (p) =>
            p.original_test_name &&
            (p.original_test_name.toLowerCase().includes(q) ||
              q.includes(p.original_test_name.toLowerCase()))
        )
      ) {
        return true;
      }
    }
    if (documentId) {
      if (t.data_points?.some((p) => p.source_document_id === documentId)) return true;
    }
    return false;
  });

  const hasSpecificTarget = Boolean(canonicalId || testName || documentId);
  const matchedAny = matchingTrends.length > 0;

  // Final list depending on active tab or search
  let baseList = (hasSpecificTarget && activeFilter === 'focused' && matchedAny) ? matchingTrends : trends;

  if (searchQuery.trim()) {
    const sq = searchQuery.toLowerCase().trim();
    baseList = trends.filter(
      (t) =>
        t.test_name.toLowerCase().includes(sq) ||
        (t.category && t.category.toLowerCase().includes(sq)) ||
        (t.canonical_id && t.canonical_id.toLowerCase().includes(sq)) ||
        t.data_points?.some((p) => p.original_test_name && p.original_test_name.toLowerCase().includes(sq))
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/70 border border-teal-200/60 dark:border-teal-900/50 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {testName
                    ? `${testName} — Longitudinal Trend`
                    : documentName
                    ? `Laboratory Trends from ${documentName}`
                    : 'Laboratory & Biomarker Trends'}
                </h3>
                {documentId && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-100/70 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300">
                    Report #{documentId}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Canonical laboratory measurements unified and normalized across medical reports.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Mode Bar */}
        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 text-xs">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search tests or aliases in trends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {hasSpecificTarget && (
            <div className="flex items-center gap-1.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                onClick={() => setActiveFilter('focused')}
                className={`px-3 py-1 rounded-md font-medium text-xs transition-colors ${
                  activeFilter === 'focused'
                    ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Targeted Test ({matchingTrends.length})
              </button>
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 rounded-md font-medium text-xs transition-colors ${
                  activeFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All Patient Tests ({trends.length})
              </button>
            </div>
          )}
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {hasSpecificTarget && !matchedAny && !loading && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="font-semibold">Direct test name alias did not have a dedicated trend series.</p>
                <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                  Showing all {trends.length} normalized laboratory measurement series available for this patient below:
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
              <p className="text-xs font-medium">Unifying and normalizing laboratory test measurements...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 flex items-center gap-3 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : baseList.length > 0 ? (
            <div className="space-y-5">
              {baseList.map((series, idx) => (
                <LabTrendCard key={series.canonical_id || idx} series={series} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-xs text-slate-400 space-y-2">
              <FlaskConical className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 opacity-60" />
              <p>No laboratory measurement records found for this selection.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            {baseList.length} diagnostic {baseList.length === 1 ? 'trend series' : 'trend series'} displayed.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-medium text-slate-800 dark:text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
