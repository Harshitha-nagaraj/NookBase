import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Filter } from 'lucide-react';
import clsx from 'clsx';
import type { DebugResponse } from '../../types/api';

interface RetrievalInspectorProps {
  data: DebugResponse | null;
}

export const RetrievalInspector: React.FC<RetrievalInspectorProps> = ({ data }) => {
  const [expandedChunkId, setExpandedChunkId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');

  if (!data) {
    return (
      <div className="dev-panel flex flex-col gap-3 h-full">
        <div className="flex items-center justify-between border-b border-[#34342D] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-[#E8E3D9] uppercase tracking-wider">RETRIEVED CONTEXT</span>
            <span className="text-xs text-[#A9A59B] font-sans">/ Inspection Output</span>
          </div>
          <span className="badge badge-neutral font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#77746C]/60"></span>
            Idle
          </span>
        </div>
        <div className="text-xs text-[#A9A59B] font-sans py-8 text-center border border-dashed border-[#34342D] rounded-[8px] bg-[#171814]">
          Run a query to inspect ranked vector search results, similarity scores, and chunk metadata.
        </div>
      </div>
    );
  }

  const { retrieval } = data;
  const filteredResults = retrieval.results.filter(
    (c) => 
      c.source.toLowerCase().includes(filterText.toLowerCase()) || 
      c.chunk_id.toLowerCase().includes(filterText.toLowerCase()) ||
      c.text.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="dev-panel flex flex-col gap-3.5 h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#34342D] pb-2.5">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs font-semibold text-[#E8E3D9] uppercase tracking-wider">RETRIEVED CONTEXT</span>
          <span className={clsx("badge font-mono uppercase text-[10px]", retrieval.status.includes("GOOD") ? "badge-good" : "badge-warning")}>
            <span className={clsx("w-1.5 h-1.5 rounded-full", retrieval.status.includes("GOOD") ? "bg-[#4A8060] shadow-[0_0_6px_rgba(74,128,96,0.6)]" : "bg-[#E07A45] shadow-[0_0_6px_rgba(224,122,69,0.6)]")}></span>
            {retrieval.status}
          </span>
        </div>
        
        <div className="flex items-center gap-3 text-xs font-mono text-[#A9A59B]">
          <span>best_score: <strong className="text-[#4A8060] font-semibold">{retrieval.best_score.toFixed(4)}</strong></span>
          <span className="border-l border-[#34342D] pl-3">avg: <strong className="text-[#F1EDE4]">{retrieval.average_score.toFixed(4)}</strong></span>
          <span className="border-l border-[#34342D] pl-3">count: <strong className="text-[#F1EDE4]">{retrieval.results.length}</strong></span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-2 bg-[#171814] border border-[#34342D] rounded-[7px] px-3 py-1.5 text-xs shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-2 flex-1">
          <Filter className="w-3.5 h-3.5 text-[#77746C]" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter vector results by source, chunk ID, or content..."
            className="bg-transparent border-none outline-none text-[#F1EDE4] placeholder:text-[#77746C] w-full text-xs font-sans"
          />
        </div>
        {filterText && (
          <button 
            onClick={() => setFilterText('')}
            className="text-[11px] font-mono text-[#A9A59B] hover:text-[#F1EDE4] cursor-pointer transition-colors"
          >
            clear
          </button>
        )}
      </div>

      {/* Dense Table Layout for Inspection */}
      <div className="border border-[#34342D] rounded-[8px] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
        <table className="dev-table">
          <thead>
            <tr className="bg-[#171814]">
              <th className="w-12 text-[#A9A59B]">RANK</th>
              <th className="w-24 text-[#A9A59B]">SCORE</th>
              <th className="text-[#A9A59B]">SOURCE DOCUMENT</th>
              <th className="hidden md:table-cell text-[#A9A59B]">CONTENT PREVIEW</th>
              <th className="w-24 text-right text-[#A9A59B]">STATUS</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-[#77746C] font-sans">
                  No vector chunks match filter "{filterText}"
                </td>
              </tr>
            ) : (
              filteredResults.map((chunk) => {
                const isExpanded = expandedChunkId === chunk.chunk_id;
                const isTopRank = chunk.rank === 1;

                return (
                  <React.Fragment key={chunk.chunk_id}>
                    <tr 
                      onClick={() => setExpandedChunkId(isExpanded ? null : chunk.chunk_id)}
                      className={clsx(
                        "cursor-pointer transition-colors duration-150 border-b border-[#34342D]",
                        isExpanded ? "bg-[#1B2B22] font-medium" : "bg-[#1D1E1A] hover:bg-[#24231E]",
                        isTopRank && !isExpanded && "font-medium"
                      )}
                    >
                      <td className="font-mono text-[#F1EDE4] font-semibold">
                        0{chunk.rank}
                      </td>
                      <td className={clsx(
                        "font-mono font-bold",
                        chunk.similarity >= 0.75 ? "text-[#4A8060]" : "text-[#C96B3C]"
                      )}>
                        {chunk.similarity.toFixed(2)}
                      </td>
                      <td className="font-sans">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-[#F1EDE4] truncate font-medium">{chunk.source}</span>
                          {chunk.page && <span className="font-mono text-[10px] text-[#A9A59B] bg-[#171814] px-1.5 py-0.5 rounded border border-[#34342D]">p.{chunk.page}</span>}
                        </div>
                      </td>
                      <td className="hidden md:table-cell font-sans text-[#A9A59B] truncate max-w-[240px]">
                        {chunk.text}
                      </td>
                      <td className="text-right">
                        <span className={clsx(
                          "badge uppercase text-[10px]",
                          chunk.relevance_label.includes("HIGH") || chunk.relevance_label.includes("RELEVANT") ? "badge-good" : "badge-neutral"
                        )}>
                          <span className={clsx("w-1 h-1 rounded-full", chunk.relevance_label.includes("HIGH") || chunk.relevance_label.includes("RELEVANT") ? "bg-[#4A8060]" : "bg-[#77746C]")}></span>
                          {chunk.relevance_label}
                        </span>
                      </td>
                      <td className="text-right">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[#A9A59B] inline" /> : <ChevronRight className="w-3.5 h-3.5 text-[#77746C] inline" />}
                      </td>
                    </tr>

                    {/* Detailed Chunk Inspection Drawer */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="bg-[#171814] p-3.5 border-b border-[#34342D]">
                          <div className="flex flex-col gap-2.5 font-sans text-xs">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-[11px] bg-[#1D1E1A] p-2.5 rounded-[6px] border border-[#34342D] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
                              <div><span className="text-[#77746C]">SOURCE:</span> <strong className="text-[#F1EDE4]">{chunk.source}</strong></div>
                              <div><span className="text-[#77746C]">CHUNK ID:</span> <strong className="text-[#F1EDE4]">{chunk.chunk_id}</strong></div>
                              <div><span className="text-[#77746C]">SIMILARITY:</span> <strong className="text-[#4A8060] font-semibold">{chunk.similarity.toFixed(4)}</strong></div>
                              <div><span className="text-[#77746C]">DISTANCE:</span> <strong className="text-[#C8C4BB]">{chunk.distance.toFixed(4)}</strong></div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="font-mono text-[10px] font-semibold text-[#A9A59B] uppercase tracking-wider">CONTENT TEXT ({chunk.text.length} chars)</span>
                              <div className="p-3 bg-[#1D1E1A] rounded-[6px] border border-[#34342D] text-[#C8C4BB] text-xs leading-relaxed font-sans whitespace-pre-wrap max-h-[300px] overflow-y-auto shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
                                {chunk.text}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};





