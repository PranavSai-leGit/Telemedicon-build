import React, { useState, useEffect } from 'react';
import {
  Clock,
  Filter,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Edit2,
  Search,
  Sparkles,
  ShieldCheck,
  Share2,
  Network
} from 'lucide-react';
import { api } from '../../services/api';
import { ExtractedFact, RelationshipGraphResponse } from '../../types';
import { EvidenceModal } from '../../components/EvidenceModal';
import { MedicalRelationshipMap } from '../../components/MedicalRelationshipMap';

export const TimelinePage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'timeline' | 'map'>('timeline');
  const [facts, setFacts] = useState<ExtractedFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [evidenceData, setEvidenceData] = useState<any | null>(null);

  // Graph state
  const [graphData, setGraphData] = useState<RelationshipGraphResponse | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);

  // Edit / Correct Fact state
  const [editingFact, setEditingFact] = useState<ExtractedFact | null>(null);
  const [editValue, setEditValue] = useState('');

  const fetchFacts = async () => {
    try {
      const typeParam = filterType === 'all' ? undefined : filterType;
      const data = await api.getTimelineFacts(undefined, typeParam);
      setFacts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGraph = async () => {
    setGraphLoading(true);
    try {
      const res = await api.getRelationshipGraph();
      setGraphData(res);
    } catch (err) {
      console.error('Failed to load relationship graph:', err);
    } finally {
      setGraphLoading(false);
    }
  };

  useEffect(() => {
    fetchFacts();
  }, [filterType]);


  const handleInspect = async (factId: number) => {
    try {
      const ev = await api.getFactEvidence(factId);
      setEvidenceData(ev);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFact) return;

    try {
      await api.updateFact(editingFact.id, {
        normalized_value: editValue,
      });
      setEditingFact(null);
      await fetchFacts();
    } catch (err) {
      console.error('Failed to update fact:', err);
    }
  };

  const filteredFacts = facts.filter((f) => {
    if (!searchQuery) return true;
    return (
      f.normalized_value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.document_name && f.document_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      f.fact_type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'clinician_verified':
        return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'patient_confirmed':
        return 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800';
      case 'patient_corrected':
        return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'needs_review':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getTypeIconColor = (type: string) => {
    switch (type) {
      case 'condition':
        return 'bg-purple-500 text-white';
      case 'medication':
        return 'bg-teal-500 text-white';
      case 'lab_result':
        return 'bg-blue-500 text-white';
      case 'allergy':
        return 'bg-rose-500 text-white';
      default:
        return 'bg-slate-500 text-white';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header and View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {viewMode === 'timeline' ? 'Chronological Health Timeline' : 'Medical Relationship Map'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {viewMode === 'timeline'
              ? 'Unified clinical events ordered by clinical event date rather than upload date. Every fact is verifiable with original source excerpts.'
              : 'Interactive clinical graph connecting diagnoses, medications, laboratory results, and source documents.'}
          </p>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shrink-0 self-start md:self-auto">
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              viewMode === 'timeline'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-teal-600" />
            <span>Chronological Timeline</span>
          </button>
          <button
            onClick={() => {
              setViewMode('map');
              if (!graphData) fetchGraph();
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              viewMode === 'map'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Network className="w-3.5 h-3.5 text-teal-600" />
            <span>Medical Relationship Map</span>
          </button>
        </div>
      </div>

      {viewMode === 'map' ? (
        <MedicalRelationshipMap graphData={graphData} loading={graphLoading} />
      ) : (
        <>


      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: 'all', label: 'All Events' },
            { id: 'condition', label: 'Conditions' },
            { id: 'medication', label: 'Medications' },
            { id: 'lab_result', label: 'Lab Tests' },
            { id: 'allergy', label: 'Allergies' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterType(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filterType === cat.id
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search timeline facts..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Vertical Timeline */}
      <div className="relative border-l-2 border-teal-200 dark:border-teal-900/60 ml-4 sm:ml-6 space-y-8 pl-6 sm:pl-8">
        {filteredFacts.map((fact) => (
          <div key={fact.id} className="relative group">
            {/* Timeline Node Dot */}
            <div
              className={`absolute -left-[35px] sm:-left-[43px] top-1.5 w-7 h-7 rounded-full flex items-center justify-center shadow-xs ${getTypeIconColor(
                fact.fact_type
              )}`}
            >
              <Clock className="w-3.5 h-3.5" />
            </div>

            {/* Event Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-teal-400 dark:hover:border-teal-700 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                      {fact.fact_type.replace('_', ' ')}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{fact.event_date || 'Date unrecorded'}</span>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {fact.normalized_value}
                  </h3>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border capitalize ${getStatusBadge(
                      fact.verification_status || fact.extraction_status
                    )}`}
                  >
                    {(fact.verification_status || fact.extraction_status).replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Source Document Reference */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center space-x-2 truncate">
                  <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span className="truncate">Source: {fact.document_name || 'Document'}</span>
                  {fact.source_page && <span>(Page {fact.source_page})</span>}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setEditingFact(fact);
                      setEditValue(fact.normalized_value);
                    }}
                    className="inline-flex items-center space-x-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                    title="Correct this extracted fact"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Correct</span>
                  </button>

                  <button
                    onClick={() => handleInspect(fact.id)}
                    className="inline-flex items-center space-x-1 text-teal-600 dark:text-teal-400 hover:underline font-medium"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Evidence</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredFacts.length === 0 && !loading && (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            No health events found matching this filter.
          </div>
        )}
      </div>
      </>
      )}

      {/* Patient Correction Modal */}
      {editingFact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Correct Extracted Fact
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Update the normalized value for this record. Your correction will be preserved and flagged as Patient-Confirmed.
            </p>

            <form onSubmit={handleSaveCorrection} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Normalized Value
                </label>
                <input
                  type="text"
                  required
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingFact(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
                >
                  Save Correction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ground-Truth Evidence Modal */}
      <EvidenceModal evidence={evidenceData} onClose={() => setEvidenceData(null)} />
    </div>
  );
};
