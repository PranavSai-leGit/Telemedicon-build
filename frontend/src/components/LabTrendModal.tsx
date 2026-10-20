import React, { useEffect, useState } from 'react';
import { X, FlaskConical, AlertCircle, RefreshCw } from 'lucide-react';
import { LabTrendSeries } from '../types';
import { LabTrendCard } from './LabTrendCard';
import { api } from '../services/api';

interface LabTrendModalProps {
  isOpen: boolean;
  onClose: () => void;
  canonicalId?: string;
  testName?: string;
  patientId?: number;
}

export const LabTrendModal: React.FC<LabTrendModalProps> = ({
  isOpen,
  onClose,
  canonicalId,
  testName,
  patientId,
}) => {
  const [trends, setTrends] = useState<LabTrendSeries[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchTrends = async () => {
      setLoading(true);
      setError(null);
      try {
        let data: LabTrendSeries[] = [];
        if (patientId) {
          data = await api.getPatientLabTrends(patientId);
        } else {
          data = await api.getCanonicalLabTrends();
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
  }, [isOpen, patientId]);

  if (!isOpen) return null;

  // Filter trends to match requested canonicalId or testName if provided
  const matchingTrends = trends.filter((t) => {
    if (canonicalId && t.canonical_id === canonicalId) return true;
    if (testName && t.test_name.toLowerCase().includes(testName.toLowerCase())) return true;
    return false;
  });

  const displayTrends = matchingTrends.length > 0 ? matchingTrends : trends;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3 bg-neutral-50/70 dark:bg-neutral-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/60 dark:border-teal-900/50 flex items-center justify-center text-teal-700 dark:text-teal-400">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {testName ? `${testName} — Longitudinal Trend` : 'Laboratory Measurement Trends'}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Unified across all authorized diagnostic reports with canonical normalization.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-neutral-500 dark:text-neutral-400">
              <RefreshCw className="w-7 h-7 animate-spin text-primary-600" />
              <p className="text-xs font-medium">Aggregating canonical observations across reports...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 flex items-center gap-3 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : displayTrends.length > 0 ? (
            <div className="space-y-6">
              {displayTrends.map((series, idx) => (
                <LabTrendCard key={series.canonical_id || idx} series={series} />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-neutral-500 dark:text-neutral-400">
              No historical observations found for this laboratory test.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <span>
            {displayTrends.length} laboratory {displayTrends.length === 1 ? 'test series' : 'test series'} available.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 font-medium text-neutral-800 dark:text-neutral-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
