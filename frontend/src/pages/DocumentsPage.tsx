import React, { useEffect, useState, useRef } from 'react';
import { FileText, Upload, CheckCircle2, AlertCircle, RefreshCw, HardDrive } from 'lucide-react';
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
  const [isDragOver, setIsDragOver] = useState(false);
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

  const handleUploadFile = async (file: File) => {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUploadFile(file);
  };

  return (
    <div className="space-y-6 text-slate-900 font-sans pb-12">
      {/* Header */}
      <div className="dev-card flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-slate-900">
              Document Index & Chunk Store
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              VECTOR CORPUS
            </span>
          </div>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Indexed knowledge base documents, metadata, and extracted vector chunk store.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-[6px] border border-slate-200">
          <HardDrive className="w-3.5 h-3.5 text-[#00288e]" />
          <span>Index: <strong className="text-slate-900">{docs.length} files</strong></span>
        </div>
      </div>

      {/* Developer File Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`dev-card border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
          isDragOver
            ? 'border-[#00288e] bg-blue-50/50'
            : 'border-slate-300 hover:border-slate-400 bg-slate-50/40'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".txt,.md,.pdf,.doc,.docx"
          className="hidden"
          id="doc-file-upload-input"
        />
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#00288e] shadow-sm">
            {isUploading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-800">
              {isUploading ? 'Chunking and indexing document...' : 'Click to select or drag and drop document'}
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
              Supports .txt, .md, .pdf, .docx files for vector indexing
            </div>
          </div>
        </div>
      </div>

      {uploadStatus && (
        <div
          className={`p-3 rounded-[6px] text-xs font-mono flex items-center gap-2 ${
            uploadStatus.includes('Successfully')
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {uploadStatus.includes('Successfully') ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{uploadStatus}</span>
        </div>
      )}

      {/* Technical Document Management Table */}
      <div className="dev-card p-0 overflow-hidden bg-white">
        <table className="dev-table">
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
                    <td className="font-medium text-slate-900 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-[#00288e] shrink-0" />
                      <span className="font-mono text-xs">{doc.filename}</span>
                    </td>
                    <td className="font-mono text-slate-500 text-[11px]">{ext} FILE</td>
                    <td className="text-right font-mono text-slate-800 font-bold">
                      {doc.chunk_count}
                    </td>
                    <td className="font-mono text-slate-500 text-[11px]">2026-09-26 19:40</td>
                    <td className="text-right">
                      <span className="badge-status badge-good">INDEXED</span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-400 font-mono text-xs">
                  {isLoading ? 'Loading document index...' : 'No documents indexed yet. Upload a document to populate vector store.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
