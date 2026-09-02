'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import CrimeGraphLogo from '@/components/CrimeGraphLogo';
import CrimeGraphLoader from '@/components/CrimeGraphLoader';

interface CaseItem {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
}

interface UploadedDocumentRecord {
  id: string;
  caseId: string;
  originalFilename: string;
  fileType: string;
  dataCategory: string;
  fileSize: string;
  sha256Hash: string;
  uploadedAt: string;
  processingStatus: string;
  validationStatus?: string;
  extractionMethod?: string;
  fallbackReason?: string;
  case?: { id: string; caseNumber: string; title: string };
  uploadedBy?: { fullName: string; email: string };
  _count?: { entities?: number; relations?: number };
}

export default function DataCenterPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [dataClassification, setDataClassification] = useState('CDR');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  const [loadingCases, setLoadingCases] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<'IDLE' | 'SELECTED' | 'UPLOADING' | 'UPLOADED' | 'INGESTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'>('IDLE');
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failedStage, setFailedStage] = useState<string | null>(null);

  // Successful Upload Telemetry State
  const [uploadSuccessPayload, setUploadSuccessPayload] = useState<{
    jobId?: string;
    documents: UploadedDocumentRecord[];
    targetCase?: CaseItem;
  } | null>(null);

  // Persistent Recently Uploaded list from DB
  const [recentDocuments, setRecentDocuments] = useState<UploadedDocumentRecord[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchCases() {
      try {
        const res = await fetch('/api/cases');
        if (res.ok) {
          const data = await res.json();
          const list = data.cases || [];
          setCases(list);
          if (list.length > 0) {
            setSelectedCaseId(list[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load cases in DataCenter:', err);
      } finally {
        setLoadingCases(false);
      }
    }
    fetchCases();
  }, []);

  const fetchRecentDocuments = async () => {
    setLoadingRecent(true);
    try {
      const res = await fetch('/api/documents?limit=10');
      if (res.ok) {
        const data = await res.json();
        setRecentDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to fetch recent documents:', err);
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    fetchRecentDocuments();
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      setSelectedFiles((prev) => [...prev, ...files]);
      setUploadStage('SELECTED');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...files]);
      setUploadStage('SELECTED');
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0) setUploadStage('IDLE');
      return updated;
    });
  };

  const handleStartIngestion = async () => {
    setErrorMessage(null);
    setFailedStage(null);
    setUploadSuccessPayload(null);

    if (!selectedCaseId) {
      setErrorMessage('A Target Case is strictly required for dataset ingestion.');
      setFailedStage('TARGET_CASE_VALIDATION');
      setUploadStage('FAILED');
      return;
    }

    if (selectedFiles.length === 0) {
      setErrorMessage('Please select at least one evidence dataset file to ingest.');
      setFailedStage('FILE_SELECTION');
      setUploadStage('FAILED');
      return;
    }

    setUploading(true);
    setUploadStage('UPLOADING');

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append('files', file));
      formData.append('dataCategory', dataClassification);

      setUploadStage('UPLOADED');

      const res = await fetch(`/api/cases/${selectedCaseId}/data/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Ingestion pipeline rejected the uploaded files.');
        setFailedStage('INGESTION');
        setUploadStage('FAILED');
        setUploading(false);
        return;
      }

      setUploadStage('INGESTED');
      setUploadStage('PROCESSING');

      const targetCaseObj = cases.find((c) => c.id === selectedCaseId);

      setUploadSuccessPayload({
        jobId: data.jobId,
        documents: data.documents || [],
        targetCase: targetCaseObj,
      });

      setUploadStage('COMPLETED');
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';

      fetchRecentDocuments();
    } catch (err) {
      setErrorMessage('Network error occurred while connecting to ingestion service.');
      setFailedStage('NETWORK_TRANSMISSION');
      setUploadStage('FAILED');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytesStr: string | number) => {
    const num = typeof bytesStr === 'string' ? parseInt(bytesStr, 10) : bytesStr;
    if (isNaN(num) || num === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(num) / Math.log(k));
    return parseFloat((num / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">Data Center</h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
          Ingest raw cyber crime datasets — CDRs, bank transaction ledgers, incident reports — for AI extraction and automatic case linking.
        </p>
      </div>

      {/* MULTI-STAGE PIPELINE STEPPER VISUALIZATION */}
      <div className="card p-4 bg-white border border-[var(--border)]">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 touch-scroll">
          {[
            { step: '1', title: 'File Selected', stageKey: 'SELECTED' },
            { step: '2', title: 'Uploading', stageKey: 'UPLOADING' },
            { step: '3', title: 'Uploaded', stageKey: 'UPLOADED' },
            { step: '4', title: 'Ingested', stageKey: 'INGESTED' },
            { step: '5', title: 'Processing', stageKey: 'PROCESSING' },
            { step: '6', title: 'Completed / Failed', stageKey: uploadStage === 'FAILED' ? 'FAILED' : 'COMPLETED' },
          ].map((st, idx) => {
            const isCurrent = uploadStage === st.stageKey;
            const isCompleted = ['COMPLETED', 'INGESTED', 'PROCESSING'].includes(uploadStage) && st.stageKey !== 'FAILED';
            const isError = uploadStage === 'FAILED' && st.stageKey === 'FAILED';

            return (
              <React.Fragment key={st.step}>
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-colors ${
                    isError ? 'bg-red-600 text-white' :
                    isCurrent ? 'bg-black text-white shadow-xs animate-pulse' :
                    isCompleted ? 'bg-emerald-600 text-white' :
                    'bg-zinc-100 text-zinc-400 border border-zinc-200'
                  }`}>
                    {isError ? '✕' : isCompleted ? '✓' : st.step}
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${
                    isError ? 'text-red-700 font-semibold' :
                    isCurrent ? 'text-black font-semibold' :
                    'text-zinc-500'
                  }`}>
                    {st.title}
                  </span>
                </div>
                {idx < 5 && <div className="h-px w-6 sm:w-12 bg-zinc-200 shrink-0 hidden xs:block" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ERROR / FAILED TELEMETRY PANEL */}
      {uploadStage === 'FAILED' && errorMessage && (
        <div className="card p-5 border-red-300 bg-red-50/40 space-y-3 relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 border border-red-300 text-red-700 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-red-900">Pipeline Execution Failed</h3>
                <p className="text-xs text-red-700 mt-0.5 font-mono">
                  Failed Stage: <span className="font-bold">{failedStage || 'INGESTION'}</span>
                </p>
              </div>
            </div>
            <button onClick={() => setUploadStage('IDLE')} className="text-xs text-red-400 hover:text-red-800 p-1">✕</button>
          </div>
          <p className="text-xs text-red-800 bg-white border border-red-200 p-2.5 rounded font-mono leading-relaxed">
            {errorMessage}
          </p>
          <div className="pt-1 flex justify-end">
            <button
              onClick={handleStartIngestion}
              className="btn-primary bg-red-700 hover:bg-red-800 text-xs px-3.5 py-1.5"
            >
              🔄 Retry Extraction
            </button>
          </div>
        </div>
      )}

      {/* SUCCESS TELEMETRY PANEL */}
      {uploadSuccessPayload && (
        <div className="card p-6 border-emerald-300 bg-emerald-50/30 space-y-4 relative overflow-hidden">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">Dataset Upload & Ingestion Successful</h3>
                <p className="text-xs text-zinc-600 mt-0.5">
                  {uploadSuccessPayload.documents.length} file(s) persisted to storage and linked to case <strong className="font-mono text-black">{uploadSuccessPayload.targetCase?.caseNumber}</strong>.
                </p>
              </div>
            </div>
            <button
              onClick={() => setUploadSuccessPayload(null)}
              className="text-xs text-zinc-400 hover:text-black p-1 rounded"
            >
              ✕
            </button>
          </div>

          {/* Document Telemetry Records */}
          <div className="bg-white border border-zinc-200 rounded-md divide-y divide-zinc-100 overflow-hidden">
            {uploadSuccessPayload.documents.map((doc) => (
              <div key={doc.id} className="p-3 text-xs space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex items-center gap-2.5">
                    <span className="badge bg-zinc-100 text-zinc-700 font-mono">{doc.fileType}</span>
                    <span className="font-semibold text-black truncate">{doc.originalFilename}</span>
                    <span className="text-zinc-400 font-mono text-[10px]">({formatFileSize(doc.fileSize)})</span>
                  </div>
                  <span className="badge badge-success font-mono shrink-0">COMPLETED</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-50 font-mono">
                  <span>Engine: <strong className="text-black font-semibold">{doc.extractionMethod || 'RULE_BASED_FALLBACK'}</strong></span>
                  <span>Target Case: <strong className="text-black font-semibold">{uploadSuccessPayload.targetCase?.caseNumber}</strong></span>
                  <div className="flex gap-2">
                    <Link href="/documents" className="text-black font-semibold hover:underline">View Document →</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <Link href="/documents" className="btn-primary text-xs py-1.5 px-3.5">
              View Document
            </Link>
            {uploadSuccessPayload.targetCase && (
              <Link href={`/cases/${uploadSuccessPayload.targetCase.id}`} className="btn-secondary text-xs py-1.5 px-3.5">
                View Case
              </Link>
            )}
            <Link href="/processing" className="btn-secondary text-xs py-1.5 px-3.5">
              View Processing
            </Link>
            <button
              onClick={() => {
                setUploadSuccessPayload(null);
                setUploadStage('IDLE');
              }}
              className="btn-secondary text-xs py-1.5 px-3.5 ml-auto"
            >
              Upload Another
            </button>
          </div>
        </div>
      )}

      {/* Main Upload & Settings Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drag & Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`lg:col-span-2 upload-zone flex flex-col items-center justify-center min-h-[300px] p-8 text-center transition-all ${
            dragActive ? 'drag-active' : ''
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept=".pdf,.csv,.xlsx,.json,.txt"
            className="hidden"
          />

          <div className="w-12 h-12 bg-zinc-100 border border-zinc-200 rounded-lg text-black flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>

          <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Select or drag dataset files</p>
          <p className="text-xs text-[var(--text-secondary)] mb-4 max-w-xs leading-relaxed">
            Upload CDRs, bank logs, or incident reports. Max 50 MB per file.
          </p>

          <div className="flex items-center gap-1.5 mb-5 flex-wrap justify-center">
            {['PDF', 'CSV', 'XLSX', 'JSON', 'TXT'].map((ext) => (
              <span key={ext} className="badge bg-zinc-100 border-zinc-200 text-zinc-700 font-mono text-[10px]">
                {ext}
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary text-xs px-4 py-2"
          >
            Browse Files
          </button>

          {/* Selected files preview */}
          {selectedFiles.length > 0 && (
            <div className="w-full mt-6 text-left border-t border-zinc-100 pt-4 space-y-2">
              <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                Selected Files ({selectedFiles.length})
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 bg-zinc-50 border border-zinc-200 rounded">
                    <div className="truncate pr-2">
                      <span className="font-semibold text-black">{file.name}</span>
                      <span className="text-[10px] text-zinc-400 font-mono ml-2">({formatFileSize(file.size)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-zinc-400 hover:text-red-600 text-xs shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Configuration Panel */}
        <div className="card p-5 space-y-5">
          <div>
            <h2 className="text-xs font-mono text-zinc-400 uppercase tracking-widest mb-1">Target Configuration</h2>
            <p className="text-xs text-zinc-500">Associate evidence dataset with active case file.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1" htmlFor="case-select">
                Target Case <span className="text-red-500">*</span>
              </label>
              {loadingCases ? (
                <div className="text-xs text-zinc-400 animate-pulse">Loading active cases…</div>
              ) : (
                <select
                  id="case-select"
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="form-select text-xs font-medium"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.caseNumber} — {c.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Data Category
              </label>
              <select
                value={dataClassification}
                onChange={(e) => setDataClassification(e.target.value)}
                className="form-select text-xs"
              >
                <option value="CDR">Call Detail Records (CDR)</option>
                <option value="BANK_STATEMENTS">Bank Account Transactions</option>
                <option value="FIR_REPORTS">FIR & Incident Reports</option>
                <option value="FORENSIC_EXPORTS">Digital Forensics / Device Logs</option>
                <option value="OTHER">Other Intelligence Evidence</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              id="datacenter-start-btn"
              type="button"
              onClick={handleStartIngestion}
              disabled={uploading || selectedFiles.length === 0 || !selectedCaseId}
              className="btn-primary w-full justify-center py-2.5 disabled:opacity-50 text-xs"
            >
              {uploading ? (
                <>
                  <CrimeGraphLogo size={14} showText={false} className="animate-crimegraph-pulse" />
                  <span>Ingesting Dataset…</span>
                </>
              ) : (
                <span>Start Ingestion</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* PERSISTENT RECENTLY UPLOADED SECTION (Database-backed) */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-black">Recently Uploaded Datasets</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Persisted evidence files stored in backend database.</p>
          </div>
          <button
            onClick={fetchRecentDocuments}
            className="btn-secondary text-[11px] py-1 px-2.5"
          >
            Refresh List
          </button>
        </div>

        {loadingRecent ? (
          <div className="p-8 flex justify-center">
            <CrimeGraphLoader size={24} text="Loading recent dataset records from database…" />
          </div>
        ) : recentDocuments.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">No dataset uploads recorded yet.</div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Target Case</th>
                  <th>Extraction Engine</th>
                  <th>Upload Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentDocuments.map((doc) => (
                  <tr key={doc.id}>
                    <td className="font-semibold text-black max-w-[200px] truncate">{doc.originalFilename}</td>
                    <td>
                      <span className="badge bg-zinc-100 text-zinc-800 font-mono">{doc.fileType}</span>
                    </td>
                    <td className="font-mono text-zinc-500 text-[11px]">{formatFileSize(doc.fileSize)}</td>
                    <td className="font-mono text-black font-semibold text-[11px]">
                      {doc.case?.caseNumber || doc.caseId}
                    </td>
                    <td>
                      <span className="badge bg-zinc-100 text-zinc-800 font-mono">
                        {doc.extractionMethod === 'RULE_BASED_FALLBACK' ? 'RULE-BASED FALLBACK' : 'AI'}
                      </span>
                    </td>
                    <td className="text-zinc-400 text-[11px]">
                      {new Date(doc.uploadedAt).toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge ${
                        doc.processingStatus === 'COMPLETED' ? 'badge-success' :
                        doc.processingStatus === 'FAILED' ? 'badge-critical' : 'badge-medium'
                      }`}>
                        {doc.processingStatus}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Link href="/documents" className="text-xs font-semibold text-black hover:underline">
                          View
                        </Link>
                        <span className="text-zinc-300">|</span>
                        <Link href="/processing" className="text-xs text-zinc-500 hover:text-black hover:underline">
                          Processing
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
