import React from 'react';
import { ShieldAlert, ShieldCheck, HelpCircle } from 'lucide-react';

interface ConfidenceBadgeProps {
  score?: number | null;
  label?: string | null;
  onClick?: () => void;
  compact?: boolean;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  score,
  label,
  onClick,
  compact = false,
}) => {
  if (score === null || score === undefined) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
        title="Extraction confidence unavailable"
      >
        <HelpCircle className="w-3 h-3 text-slate-400" />
        <span>Confidence: Uncalculated</span>
      </button>
    );
  }

  const isHigh = score >= 85 || label === 'High';
  const isMedium = (score >= 60 && score < 85) || label === 'Medium';

  let colorClasses = 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
  let Icon = ShieldAlert;

  if (isHigh) {
    colorClasses = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    Icon = ShieldCheck;
  } else if (isMedium) {
    colorClasses = 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    Icon = ShieldAlert;
  }

  const displayLabel = label || (isHigh ? 'High' : isMedium ? 'Medium' : 'Low');

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${colorClasses} hover:opacity-90 transition-opacity cursor-pointer`}
        title={`Extraction confidence score: ${score}/100 (${displayLabel}). Click for transparent audit breakdown.`}
      >
        <Icon className="w-3 h-3" />
        <span>{score}/100</span>
        <span className="font-normal opacity-85">({displayLabel})</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorClasses} hover:opacity-90 transition-opacity cursor-pointer`}
      title="Click for transparent evidence and validation breakdown"
    >
      <Icon className="w-3.5 h-3.5" />
      <span>Extraction confidence:</span>
      <span className="font-bold">{score}/100</span>
      <span>— {displayLabel}</span>
    </button>
  );
};
