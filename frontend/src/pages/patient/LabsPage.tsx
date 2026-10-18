import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Activity, Calendar, FileText, AlertCircle, Info, Eye } from 'lucide-react';
import { api } from '../../services/api';
import { ExtractedFact } from '../../types';
import { EvidenceModal } from '../../components/EvidenceModal';

interface LabSeries {
  testName: string;
  unit: string;
  referenceRange: string;
  points: { date: string; value: number; factId: number; docName: string }[];
}

export const LabsPage: React.FC = () => {
  const [labFacts, setLabFacts] = useState<ExtractedFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState<string>('');
  const [evidenceData, setEvidenceData] = useState<any | null>(null);

  useEffect(() => {
    const fetchLabs = async () => {
      try {
        const data = await api.getTimelineFacts(undefined, 'lab_result');
        setLabFacts(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLabs();
  }, []);

  // Group facts by test name
  const seriesMap: Record<string, LabSeries> = {};
  labFacts.forEach((f) => {
    const name = f.normalized_value;
    const valJson = f.value_json || {};
    const numVal = typeof valJson.value === 'number' ? valJson.value : parseFloat(valJson.value);
    if (isNaN(numVal)) return;

    if (!seriesMap[name]) {
      seriesMap[name] = {
        testName: name,
        unit: f.unit || valJson.unit || '',
        referenceRange: valJson.reference_range || 'N/A',
        points: [],
      };
    }
    seriesMap[name].points.push({
      date: f.event_date || f.created_at.split('T')[0],
      value: numVal,
      factId: f.id,
      docName: f.document_name || 'Lab Report',
    });
  });

  const availableTests = Object.keys(seriesMap);

  useEffect(() => {
    if (availableTests.length > 0 && (!selectedTest || !seriesMap[selectedTest])) {
      setSelectedTest(availableTests[0]);
    }
  }, [availableTests, selectedTest]);

  const activeSeries = selectedTest ? seriesMap[selectedTest] : null;

  const handleInspect = async (factId: number) => {
    try {
      const ev = await api.getFactEvidence(factId);
      setEvidenceData(ev);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Laboratory Biomarker Trends
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Interactive charts tracking recorded diagnostic values across multiple dates and clinical laboratories.
        </p>
      </div>

      {/* Test Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {availableTests.map((tName) => (
          <button
            key={tName}
            onClick={() => setSelectedTest(tName)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              selectedTest === tName
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {tName}
          </button>
        ))}
      </div>

      {/* Chart Card */}
      {activeSeries ? (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Diagnostic Trend Analysis
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {activeSeries.testName} ({activeSeries.unit})
              </h2>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="px-3 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                Reference Range: <strong>{activeSeries.referenceRange}</strong>
              </span>
            </div>
          </div>

          {/* Recharts Chart Container */}
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeSeries.points} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`${value} ${activeSeries.unit}`, activeSeries.testName]}
                  labelFormatter={(label) => `Clinical Date: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#0d9488"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#0d9488', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Data Points List */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Recorded Data Points & Reports
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeSeries.points.map((pt, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {pt.value} {activeSeries.unit}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">{pt.date} • {pt.docName}</p>
                  </div>
                  <button
                    onClick={() => handleInspect(pt.factId)}
                    className="p-1.5 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/50 rounded-lg transition-colors"
                    title="View source evidence"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
          No structured laboratory measurements found to chart yet.
        </div>
      )}

      {/* Non-diagnostic Disclaimer */}
      <div className="p-4 rounded-xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-900/40 flex items-start space-x-3 text-xs text-teal-800 dark:text-teal-300">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-teal-600 dark:text-teal-400" />
        <span>
          <strong>Clinical Charting Notice:</strong> Laboratory trends display historical values extracted from your medical records. Charts are provided for clinical discussion and do not autonomously diagnose medical conditions.
        </span>
      </div>

      {/* Ground-Truth Evidence Modal */}
      <EvidenceModal evidence={evidenceData} onClose={() => setEvidenceData(null)} />
    </div>
  );
};
