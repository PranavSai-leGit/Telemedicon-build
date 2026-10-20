import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Calendar,
  FileText,
  Activity,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Dot
} from 'recharts';
import { LabTrendSeries, LabTrendPoint } from '../types';

interface LabTrendCardProps {
  series: LabTrendSeries;
  onInspectDocument?: (documentId: number) => void;
}

export const LabTrendCard: React.FC<LabTrendCardProps> = ({ series, onInspectDocument }) => {
  const [selectedPoint, setSelectedPoint] = useState<LabTrendPoint | null>(null);

  const points = series.data_points || [];
  const count = points.length;
  const latestPoint = count > 0 ? points[points.length - 1] : null;

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
            <AlertTriangle className="w-3 h-3" />
            High
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
            <AlertTriangle className="w-3 h-3" />
            Low
          </span>
        );
      case 'normal':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
            <CheckCircle className="w-3 h-3" />
            Normal
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
            Recorded
          </span>
        );
    }
  };

  const renderDelta = () => {
    if (series.delta === null || series.delta === undefined || count < 2) {
      return (
        <span className="text-xs text-neutral-400 dark:text-neutral-500 italic">
          Baseline (1st report)
        </span>
      );
    }
    const isPositive = series.delta > 0;
    const isZero = series.delta === 0;

    if (isZero) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
          <Minus className="w-3.5 h-3.5" />
          Unchanged
        </span>
      );
    }

    return (
      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold ${
          isPositive
            ? 'text-rose-600 dark:text-rose-400'
            : 'text-emerald-600 dark:text-emerald-400'
        }`}
      >
        {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
        {isPositive ? `+${series.delta}` : series.delta} {series.unit}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs overflow-hidden transition-all hover:shadow-md">
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 bg-neutral-50/50 dark:bg-neutral-900/50">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
              {series.test_name}
            </h4>
            {series.category && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300 border border-primary-200/60 dark:border-primary-900/40">
                {series.category}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
            <span>Reference Range: <strong className="text-neutral-700 dark:text-neutral-300">{series.reference_range}</strong></span>
            {series.unit && (
              <>
                <span>•</span>
                <span>Standard Unit: <strong className="text-neutral-700 dark:text-neutral-300">{series.unit}</strong></span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
            {count} {count === 1 ? 'Observation' : 'Observations'}
          </span>
          {latestPoint && getStatusBadge(series.latest_status || latestPoint.abnormality_status)}
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-neutral-100 dark:divide-neutral-800 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs">
        <div className="p-3.5 space-y-1">
          <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">Latest Value</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-neutral-900 dark:text-white">
              {series.latest_value ?? (latestPoint ? latestPoint.value : '—')}
            </span>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">{series.unit}</span>
          </div>
        </div>

        <div className="p-3.5 space-y-1">
          <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">Previous Value</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">
              {series.previous_value !== null && series.previous_value !== undefined ? series.previous_value : '—'}
            </span>
            {series.previous_value !== null && series.previous_value !== undefined && (
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">{series.unit}</span>
            )}
          </div>
        </div>

        <div className="p-3.5 space-y-1">
          <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">Change (Delta)</span>
          <div>{renderDelta()}</div>
        </div>

        <div className="p-3.5 space-y-1">
          <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">Latest Recorded Date</span>
          <div className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200 font-medium">
            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
            <span>{series.latest_date || (latestPoint ? latestPoint.date : '—')}</span>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="p-4 sm:p-5">
        {count >= 2 ? (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart
                data={points}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length) {
                    setSelectedPoint(e.activePayload[0].payload as LabTrendPoint);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickLine={false}
                  domain={['auto', 'auto']}
                  unit={` ${series.unit.split('/')[0]}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as LabTrendPoint;
                      return (
                        <div className="bg-neutral-900 dark:bg-neutral-950 text-white p-3 rounded-lg shadow-xl border border-neutral-700 text-xs space-y-1.5 max-w-xs">
                          <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-1">
                            <span className="font-semibold text-neutral-200">{data.date}</span>
                            {getStatusBadge(data.abnormality_status)}
                          </div>
                          <p className="text-sm font-bold text-white">
                            {data.value} {data.unit || series.unit}
                          </p>
                          <p className="text-[11px] text-neutral-400">
                            Extracted As: <strong className="text-neutral-200">{data.original_test_name}</strong>
                          </p>
                          <p className="text-[11px] text-neutral-400">
                            Source: <span className="text-neutral-300">{data.source_document_name || 'Report'}</span>
                          </p>
                          {data.reference_range && data.reference_range !== 'N/A' && (
                            <p className="text-[11px] text-neutral-400">
                              Ref Range: <span className="text-neutral-300">{data.reference_range}</span>
                            </p>
                          )}
                          <p className="text-[10px] text-primary-300 italic pt-0.5">
                            Click point to inspect report provenance
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#0F766E"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#0F766E', strokeWidth: 2, stroke: '#FFFFFF' }}
                  activeDot={{ r: 6, fill: '#0D9488', stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        ) : count === 1 ? (
          <div className="p-6 rounded-lg bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-950/50 flex items-center justify-center text-primary-600 dark:text-primary-400">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  Single Baseline Observation Recorded
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  A minimum of two chronological measurements are required to plot a trend curve.
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {latestPoint?.value} {series.unit}
              </span>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Extracted as "{latestPoint?.original_test_name}"
              </p>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-neutral-400">
            No numerical measurements recorded for this test.
          </div>
        )}

        {/* Selected Data Point Inspector Drawer */}
        {selectedPoint && (
          <div className="mt-4 p-3.5 rounded-lg bg-primary-50/60 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-900/40 text-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-primary-950 dark:text-primary-200">
                  Selected Measurement: {selectedPoint.value} {selectedPoint.unit || series.unit}
                </span>
                <span className="text-primary-400">•</span>
                <span className="text-neutral-600 dark:text-neutral-300">{selectedPoint.date}</span>
                {getStatusBadge(selectedPoint.abnormality_status)}
              </div>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-300">
                Reported in medical record as: <strong className="text-neutral-900 dark:text-white">"{selectedPoint.original_test_name}"</strong>
                {selectedPoint.source_document_name && (
                  <span> from <span className="underline font-medium">{selectedPoint.source_document_name}</span> (Page {selectedPoint.source_page || 1})</span>
                )}
              </p>
              {selectedPoint.source_excerpt && (
                <blockquote className="mt-1 pl-2 border-l-2 border-primary-400 text-[11px] text-neutral-600 dark:text-neutral-300 italic">
                  "{selectedPoint.source_excerpt}"
                </blockquote>
              )}
            </div>

            <div className="flex items-center gap-2">
              {onInspectDocument && selectedPoint.source_document_id && (
                <button
                  onClick={() => onInspectDocument(selectedPoint.source_document_id!)}
                  className="px-2.5 py-1.5 rounded bg-primary-600 hover:bg-primary-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Inspect Source Report</span>
                </button>
              )}
              <button
                onClick={() => setSelectedPoint(null)}
                className="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
