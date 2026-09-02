'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import CrimeGraphLoader from '@/components/CrimeGraphLoader';

interface DocumentRecord {
  id: string;
  caseId: string;
  originalFilename: string;
  fileType: string;
  dataCategory: string;
  fileSize: string;
  sha256Hash: string;
  uploadedAt: string;
  processingStatus: string;
  validationStatus: string;
  extractionMethod?: string;
  fallbackReason?: string;
  case?: { id: string; caseNumber: string; title: string };
  uploadedBy?: { fullName: string; email: string };
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [integrityStatus, setIntegrityStatus] = useState<any | null>(null);
  const [verifyingIntegrity, setVerifyingIntegrity] = useState(false);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      } else {
        setError('Failed to fetch documents list from database.');
      }
    } catch (err) {
      setError('Network failure loading documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const formatFileSize = (bytesStr: string | number) => {
    const num = typeof bytesStr === 'string' ? parseInt(bytesStr, 10) : bytesStr;
    if (isNaN(num) || num === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(num) / Math.log(k));
    return parseFloat((num / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleVerifyIntegrity = async (docId: string) => {
    setVerifyingIntegrity(true);
    setIntegrityStatus(null);
    try {
      const res = await fetch(`/api/documents/${docId}/integrity`);
      if (res.ok) {
        const data = await res.json();
        setIntegrityStatus(data);
      }
    } catch (err) {
      setIntegrityStatus({ verified: false, reason: 'Network error checking hash.' });
    } finally {
      setVerifyingIntegrity(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">Investigative Documents</h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Persisted evidence files, raw datasets, CSV extracts, and PDF case reports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDocuments}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            Refresh
          </button>
          <Link href="/datacenter" className="btn-primary text-xs px-3 py-1.5">
            + Upload New Dataset
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-lg text-xs">
          {error}
        </div>
      )}

      {/* Main Documents Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <CrimeGraphLoader size={28} text="Fetching investigative document records from database…" />
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-10 h-10 bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-500 flex items-center justify-center mx-auto">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-zinc-800">No documents found</p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              No investigation datasets have been uploaded yet. Upload a dataset in Data Center to begin.
            </p>
            <Link href="/datacenter" className="btn-primary text-xs inline-flex px-4 py-2 mt-2">
              Go to Data Center
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop & Tablet Table View */}
            <div className="hidden sm:block table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Target Case</th>
                    <th>Extraction Engine</th>
                    <th>Uploaded By</th>
                    <th>Timestamp</th>
                    <th>SHA-256 Hash</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
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
                      <td className="text-zinc-600">{doc.uploadedBy?.fullName || 'Investigator'}</td>
                      <td className="text-zinc-400 text-[11px]">
                        {new Date(doc.uploadedAt).toLocaleString()}
                      </td>
                      <td className="font-mono text-zinc-400 text-[10px] truncate max-w-[130px]" title={doc.sha256Hash}>
                        {doc.sha256Hash ? `${doc.sha256Hash.slice(0, 12)}…` : '—'}
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
                          <button
                            onClick={() => {
                              setSelectedDoc(doc);
                              handleVerifyIntegrity(doc.id);
                            }}
                            className="text-xs font-semibold text-black hover:underline"
                          >
                            View
                          </button>
                          <span className="text-zinc-300">|</span>
                          <a
                            href={`/api/documents/${doc.id}/download`}
                            download
                            className="text-xs font-semibold text-zinc-600 hover:text-black hover:underline"
                          >
                            Download
                          </a>
                          {doc.caseId && (
                            <>
                              <span className="text-zinc-300">|</span>
                              <Link
                                href={`/cases/${doc.caseId}`}
                                className="text-xs text-zinc-500 hover:text-black hover:underline"
                              >
                                View Case
                              </Link>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List (< 640px) */}
            <div className="sm:hidden divide-y divide-zinc-100">
              {documents.map((doc) => (
                <div key={doc.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-xs text-black truncate max-w-[200px]">{doc.originalFilename}</h3>
                    <span className="badge bg-zinc-100 text-zinc-800 font-mono shrink-0">{doc.fileType}</span>
                  </div>

                  <div className="text-[11px] text-zinc-600 space-y-1">
                    <p>Case: <strong className="font-mono text-black">{doc.case?.caseNumber || doc.caseId}</strong></p>
                    <p>Size: <span className="font-mono">{formatFileSize(doc.fileSize)}</span></p>
                    <p>Uploaded by: <strong>{doc.uploadedBy?.fullName}</strong></p>
                    <p className="text-[10px] text-zinc-400 font-mono truncate">Hash: {doc.sha256Hash}</p>
                  </div>

                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                    <span className={`badge ${
                      doc.processingStatus === 'COMPLETED' ? 'badge-success' :
                      doc.processingStatus === 'FAILED' ? 'badge-critical' : 'badge-medium'
                    }`}>
                      {doc.processingStatus}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedDoc(doc);
                          handleVerifyIntegrity(doc.id);
                        }}
                        className="btn-secondary text-[11px] py-1 px-2.5"
                      >
                        Details
                      </button>
                      <a
                        href={`/api/documents/${doc.id}/download`}
                        download
                        className="btn-primary text-[11px] py-1 px-2.5"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* DOCUMENT DETAILS & INTEGRITY MODAL */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-xl max-w-lg w-full p-6 space-y-5 shadow-lg relative">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-black">{selectedDoc.originalFilename}</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Document Details & Cryptographic Integrity Verification</p>
              </div>
              <button
                onClick={() => {
                  setSelectedDoc(null);
                  setIntegrityStatus(null);
                }}
                className="text-xs text-zinc-400 hover:text-black p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-500">Document ID</span>
                <span className="font-mono text-black font-medium">{selectedDoc.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-500">Target Case</span>
                <span className="font-mono text-black font-semibold">{selectedDoc.case?.caseNumber} — {selectedDoc.case?.title}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-500">File Format & Size</span>
                <span className="font-mono text-black">{selectedDoc.fileType} ({formatFileSize(selectedDoc.fileSize)})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-500">Category</span>
                <span className="font-mono text-zinc-800">{selectedDoc.dataCategory}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-500">Uploaded By</span>
                <span className="text-black font-medium">{selectedDoc.uploadedBy?.fullName} ({selectedDoc.uploadedBy?.email})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-500">Upload Date</span>
                <span className="text-zinc-700">{new Date(selectedDoc.uploadedAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-500">Extraction Engine</span>
                <span className="font-mono text-black font-semibold">
                  {selectedDoc.extractionMethod === 'RULE_BASED_FALLBACK' ? 'RULE-BASED FALLBACK' : 'AI'}
                </span>
              </div>
              {selectedDoc.fallbackReason && (
                <div className="p-2 bg-amber-50 border border-amber-200 text-amber-800 rounded text-[11px]">
                  <span className="font-semibold block">Fallback Info:</span>
                  {selectedDoc.fallbackReason}
                </div>
              )}

              {/* SHA-256 Hash Verification */}
              <div className="pt-2">
                <span className="text-zinc-500 block mb-1 font-mono text-[10px] uppercase tracking-wider">Stored SHA-256 Hash:</span>
                <div className="bg-zinc-50 border border-zinc-200 rounded p-2 font-mono text-[10px] text-zinc-800 break-all select-all">
                  {selectedDoc.sha256Hash}
                </div>
              </div>

              {/* Integrity Diagnostic */}
              <div className="pt-2">
                <span className="text-zinc-500 block mb-1.5 font-mono text-[10px] uppercase tracking-wider">Cryptographic Audit Diagnostic:</span>
                {verifyingIntegrity ? (
                  <div className="text-xs text-zinc-400 animate-pulse">Calculating runtime SHA-256 hash on server disk…</div>
                ) : integrityStatus ? (
                  <div className={`p-3 rounded-md text-xs border ${
                    integrityStatus.verified ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    <div className="font-semibold">{integrityStatus.status || (integrityStatus.verified ? 'INTEGRITY VERIFIED' : 'FAILED')}</div>
                    <p className="text-[11px] mt-1 text-zinc-600">
                      {integrityStatus.verified
                        ? 'Runtime SHA-256 hash matches original upload digest. File has not been tampered with.'
                        : integrityStatus.reason || 'File digest mismatch.'}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
              {selectedDoc.caseId && (
                <Link href={`/cases/${selectedDoc.caseId}`} className="btn-secondary text-xs px-3 py-1.5">
                  View Associated Case
                </Link>
              )}
              <a
                href={`/api/documents/${selectedDoc.id}/download`}
                download
                className="btn-primary text-xs px-4 py-1.5 ml-auto"
              >
                Download Raw File
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
