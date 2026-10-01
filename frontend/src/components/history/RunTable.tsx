import React, { useState } from 'react';
import { Search, RefreshCw, Trash2, Layers, CheckSquare, Square } from 'lucide-react';
import type { RunSummary } from '../../types/api';

interface RunTableProps {
  runs: RunSummary[];
  total: number;
  isLoading: boolean;
  onRefresh: () => void;
  onSelectRun: (runId: string) => void;
  onDeleteRun: (runId: string) => void;
  onCompareRuns: (runId1: string, runId2: string) => void;
}

export const RunTable: React.FC<RunTableProps> = ({
  runs,
  total,
  isLoading,
  onRefresh,
  onSelectRun,
  onDeleteRun,
  onCompareRuns,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  const filteredRuns = runs.filter(
    (r) =>
      r.run_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.query.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.grounding_status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelectForCompare = (runId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedForCompare((prev) => {
      if (prev.includes(runId)) {
        return prev.filter((id) => id !== runId);
      }
      if (prev.length >= 2) {
        return [prev[1], runId];
      }
      return [...prev, runId];
    });
  };

  const handleCompareClick = () => {
    if (selectedForCompare.length === 2) {
      onCompareRuns(selectedForCompare[0], selectedForCompare[1]);
    }
  };

  const renderDiagnosisBadge = (diagnosis: string) => {
    const d = (diagnosis || '').toUpperCase();
    if (d.includes('FAIL') || d.includes('RETRIEVAL_FAILURE') || d.includes('GROUNDING_FAILURE')) {
      return <span className="badge-status badge-danger">{diagnosis}</span>;
    }
    if (d.includes('WARN') || d.includes('PARTIAL') || d.includes('EFFICIENCY')) {
      return <span className="badge-status badge-warn">{diagnosis}</span>;
    }
    return <span className="badge-status badge-good">{diagnosis || 'GROUNDED'}</span>;
  };

  const renderGroundingBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s.includes('UNGROUNDED')) {
      return <span className="text-rose-700 font-mono text-[11px] font-semibold">UNGROUNDED</span>;
    }
    if (s.includes('PARTIAL')) {
      return <span className="text-amber-700 font-mono text-[11px] font-semibold">PARTIAL</span>;
    }
    return <span className="text-emerald-700 font-mono text-[11px] font-semibold">GROUNDED</span>;
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Search & Action Controls */}
      <div className="dev-card flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search runs by ID, query text, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="dev-input w-full pl-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedForCompare.length > 0 && (
            <div className="flex items-center gap-2 mr-2">
              <span className="text-xs text-slate-600 font-mono">
                Selected ({selectedForCompare.length}/2)
              </span>
              <button
                onClick={handleCompareClick}
                disabled={selectedForCompare.length !== 2}
                className="btn-primary"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Compare Runs</span>
              </button>
            </div>
          )}

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="btn-secondary"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#00288e]' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Developer Log Execution Table */}
      <div className="dev-card p-0 overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="dev-table">
            <thead>
              <tr>
                <th className="w-10 text-center">Compare</th>
                <th>Run ID</th>
                <th>Timestamp</th>
                <th>Query</th>
                <th>Diagnosis</th>
                <th>Grounding</th>
                <th className="text-right">Tokens</th>
                <th className="text-right">Latency</th>
                <th className="text-center w-16">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-mono text-xs">
                    {isLoading ? 'Loading run execution history...' : 'No runs found in execution log.'}
                  </td>
                </tr>
              ) : (
                filteredRuns.map((r) => {
                  const isChecked = selectedForCompare.includes(r.run_id);
                  return (
                    <tr
                      key={r.run_id}
                      onClick={() => onSelectRun(r.run_id)}
                      className="cursor-pointer transition-colors group"
                    >
                      <td
                        className="text-center"
                        onClick={(e) => toggleSelectForCompare(r.run_id, e)}
                      >
                        <button className="text-slate-400 hover:text-[#00288e] focus:outline-none">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-[#00288e]" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>
                      <td className="font-mono font-bold text-[#00288e] whitespace-nowrap">
                        {r.run_id}
                      </td>
                      <td className="font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        {r.timestamp ? r.timestamp.split('T')[1]?.substring(0, 8) || r.timestamp : '—'}
                      </td>
                      <td className="font-sans font-medium text-slate-800 max-w-xs truncate">
                        {r.query}
                      </td>
                      <td className="whitespace-nowrap">
                        {renderDiagnosisBadge(r.diagnosis)}
                      </td>
                      <td className="whitespace-nowrap">
                        {renderGroundingBadge(r.grounding_status)}
                      </td>
                      <td className="font-mono text-right text-slate-700 whitespace-nowrap">
                        {r.efficiency?.total_tokens ?? 0} tok
                      </td>
                      <td className="font-mono text-right text-slate-700 whitespace-nowrap font-semibold">
                        {r.efficiency?.latency_ms ? `${r.efficiency.latency_ms} ms` : '—'}
                      </td>
                      <td className="text-center whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRun(r.run_id);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete run"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>Showing {filteredRuns.length} of {total} stored runs</span>
          <span>Click any row to open Run Inspector · Select 2 runs to Compare</span>
        </div>
      </div>
    </div>
  );
};
