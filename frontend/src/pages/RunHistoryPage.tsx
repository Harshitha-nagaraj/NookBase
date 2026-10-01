import React, { useEffect, useState } from 'react';
import { historyApi } from '../api/history';
import type { RunSummary, RunDetailResponse } from '../types/api';
import { RunTable } from '../components/history/RunTable';
import { RunInspector } from '../components/history/RunInspector';
import { RunComparison } from '../components/history/RunComparison';

export const RunHistoryPage: React.FC = () => {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedRunDetail, setSelectedRunDetail] = useState<RunDetailResponse | null>(null);
  const [compareDetails, setCompareDetails] = useState<[RunDetailResponse, RunDetailResponse] | null>(null);

  const fetchRuns = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await historyApi.getRuns(50, 0);
      setRuns(res.runs || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      console.error('Failed to load run history:', err);
      setError(err.message || 'Failed to load run history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleSelectRun = async (runId: string) => {
    setIsLoading(true);
    try {
      const detail = await historyApi.getRun(runId);
      setSelectedRunDetail(detail);
    } catch (err: any) {
      console.error('Failed to load run detail:', err);
      alert(`Could not load details for run ${runId}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRun = async (runId: string) => {
    if (!window.confirm(`Are you sure you want to delete run ${runId}?`)) return;
    try {
      await historyApi.deleteRun(runId);
      setRuns((prev) => prev.filter((r) => r.run_id !== runId));
      setTotal((prev) => Math.max(0, prev - 1));
      if (selectedRunDetail?.run_id === runId) setSelectedRunDetail(null);
    } catch (err) {
      console.error('Failed to delete run:', err);
    }
  };

  const handleCompareRuns = async (runId1: string, runId2: string) => {
    setIsLoading(true);
    try {
      const [detail1, detail2] = await Promise.all([
        historyApi.getRun(runId1),
        historyApi.getRun(runId2)
      ]);
      setCompareDetails([detail1, detail2]);
    } catch (err) {
      console.error('Failed to load comparison runs:', err);
      alert('Could not load one or both runs for comparison');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-zinc-900 font-sans pb-12">
      {/* Header */}
      {!selectedRunDetail && !compareDetails && (
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">Run History</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Audit trail of past RAG queries, retrieval performance, grounding diagnostics, and efficiency metrics.
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded font-mono">
          {error}
        </div>
      )}

      {/* Views rendering */}
      {compareDetails ? (
        <RunComparison
          run1={compareDetails[0]}
          run2={compareDetails[1]}
          onBack={() => setCompareDetails(null)}
        />
      ) : selectedRunDetail ? (
        <RunInspector
          run={selectedRunDetail}
          onBack={() => setSelectedRunDetail(null)}
        />
      ) : (
        <RunTable
          runs={runs}
          total={total}
          isLoading={isLoading}
          onRefresh={fetchRuns}
          onSelectRun={handleSelectRun}
          onDeleteRun={handleDeleteRun}
          onCompareRuns={handleCompareRuns}
        />
      )}
    </div>
  );
};
