import React, { useState, useEffect } from 'react';
import {
  Share2,
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  Clock,
  Calendar,
  Lock,
  ChevronRight
} from 'lucide-react';
import { api } from '../../services/api';
import { User, MedicalDocument, SharingGrant } from '../../types';

export const SharingPage: React.FC = () => {
  const [clinicians, setClinicians] = useState<User[]>([]);
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [grants, setGrants] = useState<SharingGrant[]>([]);
  const [loading, setLoading] = useState(true);

  // Sharing form state
  const [selectedClinicianId, setSelectedClinicianId] = useState<number | ''>('');
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [durationDays, setDurationDays] = useState<number>(30);
  const [granting, setGranting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    try {
      const [clinRes, docsRes, grantsRes] = await Promise.all([
        api.getClinicians(),
        api.getDocuments(),
        api.getSharingGrants(),
      ]);
      setClinicians(clinRes);
      setDocuments(docsRes);
      setGrants(grantsRes);

      if (clinRes.length > 0 && selectedClinicianId === '') {
        setSelectedClinicianId(clinRes[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleDoc = (docId: number) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleSelectAllDocs = () => {
    if (selectedDocIds.length === documents.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(documents.map((d) => d.id));
    }
  };

  const handleCreateGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClinicianId) {
      setMessage({ type: 'error', text: 'Please select a clinician.' });
      return;
    }
    if (selectedDocIds.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one document to share.' });
      return;
    }

    setGranting(true);
    setMessage(null);
    try {
      await api.createSharingGrant(Number(selectedClinicianId), selectedDocIds, durationDays);
      setMessage({
        type: 'success',
        text: `Successfully granted explicit access to ${selectedDocIds.length} records.`,
      });
      setSelectedDocIds([]);
      await fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to grant access.' });
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (grantId: number) => {
    if (!window.confirm('Are you sure you want to immediately revoke access for this clinician?')) return;

    try {
      await api.revokeSharingGrant(grantId);
      setMessage({ type: 'success', text: 'Sharing authorization revoked immediately.' });
      await fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to revoke access.' });
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Consent-Based Clinician Sharing
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          You retain complete ownership over your health data. Explicitly choose which documents are shared with which doctor, and revoke access at any time.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border flex items-start space-x-3 text-xs font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Grant Access Form Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800 text-teal-600 dark:text-teal-400">
          <Share2 className="w-5 h-5" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Grant Explicit Consultation Access
          </h2>
        </div>

        <form onSubmit={handleCreateGrant} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                1. Select Authorized Clinician
              </label>
              <select
                value={selectedClinicianId}
                onChange={(e) => setSelectedClinicianId(Number(e.target.value))}
                className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {clinicians.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                2. Access Duration (Days)
              </label>
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value={7}>7 Days (Single Consultation)</option>
                <option value={30}>30 Days (Standard Care Episode)</option>
                <option value={90}>90 Days (Chronic Disease Management)</option>
                <option value={365}>1 Year (Ongoing Primary Care)</option>
              </select>
            </div>
          </div>

          {/* Document Selection Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                3. Choose Documents to Share ({selectedDocIds.length} of {documents.length} selected)
              </label>
              <button
                type="button"
                onClick={handleSelectAllDocs}
                className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline"
              >
                {selectedDocIds.length === documents.length ? 'Deselect All' : 'Select All Records'}
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 p-2 bg-slate-50/50 dark:bg-slate-800/30">
              {documents.map((doc) => {
                const isSelected = selectedDocIds.includes(doc.id);
                return (
                  <label
                    key={doc.id}
                    className="flex items-center space-x-3 p-2.5 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleDoc(doc.id)}
                      className="w-4 h-4 text-teal-600 rounded-sm border-slate-300 dark:border-slate-600 focus:ring-teal-500"
                    />
                    <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {doc.uploaded_filename}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {doc.document_type.replace('_', ' ')} • Date: {doc.document_date || 'Unrecorded'}
                      </p>
                    </div>
                  </label>
                );
              })}

              {documents.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400">
                  No documents in your storage to share. Please upload records first.
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={granting || documents.length === 0}
            className="w-full sm:w-auto px-6 py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs shadow-teal-600/30 transition-all disabled:opacity-50"
          >
            {granting ? 'Processing consent grant...' : 'Grant Access to Clinician'}
          </button>
        </form>
      </div>

      {/* Active & Historical Sharing Grants Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
          Active & Historical Access Grants
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          All authorizations are logged in the audit trail. Revoked grants immediately prevent doctors from querying your records.
        </p>

        <div className="space-y-4">
          {grants.map((grant) => {
            const isActive = grant.status === 'active';
            return (
              <div
                key={grant.id}
                className={`p-4 rounded-xl border transition-all ${
                  isActive
                    ? 'border-teal-200 dark:border-teal-900/60 bg-teal-50/20 dark:bg-teal-950/10'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 opacity-75'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {grant.clinician_name}
                      </h4>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                          isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200'
                            : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200'
                        }`}
                      >
                        {grant.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                      <span>Granted: {new Date(grant.created_at).toLocaleDateString()}</span>
                      {grant.expires_at && (
                        <span>Expires: {new Date(grant.expires_at).toLocaleDateString()}</span>
                      )}
                      <span>Shared Documents: {grant.documents?.length || 0}</span>
                    </div>
                  </div>

                  {isActive && (
                    <button
                      onClick={() => handleRevoke(grant.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-lg transition-colors shrink-0"
                    >
                      Revoke Access Now
                    </button>
                  )}
                </div>

                {/* Shared Document Badges */}
                {grant.documents && grant.documents.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-1.5">
                    {grant.documents.map((d) => (
                      <span
                        key={d.id}
                        className="px-2 py-0.5 text-[11px] rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center space-x-1"
                      >
                        <FileText className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                        <span className="truncate max-w-[200px]">{d.uploaded_filename}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {grants.length === 0 && !loading && (
            <div className="p-8 text-center text-xs text-slate-400">
              No active sharing permissions granted yet. Use the form above to authorize a clinician.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
