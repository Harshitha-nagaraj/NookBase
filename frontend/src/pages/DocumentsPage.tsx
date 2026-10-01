import React, { useEffect, useState, useRef } from 'react';
import { FileText, Upload, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { documentsApi } from '../api/documents';
import type { DocumentResponse } from '../types/api';

interface DocumentsPageProps {
  onDocumentUploaded?: () => void;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({ onDocumentUploaded }) => {
  const [docs, setDocs] = useState<DocumentResponse['documents']>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    setIsLoading(true);
    try {
      const res = await documentsApi.getDocuments();
      setDocs(res.documents);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus(null);
    try {
      await documentsApi.uploadDocument(file);
      setUploadStatus(`Successfully indexed document: ${file.name}`);
      await fetchDocs();
      if (onDocumentUploaded) onDocumentUploaded();
    } catch (err: any) {
      setUploadStatus(`Upload failed: ${err.message || 'Error uploading file'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 text-zinc-900 font-sans pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#00288e] font-semibold uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4" />
            <span>FILE BROWSER</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            Document Index
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Indexed knowledge base documents and extracted vector chunk store.
          </p>
        </div>

        {/* Upload Control */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".txt,.md,.pdf,.doc,.docx"
            className="hidden"
            id="doc-file-upload-input"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="btn-primary"
          >
            {isUploading ? (
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Indexing File...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Document</span>
              </span>
            )}
          </button>
        </div>
      </div>

      {uploadStatus && (
        <div
          className={`p-3 rounded-[3px] text-xs font-mono flex items-center gap-2 ${
            uploadStatus.includes('Successfully')
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {uploadStatus.includes('Successfully') ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600" />
          )}
          <span>{uploadStatus}</span>
        </div>
      )}

      {/* Developer File Browser Table */}
      <div className="border border-zinc-200 rounded-[3px] overflow-hidden bg-white">
        <table className="stitch-table">
          <thead>
            <tr>
              <th>Filename</th>
              <th className="w-32">Type</th>
              <th className="w-28 text-right">Chunks</th>
              <th className="w-44">Indexed Date</th>
              <th className="w-28 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {docs.length > 0 ? (
              docs.map((doc) => {
                const ext = doc.filename.split('.').pop()?.toUpperCase() || 'TXT';
                return (
                  <tr key={doc.document_id}>
                    <td className="font-medium text-zinc-900 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-[#00288e] shrink-0" />
                      <span className="font-mono text-xs">{doc.filename}</span>
                    </td>
                    <td className="font-mono text-zinc-500 text-[11px]">{ext} FILE</td>
                    <td className="text-right font-mono text-zinc-800 font-semibold">
                      {doc.chunk_count}
                    </td>
                    <td className="font-mono text-zinc-500 text-[11px]">2026-09-26 19:40</td>
                    <td className="text-right">
                      <span className="badge-status badge-good">INDEXED</span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-8 text-zinc-400 font-mono text-xs">
                  {isLoading ? 'Loading document index...' : 'No documents indexed yet. Upload a document to get started.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
