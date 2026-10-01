import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { documentsApi } from '../../api/documents';
import type { DocumentResponse } from '../../types/api';

interface DocumentPanelProps {
  onUploadSuccess: () => void;
}

export const DocumentPanel: React.FC<DocumentPanelProps> = ({ onUploadSuccess }) => {
  const [data, setData] = useState<DocumentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await documentsApi.getDocuments();
      setData(res);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.txt') && !file.name.endsWith('.pdf')) {
      setUploadMessage({ type: 'error', text: 'Unsupported format. Please upload .txt or .pdf' });
      return;
    }

    setIsUploading(true);
    setUploadMessage(null);

    try {
      await documentsApi.uploadDocument(file);
      setUploadMessage({ type: 'success', text: `Indexed: ${file.name}` });
      await fetchDocuments();
      onUploadSuccess();
    } catch (err: any) {
      setUploadMessage({ type: 'error', text: err.response?.data?.detail || err.message || 'Upload failed' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div id="documents-section" className="dev-panel flex flex-col gap-3.5">
      <div className="flex justify-between items-center border-b border-[#34342D] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-[#E8E3D9] uppercase tracking-wider">DOCUMENTS</span>
          <span className="text-xs text-[#A9A59B] font-sans">/ Vector Index</span>
        </div>
        
        <div>
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept=".txt,.pdf"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={clsx(
              "text-xs font-sans font-semibold px-3.5 py-1.5 rounded-[8px] transition-all duration-150 flex items-center gap-1.5 cursor-pointer",
              isUploading 
                ? "bg-[#171814] text-[#77746C] border border-[#34342D] cursor-not-allowed shadow-[none]"
                : "btn-orange"
            )}
          >
            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
            {isUploading ? 'Indexing...' : 'Upload document'}
          </button>
        </div>
      </div>

      {uploadMessage && (
        <div className={clsx(
          "text-xs font-mono p-2.5 rounded-[8px] flex items-center gap-2 border shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]",
          uploadMessage.type === 'success' ? "bg-[#1B2B22] text-[#4A8060] border-[#315B45]/50" : "bg-[#2B1716] text-[#B9574B] border-[#B9574B]/50"
        )}>
          <span>{uploadMessage.text}</span>
        </div>
      )}

      <div className="border border-[#34342D] rounded-[8px] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
        <table className="dev-table">
          <thead>
            <tr className="bg-[#171814]">
              <th className="text-[#A9A59B]">DOCUMENT</th>
              <th className="w-20 text-right text-[#A9A59B]">CHUNKS</th>
              <th className="w-20 text-right text-[#A9A59B]">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && !data && (
              <tr>
                <td colSpan={3} className="text-center py-4 text-[#A9A59B] font-mono">Loading document index...</td>
              </tr>
            )}
            
            {data?.documents.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-4 text-[#77746C] font-sans">No documents indexed.</td>
              </tr>
            )}
            
            {data?.documents.map((doc, idx) => (
              <tr key={idx} className="border-b border-[#34342D]">
                <td className="font-sans text-xs text-[#F1EDE4]">
                  <div className="flex flex-col">
                    <span className="font-medium text-[#F1EDE4]">{doc.filename}</span>
                    <span className="font-mono text-[10px] text-[#A9A59B]">{doc.document_id}</span>
                  </div>
                </td>
                <td className="text-right font-mono text-xs font-semibold text-[#F1EDE4]">
                  {doc.chunk_count}
                </td>
                <td className="text-right">
                  <span className="badge badge-good uppercase font-mono text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4A8060] shadow-[0_0_6px_rgba(74,128,96,0.6)]"></span>
                    Indexed
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};




