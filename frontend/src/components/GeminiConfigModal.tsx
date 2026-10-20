import React, { useState } from 'react';
import { Sparkles, Key, CheckCircle2, AlertCircle, X, Cpu, ExternalLink, Loader2, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';

interface GeminiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
  currentModel?: string;
}

export const GeminiConfigModal: React.FC<GeminiConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
  currentModel = 'gemini-3.8-flash',
}) => {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(currentModel);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setResult({ success: false, message: 'Please enter a valid Gemini API key.' });
      return;
    }

    setTesting(true);
    setResult(null);

    try {
      const res = await api.configureAI(apiKey.trim(), model);
      setResult({ success: true, message: res.message || 'Gemini API connected successfully!' });
      setTimeout(() => {
        if (onConfigSaved) onConfigSaved();
        onClose();
      }, 1200);
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || 'Failed to connect to Gemini API. Please verify your key and network.',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-gradient-to-tr from-teal-500 to-emerald-500 text-white rounded-xl shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Configure Gemini Multimodal AI
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Unlock automated extraction for handwritten prescriptions & lab reports
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Banner */}
        <div className="mt-4 p-3 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/60 rounded-xl text-xs text-teal-900 dark:text-teal-200 space-y-1">
          <p className="font-semibold flex items-center space-x-1.5">
            <Cpu className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>Why is a Gemini API key required?</span>
          </p>
          <p className="text-[11px] leading-relaxed text-teal-800 dark:text-teal-300">
            MediTale uses Google Gemini's multimodal vision model to read prescription photos, scanned medical reports, dosages, and clinician handwriting. The key is securely preserved on your server in <code className="font-mono bg-teal-100 dark:bg-teal-900 px-1 py-0.5 rounded">.env</code>.
          </p>
        </div>

        {/* Feedback Alert */}
        {result && (
          <div
            className={`mt-4 p-3 rounded-xl border flex items-start space-x-2.5 text-xs font-medium ${
              result.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-800 dark:text-rose-200'
            }`}
          >
            {result.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            )}
            <span>{result.message}</span>
          </div>
        )}

        {/* Configuration Form */}
        <form onSubmit={handleSave} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Gemini API Key
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Key className="w-4 h-4" />
              </div>
              <input
                type={showKey ? 'text' : 'password'}
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
                className="w-full pl-9 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>Must begin with AIzaSy...</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-teal-600 dark:text-teal-400 hover:underline flex items-center space-x-0.5"
              >
                <span>Get a free key from Google AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Multimodal Vision Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
            >
              <option value="gemini-3.8-flash">Gemini 3.8 Flash (Recommended - Latest Generation)</option>
              <option value="gemini-3.0-flash">Gemini 3.0 Flash</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Clinical Reasoning)</option>
            </select>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={testing}
              className="px-4 py-2 font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={testing || !apiKey.trim()}
              className="inline-flex items-center space-x-1.5 px-5 py-2 font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-xs"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying API Key...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Validate & Connect</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
