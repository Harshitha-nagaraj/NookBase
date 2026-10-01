import React, { useEffect, useState } from 'react';
import { FlaskConical, CheckCircle2 } from 'lucide-react';
import { evaluationApi } from '../api/evaluation';
import { debugApi } from '../api/debug';
import type { OptimizationExperimentResponse, CompareResponse } from '../types/api';

export const ExperimentsPage: React.FC = () => {
  const [expData, setExpData] = useState<OptimizationExperimentResponse | null>(null);
  const [compareData, setCompareData] = useState<CompareResponse | null>(null);
  const [testQuery, setTestQuery] = useState('What database is used for local storage in RAG Debugger?');
  const [isComparing, setIsComparing] = useState(false);

  useEffect(() => {
    evaluationApi.getOptimizationExperiment()
      .then((data) => setExpData(data))
      .catch((err) => console.error('Failed to fetch optimization experiment:', err));
  }, []);

  const handleRunCompare = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!testQuery.trim()) return;
    setIsComparing(true);
    try {
      const res = await debugApi.comparePipelines(testQuery, 5);
      setCompareData(res);
    } catch (err) {
      console.error('Failed to compare pipelines:', err);
    } finally {
      setIsComparing(false);
    }
  };

  // Values directly from backend API
  const basicP1 = expData?.basic?.precision_at_1 ?? 0;
  const optP1 = expData?.optimized?.precision_at_1 ?? 0;
  const basicR5 = expData?.basic?.recall_at_5 ?? 0;
  const optR5 = expData?.optimized?.recall_at_5 ?? 0;
  const basicTokens = expData?.basic?.average_input_tokens ?? 0;
  const optTokens = expData?.optimized?.average_input_tokens ?? 0;
  const basicLatency = expData?.basic?.average_total_latency_ms ?? 0;
  const optLatency = expData?.optimized?.average_total_latency_ms ?? 0;
  const contextReduction = expData?.context_reduction ?? 0;

  // Derived dynamic calculations
  const p1Delta = optP1 - basicP1;
  const recallDelta = optR5 - basicR5;
  const tokenReductionPct = basicTokens > 0 ? ((basicTokens - optTokens) / basicTokens) * 100 : 0;
  const latencyDiff = optLatency - basicLatency;
  const latencyPct = basicLatency > 0 ? ((basicLatency - optLatency) / basicLatency) * 100 : 0;

  return (
    <div className="space-y-6 text-zinc-900 font-sans pb-12">
      {/* Experiment Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-[#00288e] font-semibold uppercase tracking-wider mb-1">
          <FlaskConical className="w-4 h-4" />
          <span>EXPERIMENT RUN #EXP-0842</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">
          Context Optimization Experiment
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Engineering trade-off evaluation: Standard Top-K Retrieval vs Optimized Context Pruning.
        </p>
      </div>

      {/* Run Metadata */}
      <div className="bg-white border border-zinc-200 rounded-[3px] p-4 font-mono text-xs space-y-3">
        <div className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
          RUN METADATA
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-zinc-700">
          <div>
            <span className="text-zinc-400 block text-[10px]">Dataset Size</span>
            <span className="font-semibold text-zinc-900">{expData ? `${expData.dataset_size} questions` : '...'}</span>
          </div>
          <div>
            <span className="text-zinc-400 block text-[10px]">Embedding Model</span>
            <span className="font-semibold text-zinc-900">all-MiniLM-L6-v2</span>
          </div>
          <div>
            <span className="text-zinc-400 block text-[10px]">Evaluation Strategy</span>
            <span className="font-semibold text-zinc-900">Context Threshold Pruning</span>
          </div>
          <div>
            <span className="text-zinc-400 block text-[10px]">Execution Status</span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Complete
            </span>
          </div>
        </div>
      </div>

      {/* Strategy Comparison Table / Ledger */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
          Strategy Comparison
        </h2>
        <div className="border border-zinc-200 rounded-[3px] overflow-hidden bg-white">
          <table className="stitch-table">
            <thead>
              <tr>
                <th>Metric / Dimension</th>
                <th className="w-44 text-right">Basic Pipeline (Top-K)</th>
                <th className="w-44 text-right">Optimized Pipeline</th>
                <th className="w-36 text-right">Delta / Impact</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-medium text-zinc-900">Precision@1</td>
                <td className="text-right font-mono text-zinc-800">{expData ? basicP1.toFixed(2) : '...'}</td>
                <td className="text-right font-mono text-zinc-800">{expData ? optP1.toFixed(2) : '...'}</td>
                <td className="text-right font-mono text-zinc-500 font-semibold">
                  {expData ? (Math.abs(p1Delta) < 0.001 ? '0.00 (Neutral)' : `${p1Delta >= 0 ? '+' : ''}${p1Delta.toFixed(2)}`) : '...'}
                </td>
              </tr>
              <tr>
                <td className="font-medium text-zinc-900">Recall@5</td>
                <td className="text-right font-mono text-zinc-800">{expData ? basicR5.toFixed(2) : '...'}</td>
                <td className="text-right font-mono text-amber-700 font-semibold">{expData ? optR5.toFixed(2) : '...'}</td>
                <td className="text-right font-mono text-amber-700 font-semibold">
                  {expData ? `${recallDelta >= 0 ? '+' : ''}${recallDelta.toFixed(2)} (${recallDelta < 0 ? 'Recall drop' : 'Neutral'})` : '...'}
                </td>
              </tr>
              <tr>
                <td className="font-medium text-zinc-900">Estimated Input Tokens</td>
                <td className="text-right font-mono text-zinc-800">{expData ? basicTokens.toFixed(1) : '...'}</td>
                <td className="text-right font-mono text-emerald-700 font-semibold">{expData ? optTokens.toFixed(1) : '...'}</td>
                <td className="text-right font-mono text-emerald-700 font-semibold">
                  {expData ? `-${tokenReductionPct.toFixed(1)}%` : '...'}
                </td>
              </tr>
              <tr>
                <td className="font-medium text-zinc-900">Total Latency</td>
                <td className="text-right font-mono text-zinc-800">{expData ? `${basicLatency.toFixed(2)} ms` : '...'}</td>
                <td className="text-right font-mono text-emerald-700 font-semibold">{expData ? `${optLatency.toFixed(2)} ms` : '...'}</td>
                <td className="text-right font-mono text-emerald-700 font-semibold">
                  {expData ? `-${latencyPct.toFixed(1)}% (${latencyDiff.toFixed(2)} ms)` : '...'}
                </td>
              </tr>
              <tr>
                <td className="font-medium text-zinc-900">Context Reduction</td>
                <td className="text-right font-mono text-zinc-500">0.0%</td>
                <td className="text-right font-mono text-[#00288e] font-semibold">{expData ? `${contextReduction.toFixed(1)}%` : '...'}</td>
                <td className="text-right font-mono text-[#00288e] font-semibold">{expData ? `+${contextReduction.toFixed(1)}%` : '...'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Telemetry Report & Observed Trade-off */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Telemetry Ledger */}
        <div className="bg-white border border-zinc-200 rounded-[3px] p-4 space-y-3 font-mono text-xs">
          <div className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
            TELEMETRY REPORT
          </div>
          <div className="space-y-2 border-t border-zinc-100 pt-2">
            <div className="flex justify-between py-1">
              <span className="text-zinc-500">Input Token Reduction</span>
              <span className="text-emerald-700 font-semibold">{expData ? `${tokenReductionPct.toFixed(1)}% savings` : '...'}</span>
            </div>
            <div className="flex justify-between py-1 border-t border-zinc-100">
              <span className="text-zinc-500">Context Size Reduction</span>
              <span className="text-emerald-700 font-semibold">{expData ? `${contextReduction.toFixed(1)}% smaller context` : '...'}</span>
            </div>
            <div className="flex justify-between py-1 border-t border-zinc-100">
              <span className="text-zinc-500">Pipeline Latency Shift</span>
              <span className="text-emerald-700 font-semibold">{expData ? `${basicLatency.toFixed(2)} ms → ${optLatency.toFixed(2)} ms` : '...'}</span>
            </div>
            <div className="flex justify-between py-1 border-t border-zinc-100">
              <span className="text-zinc-500">First-Result Precision</span>
              <span className="text-zinc-800 font-semibold">
                {expData ? (Math.abs(p1Delta) < 0.001 ? `Unchanged (${basicP1.toFixed(2)})` : `${basicP1.toFixed(2)} → ${optP1.toFixed(2)}`) : '...'}
              </span>
            </div>
          </div>
        </div>

        {/* Observed Trade-off Section */}
        <div className="bg-white border border-zinc-200 rounded-[3px] p-4 space-y-3 font-sans text-xs">
          <div className="text-[10px] font-mono uppercase font-semibold text-zinc-400 tracking-wider">
            OBSERVED TRADE-OFF
          </div>
          <div className="space-y-2 text-zinc-700 leading-relaxed">
            <p>
              Pruning low-similarity context chunks yields a{' '}
              <strong className="text-emerald-700">
                {expData ? `${tokenReductionPct.toFixed(1)}% reduction in input tokens` : '...'}
              </strong>{' '}
              ({expData ? `${basicTokens.toFixed(1)} → ${optTokens.toFixed(1)}` : '...'}) and shifts average execution latency by{' '}
              <strong className="text-emerald-700">
                {expData ? `${Math.abs(latencyDiff).toFixed(2)} ms` : '...'}
              </strong>{' '}
              ({expData ? `${basicLatency.toFixed(2)} ms → ${optLatency.toFixed(2)} ms` : '...'}).
            </p>
            <p>
              However, filtering lower-ranked context chunks causes{' '}
              <strong className="text-amber-700">
                Recall@5 to change from {expData ? basicR5.toFixed(2) : '...'} to {expData ? optR5.toFixed(2) : '...'}
              </strong>{' '}
              across the evaluation benchmark dataset.
            </p>
            <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded font-mono text-[11px] text-amber-900 flex items-center justify-between">
              <span>Recall Trade-off Vector:</span>
              <span className="font-bold">
                {expData ? `${basicR5.toFixed(2)} → ${optR5.toFixed(2)} (${recallDelta >= 0 ? '+' : ''}${recallDelta.toFixed(2)})` : '...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <hr className="border-zinc-200" />

      {/* Query Differential Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
            Query Differential Inspection
          </h2>
          <span className="text-xs text-zinc-500 font-mono">Live single-query comparison (separate from 40-question benchmark averages above)</span>
        </div>

        <form onSubmit={handleRunCompare} className="flex gap-2">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="Type a test query to run differential..."
            className="flex-1 bg-white border border-zinc-300 rounded-[3px] px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-[#00288e]"
          />
          <button
            type="submit"
            disabled={isComparing}
            className="btn-primary"
          >
            {isComparing ? 'Comparing...' : 'Run Differential'}
          </button>
        </form>

        {compareData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Basic Pipeline Differential */}
            <div className="bg-white border border-zinc-200 rounded-[3px] p-4 space-y-2">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <span className="font-mono text-xs font-bold text-zinc-800">BASIC PIPELINE</span>
                <span className="font-mono text-[11px] text-zinc-500">{compareData.basic.latency_ms.toFixed(2)} ms</span>
              </div>
              <div className="text-xs text-zinc-800 font-sans leading-relaxed">
                {compareData.basic.answer}
              </div>
              <div className="font-mono text-[11px] text-zinc-500 pt-2 flex justify-between border-t border-zinc-100">
                <span>Chunks: {compareData.basic.selected_chunks}</span>
                <span>Tokens: {compareData.basic.input_tokens}</span>
              </div>
            </div>

            {/* Optimized Pipeline Differential */}
            <div className="bg-white border border-zinc-200 rounded-[3px] p-4 space-y-2">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <span className="font-mono text-xs font-bold text-[#00288e]">OPTIMIZED PIPELINE</span>
                <span className="font-mono text-[11px] text-emerald-700 font-semibold">{compareData.optimized.latency_ms.toFixed(2)} ms</span>
              </div>
              <div className="text-xs text-zinc-800 font-sans leading-relaxed">
                {compareData.optimized.answer}
              </div>
              <div className="font-mono text-[11px] text-zinc-500 pt-2 flex justify-between border-t border-zinc-100">
                <span>Chunks: {compareData.optimized.selected_chunks}</span>
                <span className="text-emerald-700 font-semibold">Tokens: {compareData.optimized.input_tokens}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <hr className="border-zinc-200" />

      {/* Decision / Summary Section */}
      <div className="bg-white border border-zinc-200 rounded-[3px] p-4 space-y-2 font-sans text-xs">
        <h3 className="font-semibold text-zinc-900 text-sm">Engineering Summary</h3>
        <p className="text-zinc-600 leading-relaxed">
          The experiment measured a {expData ? `${tokenReductionPct.toFixed(1)}%` : '...'} reduction in estimated input tokens ({expData ? `${basicTokens.toFixed(1)} → ${optTokens.toFixed(1)}` : '...'}) and a context size reduction of {expData ? `${contextReduction.toFixed(1)}%` : '...'} after pruning lower-similarity chunks. Average pipeline total latency shifted by {expData ? `${latencyDiff.toFixed(2)} ms` : '...'} ({expData ? `${basicLatency.toFixed(2)} ms → ${optLatency.toFixed(2)} ms` : '...'}). This efficiency was accompanied by a trade-off in Recall@5 from {expData ? basicR5.toFixed(2) : '...'} to {expData ? optR5.toFixed(2) : '...'} ({expData ? `${recallDelta >= 0 ? '+' : ''}${recallDelta.toFixed(2)}` : '...'}), while top-1 precision remained at {expData ? basicP1.toFixed(2) : '...'} (Precision@1).
        </p>
      </div>
    </div>
  );
};
