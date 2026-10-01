import React, { useState } from 'react';
import { Play, Loader2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface QueryPanelProps {
  onRunDebug: (query: string, topK: number) => void;
  isLoading: boolean;
  error: string | null;
}

export const QueryPanel: React.FC<QueryPanelProps> = ({ onRunDebug, isLoading, error }) => {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onRunDebug(query, topK);
    }
  };

  const sampleQueries = [
    "What database is used for local storage?",
    "How does the grounding verification algorithm detect unsupported claims?",
    "What is the total latency breakdown of retrieval vs generation?"
  ];

  return (
    <div id="query-workspace" className="dev-panel flex flex-col gap-3.5">
      <div className="flex items-center justify-between border-b border-[#34342D] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-[#E8E3D9] uppercase tracking-wider">RAG ANALYSIS</span>
          <span className="text-xs text-[#A9A59B] font-sans">/ Query Workspace</span>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="topk-select" className="text-xs text-[#A9A59B] font-sans font-medium">top_k:</label>
          <select
            id="topk-select"
            value={topK}
            onChange={(e) => setTopK(parseInt(e.target.value) || 5)}
            className="bg-[#171814] border border-[#34342D] rounded-[6px] px-2 py-0.5 text-xs text-[#F1EDE4] focus:outline-none focus:border-[#C96B3C] shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] font-mono font-medium cursor-pointer transition-all duration-150"
            disabled={isLoading}
          >
            <option value={1}>1</option>
            <option value={3}>3</option>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
          </select>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="relative">
          <textarea
            id="query-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter query to inspect pipeline trace (e.g. What database is used for local storage?)"
            className="w-full bg-[#171814] border border-[#34342D] rounded-[8px] p-3 text-sm min-h-[78px] resize-y text-[#F1EDE4] placeholder:text-[#77746C] font-sans leading-relaxed transition-all duration-180 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] focus:outline-none focus:border-[#C96B3C] focus:bg-[#1A1A16] focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2),0_0_0_3px_rgba(201,107,60,0.15)]"
            disabled={isLoading}
          />
          {query.length > 0 && (
            <span className="absolute bottom-2.5 right-3 text-[11px] font-mono text-[#A9A59B] bg-[#1D1E1A] px-1.5 py-0.5 rounded border border-[#34342D]">
              {query.length} chars
            </span>
          )}
        </div>

        {/* Quick sample prompt list */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#A9A59B]">
          <span className="text-[#77746C] text-xs font-mono">Sample queries:</span>
          {sampleQueries.map((sq, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setQuery(sq)}
              className="px-2.5 py-1 rounded-[6px] bg-[#171814] border border-[#34342D] hover:bg-[#302019] hover:text-[#E07A45] hover:border-[#C96B3C]/40 text-[#A9A59B] text-xs font-sans transition-all duration-150 truncate max-w-[320px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] cursor-pointer"
            >
              {sq}
            </button>
          ))}
        </div>
        
        {error && (
          <div className="flex items-start gap-2 text-[#B9574B] text-xs bg-[#2B1716] p-2.5 rounded-[8px] border border-[#B9574B]/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#B9574B]" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-xs font-mono uppercase tracking-wider text-[#B9574B]">Error</span>
              <span>{error}</span>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between pt-2.5 border-t border-[#34342D]">
          <div className="text-xs text-[#A9A59B] font-mono">
            {isLoading ? (
              <span className="text-[#E07A45] flex items-center gap-1.5 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Executing diagnostic pipeline...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4A8060] shadow-[0_0_6px_rgba(74,128,96,0.6)] inline-block"></span>
                Status: Ready for trace
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className={clsx(
              "flex items-center gap-1.5 px-4 py-2 rounded-[8px] font-sans font-semibold text-xs transition-all duration-150 cursor-pointer",
              !query.trim() || isLoading 
                ? "bg-[#171814] text-[#77746C] border border-[#34342D] cursor-not-allowed shadow-[none]" 
                : "btn-orange"
            )}
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            {isLoading ? 'Running...' : 'Run Analysis'}
          </button>
        </div>
      </form>
    </div>
  );
};





