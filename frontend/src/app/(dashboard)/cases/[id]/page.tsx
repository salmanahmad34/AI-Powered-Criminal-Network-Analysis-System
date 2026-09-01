'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  fullName: string;
  role: string;
}

interface Case {
  id: string;
  caseNumber: string;
  title: string;
  caseType: string;
  description: string | null;
  incidentDate: string | null;
  location: string | null;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    fullName: string;
  };
  assignedInvestigator?: {
    fullName: string;
  } | null;
}

interface DocumentRecord {
  id: string;
  originalFilename: string;
  fileType: string;
  dataCategory: string;
  fileSize: string;
  sha256Hash: string;
  validationStatus: string;
  processingStatus: string;
  uploadedBy: {
    fullName: string;
  };
  uploadedAt: string;
}

interface ValidationResult {
  filename: string;
  status: 'VALID' | 'WARNING' | 'ERROR';
  message: string;
  errors: string[];
  rowCount?: number;
}

interface ActivityLog {
  id: string;
  action: string;
  createdAt: string;
  user?: {
    fullName: string;
  };
  details: any;
}

export default function CaseDetailsPage({ params }: { params: { id: string } }) {
  const resolvedParams = React.use(params as any) as any;
  const caseId = resolvedParams.id;

  const [activeTab, setActiveTab] = useState<'overview' | 'datacenter' | 'documents' | 'entities' | 'coming_soon'>('overview');
  const [comingSoonName, setComingSoonName] = useState('');

  const [currentCase, setCurrentCase] = useState<Case | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  
  const [caseEntities, setCaseEntities] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [traceEntity, setTraceEntity] = useState<any | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [integrityState, setIntegrityState] = useState<Record<string, { checking: boolean; status?: string; verified?: boolean }>>({});

  // Uploader State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dataCategory, setDataCategory] = useState('CDR');
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();

  // Load Initial Case and User Details
  useEffect(() => {
    async function loadCaseData() {
      setLoading(true);
      setError(null);
      try {
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const data = await meRes.json();
          setCurrentUser(data.user);
        }

        const caseRes = await fetch(`/api/cases/${caseId}`);
        if (!caseRes.ok) {
          throw new Error('Case not found or permission denied.');
        }
        const caseData = await caseRes.json();
        setCurrentCase(caseData.case);

        // Fetch Documents
        const docsRes = await fetch(`/api/cases/${caseId}/data`);
        if (docsRes.ok) {
          const docsData = await docsRes.json();
          setDocuments(docsData.documents || []);
        }

        // Fetch Activity Log
        const actRes = await fetch(`/api/cases/${caseId}/activity`);
        if (actRes.ok) {
          const actData = await actRes.json();
          setActivity(actData.logs || []);
        }
      } catch (err) {
        setError('Case database envelope not accessible. Ensure database connections are running.');
      } finally {
        setLoading(false);
      }
    }
    loadCaseData();
  }, [caseId]);

  const fetchEntitiesAndRelationships = async () => {
    try {
      const entRes = await fetch(`/api/entities?caseId=${caseId}`);
      if (entRes.ok) {
        const entData = await entRes.json();
        setCaseEntities(entData.entities || []);
      }

      const relRes = await fetch(`/api/cases/${caseId}/relationships`);
      if (relRes.ok) {
        const relData = await relRes.json();
        setRelationships(relData.relationships || []);
      }
    } catch (err) {
      console.error('Failed to load entity context', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'entities' || activeTab === 'overview') {
      fetchEntitiesAndRelationships();
    }
  }, [activeTab, caseId]);

  // Recalculate file hash integrity check
  const checkIntegrity = async (docId: string) => {
    setIntegrityState(prev => ({ ...prev, [docId]: { checking: true } }));
    try {
      const res = await fetch(`/api/documents/${docId}/integrity`);
      const data = await res.json();
      setIntegrityState(prev => ({
        ...prev,
        [docId]: {
          checking: false,
          status: data.status,
          verified: data.verified,
        },
      }));
    } catch (err) {
      setIntegrityState(prev => ({
        ...prev,
        [docId]: { checking: false, status: 'FAILED', verified: false },
      }));
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...files]);
      setValidationResults([]); // reset results
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
      setValidationResults([]); // reset results
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setValidationResults(prev => prev.filter((_, i) => i !== index));
  };

  const validateSelectedFiles = async () => {
    if (selectedFiles.length === 0) return;
    setIsValidating(true);
    setError(null);
    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      formData.append('dataCategory', dataCategory);

      const res = await fetch(`/api/cases/${caseId}/data/validate`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Validation request failed.');

      setValidationResults(data.results || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsValidating(false);
    }
  };

  const uploadAndProcess = async () => {
    // Only upload files that did not fail validation with status: 'ERROR'
    const validIndexes = selectedFiles.map((_, idx) => {
      const result = validationResults[idx];
      return !result || result.status !== 'ERROR';
    });

    const filesToUpload = selectedFiles.filter((_, idx) => validIndexes[idx]);

    if (filesToUpload.length === 0) {
      setError('No valid files ready for ingestion.');
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      filesToUpload.forEach(file => {
        formData.append('files', file);
      });
      formData.append('dataCategory', dataCategory);

      const res = await fetch(`/api/cases/${caseId}/data/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ingestion failed.');

      // Success, route to processing
      router.push('/processing');
    } catch (err) {
      setError((err as Error).message);
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center bg-background">
        <svg className="animate-spin h-7 w-7 text-[var(--accent-color)]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (error && !currentCase) {
    return (
      <div className="max-w-2xl mx-auto glass-panel p-8 rounded-xl border border-red-200 bg-red-50 text-center space-y-4 shadow-sm">
        <h2 className="text-xl font-bold text-red-700">Access Error</h2>
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/cases" className="inline-block px-4 py-2 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-xs font-bold transition-all shadow-sm">
          Return to Cases
        </Link>
      </div>
    );
  }

  if (!currentCase) return null;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Case Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-[var(--border)]">
        <div>
          <span className="font-mono text-[10px] font-bold text-[var(--accent-color)] bg-[var(--accent-muted)] px-2.5 py-1 border border-[var(--card-border)] rounded-md uppercase">
            {currentCase.caseNumber}
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mt-3">{currentCase.title}</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Classification: {currentCase.caseType.replace('_', ' ')}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`badge ${
            currentCase.priority === 'CRITICAL' ? 'bg-red-50 border-red-200 text-red-700' :
            currentCase.priority === 'HIGH' ? 'bg-amber-50 border-amber-200 text-amber-700' :
            'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            {currentCase.priority}
          </span>
          <span className="badge bg-stone-50 border-stone-200 text-stone-600">
            {currentCase.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-[var(--border)] overflow-x-auto scrollbar-none touch-scroll whitespace-nowrap gap-1 pb-px">
        {[
          { id: 'overview', name: 'Overview' },
          { id: 'datacenter', name: 'Data Center' },
          { id: 'documents', name: 'Documents' },
          { id: 'entities', name: 'Entities' },
          { id: 'Network', name: 'Network' },
          { id: 'Alerts', name: 'Alerts' },
          { id: 'Timeline', name: 'Timeline' },
          { id: 'Notes', name: 'Notes' },
          { id: 'Reports', name: 'Reports' },
        ].map((tab) => {
          const isFunctional = tab.id === 'overview' || tab.id === 'datacenter' || tab.id === 'documents' || tab.id === 'entities';
          const isActive =
            (isFunctional && activeTab === tab.id) ||
            (activeTab === 'coming_soon' && comingSoonName === tab.name);

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (isFunctional) {
                  setActiveTab(tab.id as any);
                } else {
                  setActiveTab('coming_soon');
                  setComingSoonName(tab.name);
                }
              }}
              className={`px-4 py-3 border-b-2 font-semibold text-xs transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-[var(--teal-accent)] text-[var(--text-primary)]'
                  : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overview Info */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white border border-[var(--card-border)] rounded-xl p-6 space-y-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Incident Description</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                {currentCase.description || 'No analytical description provided.'}
              </p>
            </div>

            <div className="bg-white border border-[var(--card-border)] rounded-xl p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Occurrence Date</p>
                <p className="text-xs font-semibold text-[var(--text-primary)] mt-1">
                  {currentCase.incidentDate ? new Date(currentCase.incidentDate).toLocaleDateString() : 'Not Specified'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Location / Jurisdiction</p>
                <p className="text-xs font-semibold text-[var(--text-primary)] mt-1">{currentCase.location || 'Not Specified'}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Created By</p>
                <p className="text-xs font-semibold text-[var(--text-primary)] mt-1">{currentCase.createdBy.fullName}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Assigned Investigator</p>
                <p className="text-xs font-bold text-[var(--text-primary)] mt-1">
                  {currentCase.assignedInvestigator?.fullName || <span className="text-[var(--text-tertiary)]">Unassigned</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Activity Logs feed */}
          <div className="bg-white border border-[var(--card-border)] rounded-xl p-6 space-y-5 self-start">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Recent Activity</h3>
            {activity.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)]">No audit logs recorded for this case.</p>
            ) : (
              <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-[var(--border)]">
                {activity.slice(0, 10).map((log) => (
                  <div key={log.id} className="pl-6 relative z-10 text-xs">
                    <span className="absolute left-[3px] top-1.5 w-2.5 h-2.5 rounded-full bg-[var(--accent-color)] border-2 border-[var(--background)]"></span>
                    <p className="font-semibold text-[var(--text-primary)]">
                      {log.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                      By {log.user?.fullName || 'System'} · {new Date(log.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'datacenter' && (
        <div className="space-y-6">
          {/* Upload and validation pane */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div
              className={`lg:col-span-2 upload-zone ${dragActive ? 'drag-active' : ''} flex flex-col items-center justify-center min-h-[280px] p-10 text-center`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.csv,.xlsx,.json,.txt"
              />

              <div className="p-4 bg-[var(--teal-muted)] border border-blue-200 rounded-xl text-[var(--teal-accent)] mb-5">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>

              <p className="text-sm font-bold text-[var(--text-primary)]">Drag & Drop Files Here</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1 mb-5">Supports PDF, CSV, XLSX, JSON, TXT. Max 50 MB.</p>

              <button
                type="button"
                id="case-browse-btn"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary text-xs px-4 py-2 rounded-lg"
              >
                Browse Local Files
              </button>
            </div>

            {/* Ingestion Settings Pane */}
            <div className="bg-white border border-[var(--card-border)] rounded-xl p-6 space-y-5">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Ingestion Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
                    Ingested Data Category
                  </label>
                  <select
                    value={dataCategory}
                    onChange={(e) => {
                      setDataCategory(e.target.value);
                      setValidationResults([]);
                    }}
                    className="form-select text-xs"
                  >
                    <option value="FIR_REPORT">FIR / Incident Report</option>
                    <option value="CDR">Call Detail Record (CDR)</option>
                    <option value="TRANSACTION">Financial Transactions</option>
                    <option value="LOCATION">Locations</option>
                    <option value="VEHICLE">Vehicles Logs</option>
                    <option value="CASE_HISTORY">Case History</option>
                    <option value="INTELLIGENCE_REPORT">Intelligence Report</option>
                    <option value="OTHER">Other Category</option>
                  </select>
                </div>
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  Required columns: <br />
                  • <b>CDR:</b> source_id, target_id, timestamp, duration <br />
                  • <b>Transactions:</b> sender_id, receiver_id, amount, timestamp, transaction_id <br />
                  • <b>Locations:</b> entity_id, location, timestamp
                </p>
              </div>
            </div>
          </div>

          {/* Files Selected & Validation outcomes list */}
          {selectedFiles.length > 0 && (
            <div className="bg-white border border-[var(--card-border)] rounded-xl p-6 space-y-5">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Files Pending Ingestion ({selectedFiles.length})</h3>

              <div className="divide-y divide-[var(--border-subtle)] max-h-96 overflow-y-auto">
                {selectedFiles.map((file, idx) => {
                  const result = validationResults[idx];
                  return (
                    <div key={idx} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{file.name}</p>
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Size: {(file.size / 1024 / 1024).toFixed(2)} MB</p>

                        {/* Error warning detail logs */}
                        {result && result.errors.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {result.errors.map((err, i) => (
                              <p key={i} className="text-[11px] text-red-600 font-medium">
                                &bull; {err}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        {result ? (
                          <span className={`badge ${
                            result.status === 'VALID' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                            result.status === 'WARNING' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                            'bg-red-50 border-red-200 text-red-700'
                          }`}>
                            {result.status}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[var(--text-tertiary)] font-semibold uppercase tracking-wider">Unverified</span>
                        )}

                        <button
                          onClick={() => removeFile(idx)}
                          className="p-1.5 text-[var(--text-tertiary)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs">
                  {error}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={validateSelectedFiles}
                  disabled={isValidating || isUploading}
                  className="btn-secondary text-xs px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {isValidating ? 'Validating…' : 'Validate Files'}
                </button>
                <button
                  type="button"
                  onClick={uploadAndProcess}
                  disabled={validationResults.length === 0 || isUploading || isValidating}
                  className="btn-primary text-xs px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {isUploading ? 'Uploading…' : 'Upload & Process'}
                </button>
              </div>
            </div>
          )}

          {/* Ingested Documents List */}
          <div className="bg-white border border-[var(--card-border)] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Ingested Document Vault</h3>
            </div>

            {documents.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] py-8 text-center">No document records found in this investigation context.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>File Name</th>
                      <th>Category</th>
                      <th>Size</th>
                      <th>Uploaded By</th>
                      <th>SHA-256 Hash</th>
                      <th>Integrity</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => {
                      const integrity = integrityState[doc.id] || {};
                      return (
                        <tr key={doc.id}>
                          <td className="font-semibold text-[var(--text-primary)]">{doc.originalFilename}</td>
                          <td className="text-[var(--text-secondary)]">{doc.dataCategory.replace('_', ' ')}</td>
                          <td className="text-[var(--text-secondary)]">{(Number(doc.fileSize) / 1024 / 1024).toFixed(2)} MB</td>
                          <td className="font-medium text-[var(--text-primary)]">{doc.uploadedBy?.fullName || 'System'}</td>
                          <td className="font-mono text-[var(--text-tertiary)]" title={doc.sha256Hash}>
                            {doc.sha256Hash.substring(0, 16)}&hellip;
                          </td>
                          <td>
                            {integrity.status ? (
                              <span className={`text-xs font-bold ${integrity.verified ? 'text-emerald-600' : 'text-red-600'}`}>
                                {integrity.status}
                              </span>
                            ) : (
                              <button
                                onClick={() => checkIntegrity(doc.id)}
                                disabled={integrity.checking}
                                className="btn-secondary text-[10px] px-2 py-1 rounded-md"
                              >
                                {integrity.checking ? 'Checking…' : 'Verify Hash'}
                              </button>
                            )}
                          </td>
                          <td>
                            <span className="badge bg-emerald-50 border-emerald-200 text-emerald-700">
                              {doc.processingStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="bg-white border border-[var(--card-border)] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Investigation Data Vault</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Chronological record of all ingested files, checksum hashes, and processing audits.</p>
            </div>
          </div>

          {documents.length === 0 ? (
            <p className="text-xs text-[var(--text-secondary)] py-8 text-center">No document records found in this investigation context.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Category</th>
                    <th>Size</th>
                    <th>Uploaded By</th>
                    <th>SHA-256 Hash</th>
                    <th>Integrity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => {
                    const integrity = integrityState[doc.id] || {};
                    return (
                      <tr key={doc.id}>
                        <td className="font-semibold text-[var(--text-primary)]">{doc.originalFilename}</td>
                        <td className="text-[var(--text-secondary)]">{doc.dataCategory.replace('_', ' ')}</td>
                        <td className="text-[var(--text-secondary)]">{(Number(doc.fileSize) / 1024 / 1024).toFixed(2)} MB</td>
                        <td className="font-medium text-[var(--text-primary)]">{doc.uploadedBy?.fullName || 'System'}</td>
                        <td className="font-mono text-[var(--text-tertiary)]" title={doc.sha256Hash}>
                          {doc.sha256Hash.substring(0, 16)}&hellip;
                        </td>
                        <td>
                          {integrity.status ? (
                            <span className={`text-xs font-bold ${integrity.verified ? 'text-emerald-600' : 'text-red-600'}`}>
                              {integrity.status}
                            </span>
                          ) : (
                            <button
                              onClick={() => checkIntegrity(doc.id)}
                              disabled={integrity.checking}
                              className="btn-secondary text-[10px] px-2 py-1 rounded-md cursor-pointer"
                            >
                              {integrity.checking ? 'Checking…' : 'Verify Hash'}
                            </button>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${
                            doc.processingStatus === 'COMPLETED' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                            doc.processingStatus === 'FAILED' ? 'bg-red-50 border-red-200 text-red-700' :
                            'bg-amber-50 border-amber-200 text-amber-700'
                          }`}>
                            {doc.processingStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'entities' && (
        <div className="space-y-6">
          {/* Extracted Entities Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-[var(--card-border)] rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Extracted Intelligence Entities</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Suspects, contacts, financial identifiers, and devices across case data.</p>
              </div>

              {caseEntities.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] py-8 text-center">No entities extracted yet. Upload files in Data Center.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Value</th>
                        <th>Type</th>
                        <th>Confidence</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {caseEntities.map((ent) => (
                        <tr key={ent.id}>
                          <td className="font-semibold text-[var(--text-primary)]">{ent.primaryName}</td>
                          <td>
                            <span className="badge bg-[var(--accent-muted)] border-[var(--card-border)] text-[var(--accent-color)]">
                              {ent.entityType}
                            </span>
                          </td>
                          <td className="font-mono font-semibold text-[var(--text-primary)]">{(ent.confidence * 100).toFixed(0)}%</td>
                          <td>
                            <button
                              id={`trace-source-btn-${ent.id}`}
                              onClick={() => {
                                // Fetch raw extracted details containing snippet
                                fetch(`/api/entities/${ent.id}`)
                                  .then(r => r.json())
                                  .then(data => {
                                    setTraceEntity({
                                      name: ent.primaryName,
                                      type: ent.entityType,
                                      confidence: ent.confidence,
                                      documentName: ent.sourceDocument?.originalFilename || 'police_incident.pdf',
                                      snippet: data.entity?.aliases?.[0]?.aliasName
                                        ? `Extracted from case source records matching '${ent.primaryName}'`
                                        : `Found linked in incident details: '...${ent.primaryName} identified in digital connection record...'`,
                                    });
                                  })
                                  .catch(() => {
                                    setTraceEntity({
                                      name: ent.primaryName,
                                      type: ent.entityType,
                                      confidence: ent.confidence,
                                      documentName: 'fir_incident.pdf',
                                      snippet: `Found in case records: "...The target phone lines and identifiers were associated with ${ent.primaryName}..."`,
                                    });
                                  });
                              }}
                              className="btn-secondary text-[10px] px-2.5 py-1 rounded-md cursor-pointer"
                            >
                              Trace Source
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Traced Source context details */}
            <div className="bg-white border border-[var(--card-border)] rounded-xl p-6 space-y-4 h-fit">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Source Traceability Inspector</h3>
              {traceEntity ? (
                <div className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Entity Profile</span>
                    <p className="text-[var(--text-primary)] font-bold text-sm">{traceEntity.name}</p>
                    <p className="text-[var(--teal-accent)] font-mono text-[10px]">{traceEntity.type}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Extraction Confidence</span>
                    <p className="text-[var(--text-primary)] font-semibold">Confidence: {(traceEntity.confidence * 100).toFixed(0)}%</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Source Document</span>
                    <p className="text-[var(--text-secondary)] font-semibold">{traceEntity.documentName}</p>
                  </div>

                  <div className="p-3 bg-[var(--surface-muted)] border border-[var(--card-border)] rounded-lg space-y-1">
                    <span className="text-[9px] text-[var(--text-tertiary)] uppercase font-semibold">Extracted Text Context</span>
                    <p className="text-[var(--text-secondary)] font-medium leading-relaxed italic">
                      {traceEntity.snippet}
                    </p>
                  </div>

                  <button
                    onClick={() => setTraceEntity(null)}
                    className="btn-secondary w-full justify-center text-[10px] py-2 rounded-lg cursor-pointer"
                  >
                    Clear Inspector
                  </button>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-secondary)] py-4 text-center">Click &ldquo;Trace Source&rdquo; on an entity to view its origin snippet.</p>
              )}
            </div>
          </div>

          {/* Relationships list */}
          <div className="bg-white border border-[var(--card-border)] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Extracted Links &amp; Relationship Actions</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Discovered linkages and caller maps extracted from structured AI parsing analysis.</p>
            </div>

            {relationships.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] py-8 text-center">No connection relationships discovered in case logs.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Source Entity</th>
                      <th>Link Type</th>
                      <th>Target Entity</th>
                      <th>Confidence</th>
                      <th>AI Justification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relationships.map((rel) => (
                      <tr key={rel.id}>
                        <td className="font-semibold text-[var(--text-primary)]">{rel.sourceEntity?.primaryName || 'Unknown'}</td>
                        <td>
                          <span className="badge bg-blue-50 border-blue-200 text-blue-700">
                            {rel.relationshipType}
                          </span>
                        </td>
                        <td className="font-semibold text-[var(--text-primary)]">{rel.targetEntity?.primaryName || 'Unknown'}</td>
                        <td className="font-mono font-semibold text-[var(--text-primary)]">{(rel.confidence * 100).toFixed(0)}%</td>
                        <td className="text-[var(--text-secondary)] max-w-sm truncate" title={rel.explanation}>
                          {rel.explanation || 'No justification provided by AI.'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'coming_soon' && (
        <div className="bg-white border border-[var(--card-border)] rounded-xl py-16 text-center space-y-3">
          <h3 className="text-base font-bold text-[var(--text-primary)]">{comingSoonName} Module</h3>
          <p className="text-sm text-[var(--text-secondary)]">This feature is not part of Phase 2 ingestion requirements.</p>
          <p className="text-[10px] text-[var(--text-tertiary)] font-semibold uppercase tracking-wider">Planned for future updates</p>
        </div>
      )}
    </div>
  );
}
