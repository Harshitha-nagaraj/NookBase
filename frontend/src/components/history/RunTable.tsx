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
        // Keep the latest 1 and add new one
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
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-red-50 text-red-700 border border-red-200">
          {diagnosis}
        </span>
      );
    }
    if (d.includes('WARN') || d.includes('PARTIAL') || d.includes('EFFICIENCY')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-50 text-amber-700 border border-amber-200">
          {diagnosis}
        </span>
      );
    }
    if (d.includes('SECURITY')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-purple-50 text-purple-700 border border-purple-200">
          {diagnosis}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        {diagnosis || 'GROUNDED'}
      </span>
    );
  };

  const renderGroundingBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s.includes('UNGROUNDED')) {
      return <span className="text-red-600 font-mono text-[11px] font-medium">UNGROUNDED</span>;
    }
    if (s.includes('PARTIAL')) {
      return <span className="text-amber-600 font-mono text-[11px] font-medium">PARTIAL</span>;
    }
    return <span className="text-emerald-600 font-mono text-[11px] font-medium">GROUNDED</span>;
  };

  return (
    <div className="space-y-3 font-sans">
      {/* Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded border border-zinc-200">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search runs by ID, query, diagnosis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded text-zinc-800 focus:outline-none focus:border-[#00288e]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedForCompare.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-600 font-mono">
                Selected ({selectedForCompare.length}/2)
              </span>
              <button
                onClick={handleCompareClick}
                disabled={selectedForCompare.length !== 2}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  selectedForCompare.length === 2
                    ? 'bg-[#00288e] text-white hover:bg-[#001f70]'
                    : 'bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Compare Runs</span>
              </button>
            </div>
          )}

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium text-zinc-700 bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#00288e]' : 'text-zinc-500'}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Runs Table */}
      <div className="bg-white rounded border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-[11px] font-mono uppercase text-zinc-500 tracking-wider">
                <th className="py-2.5 px-3 w-10 text-center">Compare</th>
                <th className="py-2.5 px-3 font-semibold">Run ID</th>
                <th className="py-2.5 px-3 font-semibold">Time</th>
                <th className="py-2.5 px-3 font-semibold">Query</th>
                <th className="py-2.5 px-3 font-semibold">Diagnosis</th>
                <th className="py-2.5 px-3 font-semibold">Grounding</th>
                <th className="py-2.5 px-3 font-semibold text-right">Tokens</th>
                <th className="py-2.5 px-3 font-semibold text-right">Latency</th>
                <th className="py-2.5 px-3 font-semibold text-center w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-xs text-zinc-700">
              {filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-zinc-400 font-mono text-xs">
                    {isLoading ? 'Loading run history...' : 'No runs found. Execute a query in Query Playground!'}
                  </td>
                </tr>
              ) : (
                filteredRuns.map((r) => {
                  const isChecked = selectedForCompare.includes(r.run_id);
                  return (
                    <tr
                      key={r.run_id}
                      onClick={() => onSelectRun(r.run_id)}
                      className="hover:bg-zinc-50/80 cursor-pointer transition-colors group"
                    >
                      <td
                        className="py-2.5 px-3 text-center"
                        onClick={(e) => toggleSelectForCompare(r.run_id, e)}
                      >
                        <button className="text-zinc-400 hover:text-[#00288e] focus:outline-none">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-[#00288e]" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-300" />
                          )}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-[#00288e] whitespace-nowrap">
                        {r.run_id}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-zinc-500 text-[11px] whitespace-nowrap">
                        {r.timestamp ? r.timestamp.split('T')[1]?.substring(0, 8) || r.timestamp : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-sans font-medium text-zinc-800 max-w-xs truncate">
                        {r.query}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {renderDiagnosisBadge(r.diagnosis)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {renderGroundingBadge(r.grounding_status)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-right text-zinc-700 whitespace-nowrap">
                        {r.efficiency?.total_tokens ?? 0}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-right text-zinc-700 whitespace-nowrap">
                        {r.efficiency?.latency_ms ? `${r.efficiency.latency_ms} ms` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRun(r.run_id);
                          }}
                          className="p-1 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
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
        <div className="px-4 py-2 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <span>Showing {filteredRuns.length} of {total} stored runs</span>
          <span>Click any row to open Run Inspector · Select 2 runs to Compare</span>
        </div>
      </div>
    </div>
  );
};
