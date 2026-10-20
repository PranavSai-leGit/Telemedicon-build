import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, Info, Search, FlaskConical } from 'lucide-react';
import { api } from '../../services/api';
import { LabTrendSeries } from '../../types';
import { LabTrendCard } from '../../components/LabTrendCard';
import { DocumentViewerModal } from '../../components/DocumentViewerModal';
import { MedicalDocument } from '../../types';

export const LabsPage: React.FC = () => {
  const [trends, setTrends] = useState<LabTrendSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewerDoc, setViewerDoc] = useState<MedicalDocument | null>(null);

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const data = await api.getCanonicalLabTrends();
      setTrends(data);
    } catch (err) {
      console.error('Failed to fetch canonical lab trends:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, []);

  const handleInspectDocument = async (docId: number) => {
    try {
      const doc = await api.getDocument(docId);
      setViewerDoc(doc);
    } catch (err) {
      console.error('Failed to fetch document for inspection:', err);
    }
  };

  // Categories
  const categories = Array.from(new Set(trends.map((t) => t.category).filter(Boolean)));

  // Filter trends
  const filteredTrends = trends.filter((t) => {
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = t.test_name.toLowerCase().includes(q);
      const matchCat = t.category?.toLowerCase().includes(q);
      const matchPoint = t.data_points.some((p) => p.original_test_name?.toLowerCase().includes(q));
      if (!matchName && !matchCat && !matchPoint) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/80 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200/60 dark:border-teal-900/40 flex items-center justify-center text-teal-700 dark:text-teal-400">
              <FlaskConical className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Laboratory & Biomarker Trends
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Canonical laboratory measurements normalized and unified across all your uploaded medical reports.
          </p>
        </div>

        <button
          onClick={fetchTrends}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-white dark:bg-neutral-900 p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search canonical test name or original report alias..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-neutral-500 dark:text-neutral-400 font-medium">Panel:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
          >
            <option value="all">All Diagnostic Panels</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Trends List */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-neutral-500 dark:text-neutral-400">
          <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
          <p className="text-xs font-medium">Loading and unifying laboratory measurements...</p>
        </div>
      ) : filteredTrends.length > 0 ? (
        <div className="space-y-6">
          {filteredTrends.map((series, idx) => (
            <LabTrendCard
              key={series.canonical_id || idx}
              series={series}
              onInspectDocument={handleInspectDocument}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 text-neutral-400 text-xs space-y-2">
          <Activity className="w-8 h-8 mx-auto text-neutral-400 opacity-40" />
          <p>No laboratory measurement records match your search or filters.</p>
        </div>
      )}

      {/* Clinical Disclaimer */}
      <div className="p-4 rounded-xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-900/40 flex items-start space-x-3 text-xs text-teal-800 dark:text-teal-300">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-teal-600 dark:text-teal-400" />
        <span>
          <strong>Clinical Normalization Notice:</strong> Equivalent tests across multiple reports (such as "RBC" and "RBC Count") are unified under verified canonical identities to produce continuous chronological trend lines. Discrepant or incompatible assays remain safely segregated.
        </span>
      </div>

      {/* Document Viewer Modal */}
      {viewerDoc && (
        <DocumentViewerModal
          document={viewerDoc}
          isOpen={Boolean(viewerDoc)}
          onClose={() => setViewerDoc(null)}
          aiConfigured={true}
        />
      )}
    </div>
  );
};
