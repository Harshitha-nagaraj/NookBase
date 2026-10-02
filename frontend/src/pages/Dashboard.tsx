import React, { useEffect, useState } from 'react';
import { Sidebar, type NavTab } from '../components/layout/Sidebar';
import { TopBar } from '../components/layout/TopBar';
import { AnalyzePage } from './AnalyzePage';
import { RunHistoryPage } from './RunHistoryPage';
import { DocumentsPage } from './DocumentsPage';
import { EvaluationPage } from './EvaluationPage';
import { ExperimentsPage } from './ExperimentsPage';
import { SecurityPage } from './SecurityPage';

import { debugApi } from '../api/debug';
import { documentsApi } from '../api/documents';
import { historyApi } from '../api/history';
import type { DebugResponse } from '../types/api';

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('analyze');
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [data, setData] = useState<DebugResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentCount, setDocumentCount] = useState(0);
  const [chunkCount, setChunkCount] = useState(0);
  const [runCount, setRunCount] = useState(0);

  // Check backend health and fetch initial document list stats & run count
  useEffect(() => {
    debugApi.checkHealth()
      .then(() => setApiStatus('connected'))
      .catch(() => setApiStatus('offline'));

    documentsApi.getDocuments()
      .then((res) => {
        if (res.documents && res.documents.length > 0) {
          setDocumentCount(res.documents.length);
          const totalChunks = res.documents.reduce((acc, d) => acc + (d.chunk_count || 0), 0);
          if (totalChunks > 0) setChunkCount(totalChunks);
        }
      })
      .catch((err) => console.warn('Could not load doc counts:', err));

    historyApi.getRuns(1, 0)
      .then((res) => setRunCount(res.total || 0))
      .catch((err) => console.warn('Could not load run counts:', err));
  }, []);

  const handleRunDebug = async (query: string, topK: number, strategy: string = 'standard', threshold: number = 0.35) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await debugApi.runDebug(query, topK, strategy, threshold);
      setData(result);
      setRunCount((prev) => prev + 1);
    } catch (err: any) {
      console.error('[RAG DEBUG] handleRunDebug catch:', err);
      const detailMsg = err.response?.data?.detail 
        ? (typeof err.response.data.detail === 'object' ? JSON.stringify(err.response.data.detail) : err.response.data.detail)
        : null;
      const statusMsg = err.response?.status ? `HTTP ${err.response.status}` : null;
      const codeMsg = err.code ? `[Code: ${err.code}]` : null;
      const fullError = [statusMsg, codeMsg, err.message, detailMsg].filter(Boolean).join(' - ');
      setError(fullError || 'Failed to connect to NookBase API');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    debugApi.checkHealth()
      .then(() => setApiStatus('connected'))
      .catch(() => setApiStatus('offline'));
  };

  return (
    <div className="min-h-screen bg-[#fafaf4] text-zinc-900 font-sans">
      {/* Fixed Sidebar (~240px wide) */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        apiStatus={apiStatus}
        documentCount={documentCount}
        chunkCount={chunkCount}
      />

      {/* Fixed Top Bar */}
      <TopBar
        activeTab={activeTab}
        runId={data?.run_id || `Run #${String(runCount).padStart(3, '0')}`}
        latencyMs={data?.efficiency.total_latency_ms ?? 37.2}
        apiStatus={apiStatus}
        onRefresh={handleRefresh}
      />

      {/* Main Page Workspace Container */}
      <main className="ml-[240px] pt-16 px-8 max-w-[1440px] mx-auto min-h-[calc(100vh-4rem)]">
        {activeTab === 'analyze' && (
          <AnalyzePage
            data={data}
            isLoading={isLoading}
            error={error}
            onRunDebug={handleRunDebug}
          />
        )}

        {activeTab === 'history' && <RunHistoryPage />}

        {activeTab === 'documents' && (
          <DocumentsPage
            onDocumentUploaded={() => {
              documentsApi.getDocuments().then((res) => {
                setDocumentCount(res.documents.length);
                const totalChunks = res.documents.reduce((acc, d) => acc + (d.chunk_count || 0), 0);
                setChunkCount(totalChunks);
              });
            }}
          />
        )}

        {activeTab === 'evaluation' && <EvaluationPage />}

        {activeTab === 'experiments' && <ExperimentsPage />}

        {activeTab === 'security' && <SecurityPage />}
      </main>
    </div>
  );
};
