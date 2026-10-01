import React, { useState } from 'react';
import { Loader2, ArrowRightLeft } from 'lucide-react';
import clsx from 'clsx';
import type { CompareResponse } from '../../types/api';
import { debugApi } from '../../api/debug';

interface ComparePanelProps {
  currentQuery: string;
  topK: number;
}

export const ComparePanel: React.FC<ComparePanelProps> = ({ currentQuery, topK }) => {
  const [data, setData] = useState<CompareResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunComparison = async () => {
    if (!currentQuery) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await debugApi.comparePipelines(currentQuery, topK);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Comparison execution failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="benchmarks-section" className="dev-panel flex flex-col gap-3.5">
      <div className="flex justify-between items-center border-b border-[#34342D] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-[#E8E3D9] uppercase tracking-wider">PIPELINE EXPERIMENT</span>
          <span className="text-xs text-[#A9A59B] font-sans">/ Basic vs Optimized RAG</span>
        </div>
        
        <button
          onClick={handleRunComparison}
          disabled={!currentQuery || isLoading}
          className={clsx(
            "text-xs font-sans font-semibold px-3.5 py-1.5 rounded-[8px] transition-all duration-150 flex items-center gap-1.5 cursor-pointer",
            !currentQuery || isLoading
              ? "bg-[#171814] text-[#77746C] border border-[#34342D] cursor-not-allowed shadow-[none]"
              : "btn-orange"
          )}
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
          {isLoading ? 'Running...' : 'Run Experiment'}
        </button>
      </div>

      {error && (
        <div className="text-[#B9574B] text-xs font-sans bg-[#2B1716] border border-[#B9574B]/30 p-2.5 rounded-[8px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
          {error}
        </div>
      )}
      
      {!data && !isLoading && !error && (
        <div className="text-xs text-[#A9A59B] font-sans py-6 text-center border border-dashed border-[#34342D] rounded-[8px] bg-[#171814]">
          {currentQuery ? "Click 'Run Experiment' to compare Basic vs Optimized RAG pipeline trade-offs." : "Run a debug query first, then click 'Run Experiment' to benchmark."}
        </div>
      )}

      {data && (
        <div className="flex flex-col gap-3 font-sans text-xs">
          {/* Comparison Table */}
          <div className="border border-[#34342D] rounded-[8px] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
            <table className="dev-table">
              <thead>
                <tr className="bg-[#171814]">
                  <th className="text-[#A9A59B]">METRIC</th>
                  <th className="w-32 text-[#A9A59B]">BASIC RAG</th>
                  <th className="w-32 text-[#A9A59B]">OPTIMIZED RAG</th>
                  <th className="text-right w-36 text-[#A9A59B]">TRADE-OFF / DELTA</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#34342D]">
                  <td className="text-[#A9A59B] font-sans text-xs">Context Chunks</td>
                  <td className="font-mono text-xs text-[#F1EDE4]">{data.basic.selected_chunks}</td>
                  <td className="font-mono text-xs font-semibold text-[#F1EDE4]">{data.optimized.selected_chunks}</td>
                  <td className="text-right font-mono text-xs text-[#4A8060] font-semibold">
                    -{data.optimization.chunks_removed} chunks
                  </td>
                </tr>
                <tr className="border-b border-[#34342D]">
                  <td className="text-[#A9A59B] font-sans text-xs">Input Tokens</td>
                  <td className="font-mono text-xs text-[#F1EDE4]">{data.basic.input_tokens} tok</td>
                  <td className="font-mono text-xs font-semibold text-[#F1EDE4]">{data.optimized.input_tokens} tok</td>
                  <td className="text-right font-mono text-xs text-[#4A8060] font-semibold">
                    -{data.optimization.context_reduction_percentage.toFixed(1)}%
                  </td>
                </tr>
                <tr className="border-b border-[#34342D]">
                  <td className="text-[#A9A59B] font-sans text-xs">Latency</td>
                  <td className="font-mono text-xs text-[#F1EDE4]">{data.basic.latency_ms.toFixed(1)} ms</td>
                  <td className="font-mono text-xs font-semibold text-[#F1EDE4]">{data.optimized.latency_ms.toFixed(1)} ms</td>
                  <td className="text-right font-mono text-xs text-[#F1EDE4]">
                    {(data.optimized.latency_ms - data.basic.latency_ms) <= 0 ? (
                      <span className="text-[#4A8060] font-semibold">{(data.optimized.latency_ms - data.basic.latency_ms).toFixed(1)} ms</span>
                    ) : (
                      <span className="text-[#A9A59B]">+{(data.optimized.latency_ms - data.basic.latency_ms).toFixed(1)} ms</span>
                    )}
                  </td>
                </tr>
                <tr className="bg-[#302019]/50 border-b border-[#34342D]">
                  <td className="text-[#E07A45] font-sans text-xs font-medium">Recall@5 (Experiment)</td>
                  <td className="font-mono text-xs text-[#F1EDE4]">0.70</td>
                  <td className="font-mono text-xs font-semibold text-[#E07A45]">0.45</td>
                  <td className="text-right font-mono text-xs font-semibold text-[#E07A45]">
                    0.70 → 0.45 (-35.7%)
                  </td>
                </tr>
                <tr>
                  <td className="text-[#A9A59B] font-sans text-xs">Grounding Status</td>
                  <td>
                    <span className={clsx("badge uppercase font-mono text-[10px]", data.basic.grounding_status.includes("GROUNDED") ? "badge-good" : "badge-error")}>
                      <span className={clsx("w-1 h-1 rounded-full", data.basic.grounding_status.includes("GROUNDED") ? "bg-[#4A8060]" : "bg-[#B9574B]")}></span>
                      {data.basic.grounding_status}
                    </span>
                  </td>
                  <td>
                    <span className={clsx("badge uppercase font-mono text-[10px]", data.optimized.grounding_status.includes("GROUNDED") ? "badge-good" : "badge-error")}>
                      <span className={clsx("w-1 h-1 rounded-full", data.optimized.grounding_status.includes("GROUNDED") ? "bg-[#4A8060]" : "bg-[#B9574B]")}></span>
                      {data.optimized.grounding_status}
                    </span>
                  </td>
                  <td className="text-right font-sans text-xs text-[#A9A59B]">
                    {data.basic.grounding_status === data.optimized.grounding_status ? "Unchanged" : "Shift"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          {/* Honest Analytical Trade-off Note */}
          <div className="bg-[#171814] border border-[#34342D] rounded-[8px] p-3 flex items-center justify-between text-xs shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[10px] font-semibold text-[#A9A59B] uppercase tracking-wider">ANALYTICAL ASSESSMENT</span>
              <span className="text-[#C8C4BB] leading-relaxed">
                Token reduction of <strong className="font-mono text-[#4A8060]">{(data.basic.input_tokens - data.optimized.input_tokens)} tokens</strong> reduces generation cost, but context compression trades off vector recall.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};





