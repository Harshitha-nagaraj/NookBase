import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { evaluationApi } from '../../api/evaluation';
import type { EvaluationResponse, OptimizationExperimentResponse } from '../../types/api';

export const EvaluationPanel: React.FC = () => {
  const [evalData, setEvalData] = useState<EvaluationResponse | null>(null);
  const [optData, setOptData] = useState<OptimizationExperimentResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      evaluationApi.getEvaluation(),
      evaluationApi.getOptimizationExperiment()
    ])
      .then(([evalRes, optRes]) => {
        setEvalData(evalRes);
        setOptData(optRes);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div id="evaluation-section" className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full font-sans">
      {/* Evaluation Framework Panel */}
      <div className="dev-panel flex flex-col gap-3.5">
        <div className="flex justify-between items-center border-b border-[#34342D] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-[#E8E3D9] uppercase tracking-wider">EVALUATION REPORT</span>
            <span className="text-xs text-[#A9A59B] font-sans">/ Benchmark Suite</span>
          </div>
          {evalData && (
            <span className="badge badge-neutral font-mono text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4A8060] shadow-[0_0_6px_rgba(74,128,96,0.6)]"></span>
              {evalData.dataset_size} QUERIES
            </span>
          )}
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-6 gap-2 text-xs text-[#A9A59B] font-sans">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#A9A59B]" />
            Loading benchmark dataset...
          </div>
        ) : evalData ? (
          <div className="flex flex-col gap-3 text-xs">
            <div className="border border-[#34342D] rounded-[8px] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
              <table className="dev-table">
                <thead>
                  <tr className="bg-[#171814]">
                    <th className="text-[#A9A59B]">METRIC</th>
                    <th className="text-right w-24 text-[#A9A59B]">SCORE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#34342D]">
                    <td className="text-[#F1EDE4] font-sans">Precision@1</td>
                    <td className="text-right font-mono font-semibold text-[#F1EDE4]">{evalData.precision_at_1.toFixed(2)}</td>
                  </tr>
                  <tr className="border-b border-[#34342D]">
                    <td className="text-[#F1EDE4] font-sans">Recall@5</td>
                    <td className="text-right font-mono font-semibold text-[#F1EDE4]">{evalData.recall_at_5.toFixed(2)}</td>
                  </tr>
                  <tr className="border-b border-[#34342D]">
                    <td className="text-[#F1EDE4] font-sans">Groundedness</td>
                    <td className="text-right font-mono font-bold text-[#4A8060]">{(evalData.grounded_percentage * 100).toFixed(0)}%</td>
                  </tr>
                  <tr>
                    <td className="text-[#F1EDE4] font-sans">Answer Relevance</td>
                    <td className="text-right font-mono font-semibold text-[#F1EDE4]">{evalData.answer_relevance.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-[#A9A59B] bg-[#171814] p-2.5 rounded-[8px] border border-[#34342D] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
              <span>Avg input tokens: <strong className="text-[#F1EDE4]">{evalData.average_total_tokens}</strong></span>
              <span>Avg latency: <strong className="text-[#F1EDE4]">{evalData.average_total_latency_ms.toFixed(1)} ms</strong></span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-[#77746C] font-sans py-4 text-center">Unavailable</div>
        )}
      </div>

      {/* Optimization Experiment Benchmark */}
      <div className="dev-panel flex flex-col gap-3.5">
        <div className="flex justify-between items-center border-b border-[#34342D] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-[#E8E3D9] uppercase tracking-wider">EXPERIMENT BENCHMARK</span>
            <span className="text-xs text-[#A9A59B] font-sans">/ Dataset Metrics</span>
          </div>
          {optData && (
            <span className="badge badge-good font-mono text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4A8060] shadow-[0_0_6px_rgba(74,128,96,0.6)]"></span>
              -{optData.context_reduction.toFixed(1)}% Context
            </span>
          )}
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-6 gap-2 text-xs text-[#A9A59B] font-sans">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#A9A59B]" />
            Loading experiment metrics...
          </div>
        ) : optData ? (
          <div className="flex flex-col gap-3 text-xs font-sans">
            <div className="border border-[#34342D] rounded-[8px] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
              <table className="dev-table">
                <thead>
                  <tr className="bg-[#171814]">
                    <th className="text-[#A9A59B]">METRIC</th>
                    <th className="w-24 text-[#A9A59B]">BASIC</th>
                    <th className="w-24 text-[#A9A59B]">OPTIMIZED</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#34342D]">
                    <td className="text-[#F1EDE4] font-sans">Input Tokens</td>
                    <td className="font-mono text-xs text-[#F1EDE4]">{optData.basic.average_input_tokens.toFixed(1)}</td>
                    <td className="font-mono text-xs text-[#4A8060] font-bold">{optData.optimized.average_input_tokens.toFixed(1)}</td>
                  </tr>
                  <tr className="border-b border-[#34342D]">
                    <td className="text-[#F1EDE4] font-sans">Latency</td>
                    <td className="font-mono text-xs text-[#F1EDE4]">{optData.basic.average_total_latency_ms.toFixed(2)} ms</td>
                    <td className="font-mono text-xs text-[#4A8060] font-bold">{optData.optimized.average_total_latency_ms.toFixed(2)} ms</td>
                  </tr>
                  <tr className="bg-[#302019]/50">
                    <td className="text-[#E07A45] font-sans font-medium">Recall@5</td>
                    <td className="font-mono text-xs text-[#F1EDE4]">{optData.basic.recall_at_5.toFixed(2)}</td>
                    <td className="font-mono text-xs text-[#E07A45] font-bold">{optData.optimized.recall_at_5.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="text-[11px] text-[#A9A59B] bg-[#171814] border border-[#34342D] rounded-[8px] p-2.5 font-mono shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
              Evaluated on {optData.dataset_size} benchmark queries
            </div>
          </div>
        ) : (
          <div className="text-xs text-[#77746C] font-sans py-4 text-center">Unavailable</div>
        )}
      </div>
    </div>
  );
};





