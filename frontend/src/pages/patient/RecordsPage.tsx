import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  FilePlus,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Plus,
  Eye,
  Cpu,
  Loader2
} from 'lucide-react';
import { api } from '../../services/api';
import { MedicalDocument } from '../../types';
import { DocumentViewerModal } from '../../components/DocumentViewerModal';

export const RecordsPage: React.FC = () => {
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedType, setSelectedType] = useState('prescription');
  const [dragActive, setDragActive] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // AI & Viewer Modals
  const [aiConfigured, setAiConfigured] = useState(false);
  const [viewerDoc, setViewerDoc] = useState<MedicalDocument | null>(null);
  const [reprocessingId, setReprocessingId] = useState<number | null>(null);

  // Manual Entry Modal
  const [manualDoc, setManualDoc] = useState<MedicalDocument | null>(null);
  const [manualMedName, setManualMedName] = useState('');
  const [manualMedDose, setManualMedDose] = useState('');
  const [manualCondName, setManualCondName] = useState('');
  const [manualLabName, setManualLabName] = useState('');
  const [manualLabVal, setManualLabVal] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    try {
      const data = await api.getDocuments();
      setDocuments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAIStatus = async () => {
    try {
      const status = await api.getAIStatus();
      setAiConfigured(status.ai_configured);
    } catch (err) {
      console.error('Failed to fetch AI status:', err);
    }
  };

  useEffect(() => {
    fetchDocs();
    fetchAIStatus();
  }, []);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File exceeds maximum allowed limit of 10 MB.' });
      return;
    }

    setUploading(true);
    setUploadProgress(25);
    setMessage(null);

    try {
      setUploadProgress(60);
      const newDoc = await api.uploadDocument(file, selectedType);
      setUploadProgress(100);

      if (newDoc.processing_status === 'duplicate') {
        setMessage({
          type: 'warning',
          text: `Exact duplicate file detected (SHA-256 match). Record registered with duplicate status.`,
        });
      } else if (newDoc.processing_status === 'pending') {
        setMessage({
          type: 'warning',
          text: `"${file.name}" uploaded and safely stored in private storage. Note: Automated AI extraction is pending system setup by the hospital administrator. You can view the document or enter structured facts manually anytime.`,
        });
      } else {
        setMessage({
          type: 'success',
          text: `Successfully processed "${file.name}" via Gemini AI. Structured clinical facts indexed.`,
        });
      }
      await fetchDocs();
      await fetchAIStatus();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to upload document.' });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReprocess = async (docId: number) => {
    setReprocessingId(docId);
    setMessage(null);
    try {
      const updated = await api.reprocessDocument(docId);
      setMessage({
        type: 'success',
        text: `Successfully analyzed "${updated.uploaded_filename}" via Gemini Multimodal AI. Extracted structured clinical facts.`,
      });
      await fetchDocs();
      if (viewerDoc && viewerDoc.id === docId) {
        setViewerDoc(updated);
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || (!aiConfigured ? 'AI analysis is pending administrative configuration. Please contact your hospital administrator.' : 'Analysis failed. Please try again.'),
      });
    } finally {
      setReprocessingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this medical record?')) return;
    try {
      await api.deleteDocument(id);
      setMessage({ type: 'success', text: 'Document deleted successfully.' });
      await fetchDocs();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete document.' });
    }
  };

  const handleSaveManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDoc) return;

    try {
      const payload = {
        document_type: manualDoc.document_type,
        document_date: manualDate,
        event_date: manualDate,
        medications: manualMedName ? [{ name: manualMedName, dosage: manualMedDose, instructions: `Take ${manualMedDose} orally.` }] : [],
        conditions: manualCondName ? [{ name: manualCondName, status: 'active' }] : [],
        lab_tests: manualLabName && manualLabVal ? [{ name: manualLabName, value: parseFloat(manualLabVal), unit: 'standard' }] : [],
        allergies: [],
        notes: 'Manual clinical record confirmation.'
      };

      await api.saveManualEntry(manualDoc.id, payload);
      setMessage({ type: 'success', text: 'Manual structured record saved successfully.' });
      setManualDoc(null);
      await fetchDocs();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save manual structured entry.' });
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Medical Records & Document Ingestion
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Upload PDF prescriptions, laboratory panels, and discharge summaries. Documents are stored in private encrypted storage and indexed using Gemini AI.
        </p>
      </div>

      {/* AI & Storage Status Banner */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
          aiConfigured
            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200'
            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
        }`}
      >
        <div className="flex items-start sm:items-center space-x-3">
          <div
            className={`p-2 rounded-xl shrink-0 ${
              aiConfigured
                ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                : 'bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
            }`}
          >
            {aiConfigured ? <Cpu className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold">
                {aiConfigured ? 'Gemini Multimodal AI Active' : 'Secure Medical Storage Active'}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  aiConfigured
                    ? 'bg-emerald-200/70 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-100'
                    : 'bg-teal-100 dark:bg-teal-800/60 text-teal-800 dark:text-teal-200'
                }`}
              >
                {aiConfigured ? 'Multimodal Vision Ready' : 'AI Pending Admin Setup'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
              {aiConfigured
                ? 'Multimodal AI vision reads doctor handwriting, dosages, prescriptions, and laboratory panels directly from uploaded photos and PDFs.'
                : 'All uploaded prescriptions and records are encrypted and preserved. Automatic AI clinical extraction will index records once administrative setup is completed.'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700 shrink-0 self-start sm:self-auto">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>Private Encrypted Storage</span>
        </div>
      </div>

      {/* Status Alert Notification */}
      {message && (
        <div
          className={`p-4 rounded-xl border flex items-start space-x-3 text-xs font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : message.type === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          ) : message.type === 'warning' ? (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          )}
          <span className="flex-1">{message.text}</span>
        </div>
      )}

      {/* Upload Drag & Drop Area */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Upload New Medical Record</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Supported formats: PDF, PNG, JPG, JPEG (Max 10 MB)</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-500">Document Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs font-medium px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="prescription">Prescription</option>
              <option value="laboratory_report">Laboratory Report</option>
              <option value="discharge_summary">Discharge Summary</option>
              <option value="other">Other Medical Record</option>
            </select>
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFileSelect(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/20'
              : 'border-slate-300 dark:border-slate-700 hover:border-teal-400 bg-slate-50/50 dark:bg-slate-800/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />

          <div className="mx-auto w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3">
            <Upload className="w-6 h-6" />
          </div>

          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {uploading ? 'Processing document...' : 'Click to select or drag and drop your medical record'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Exact SHA-256 duplicate checking, secure encrypted private storage, and AI fact indexing
          </p>

          {uploading && (
            <div className="mt-4 max-w-xs mx-auto">
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-teal-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-teal-600 dark:text-teal-400 mt-1 font-medium">
                Parsing clinical fields via Gemini pipeline...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Uploaded Documents Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Uploaded Records Repository</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total records: {documents.length}</p>
          </div>
          <button
            onClick={fetchDocs}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh repository"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="pb-3 font-semibold">Document Name</th>
                <th className="pb-3 font-semibold">Classification</th>
                <th className="pb-3 font-semibold">Document Date</th>
                <th className="pb-3 font-semibold">Processing Status</th>
                <th className="pb-3 font-semibold">File Size</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {documents.map((doc) => {
                const isImg = doc.mime_type.startsWith('image/') || /\.(jpg|jpeg|png)$/i.test(doc.uploaded_filename);
                return (
                  <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 font-medium text-slate-900 dark:text-white flex items-center space-x-2.5">
                      {isImg ? (
                        <button
                          type="button"
                          onClick={() => setViewerDoc(doc)}
                          className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 hover:ring-2 hover:ring-teal-500 transition-all cursor-pointer"
                          title="Click to preview image"
                        >
                          <img
                            src={api.getDocumentViewUrl(doc.id)}
                            alt={doc.uploaded_filename}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to icon if thumbnail render fails
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </button>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                      )}
                      <button
                        onClick={() => setViewerDoc(doc)}
                        className="truncate max-w-[200px] text-left hover:text-teal-600 dark:hover:text-teal-400 font-semibold cursor-pointer"
                        title="Click to inspect original file and extracted facts"
                      >
                        {doc.uploaded_filename}
                      </button>
                    </td>
                    <td className="py-3 capitalize text-slate-600 dark:text-slate-300">
                      {doc.document_type.replace('_', ' ')}
                    </td>
                    <td className="py-3 text-slate-500 dark:text-slate-400">
                      {doc.document_date || 'Unrecorded'}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize border inline-flex items-center space-x-1 ${
                          doc.processing_status === 'completed'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : doc.processing_status === 'pending'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : doc.processing_status === 'duplicate'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        <span>
                          {doc.processing_status === 'pending'
                            ? 'Pending AI Extraction'
                            : doc.processing_status === 'completed'
                            ? `Completed (${doc.facts_count ?? 0} facts)`
                            : doc.processing_status}
                        </span>
                      </span>
                    </td>
                    <td className="py-3 text-slate-500 dark:text-slate-400">
                      {(doc.size_bytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 text-right space-x-1 sm:space-x-1.5">
                      <button
                        onClick={() => setViewerDoc(doc)}
                        className="p-1.5 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors inline-block"
                        title="View document image & extracted facts"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleReprocess(doc.id)}
                        disabled={reprocessingId === doc.id}
                        className="p-1.5 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors inline-block disabled:opacity-50"
                        title="Analyze with Gemini Multimodal AI"
                      >
                        {reprocessingId === doc.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                        ) : (
                          <Cpu className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setManualDoc(doc)}
                        className="p-1.5 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors inline-block"
                        title="Manual structured entry / correction"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <a
                        href={api.getDocumentFileUrl(doc.id)}
                        className="p-1.5 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors inline-block"
                        title="Download original file"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors inline-block"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {documents.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    No documents uploaded yet. Drag and drop your first medical record above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Inspector & Viewer Modal */}
      <DocumentViewerModal
        document={viewerDoc}
        isOpen={Boolean(viewerDoc)}
        onClose={() => setViewerDoc(null)}
        onReprocess={handleReprocess}
        onOpenManualEntry={(d) => {
          setViewerDoc(null);
          setManualDoc(d);
        }}
        aiConfigured={aiConfigured}
      />

      {/* Manual Structured Entry Modal */}
      {manualDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Manual Structured Clinical Entry
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Enter or adjust structured facts for "{manualDoc.uploaded_filename}"
            </p>

            <form onSubmit={handleSaveManualEntry} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Event / Record Date</label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Prescription Medication (if applicable)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Metformin"
                    value={manualMedName}
                    onChange={(e) => setManualMedName(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Dosage e.g. 500mg BID"
                    value={manualMedDose}
                    onChange={(e) => setManualMedDose(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Diagnosed Condition (if applicable)</label>
                <input
                  type="text"
                  placeholder="e.g. Type 2 Diabetes Mellitus"
                  value={manualCondName}
                  onChange={(e) => setManualCondName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Laboratory Measurement (if applicable)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="e.g. HbA1c"
                    value={manualLabName}
                    onChange={(e) => setManualLabName(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Value e.g. 7.8"
                    value={manualLabVal}
                    onChange={(e) => setManualLabVal(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setManualDoc(null)}
                  className="px-3 py-1.5 font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
                >
                  Save Facts
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
