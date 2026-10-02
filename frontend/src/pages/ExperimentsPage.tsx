import React, { useEffect, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { evaluationApi } from '../api/evaluation';
import { debugApi } from '../api/debug';
import type { OptimizationExperimentResponse, CompareResponse } from '../types/api';

export const ExperimentsPage: React.FC = () => {
  const [expData, setExpData] = useState<OptimizationExperimentResponse | null>(null);
  const [compareData, setCompareData] = useState<CompareResponse | null>(null);
  const [testQuery, setTestQuery] = useState('What database is used for local storage in NookBase?');
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

  // Values directly from backend API (/api/experiments/optimization)
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
  const inputTokenReductionPct = basicTokens > 0 ? ((basicTokens - optTokens) / basicTokens) * 100 : 0;
  const latencyDiff = optLatency - basicLatency;
  const latencyReductionPct = basicLatency > 0 ? ((basicLatency - optLatency) / basicLatency) * 100 : 0;

  return (
    <div className="space-y-6 text-slate-900 font-sans pb-12">
      {/* Header */}
      <div className="dev-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-slate-900">
              Context Optimization Experiment Report
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              EXP-0842
            </span>
          </div>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Engineering trade-off evaluation: Standard Top-K Retrieval vs Optimized Context Threshold Pruning.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-[6px] border border-slate-200">
          <FlaskConical className="w-3.5 h-3.5 text-[#00288e]" />
          <span>Execution: <strong className="text-emerald-700">Completed</strong></span>
        </div>
      </div>

      {/* Primary Comparison Overview Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="dev-card bg-white border-l-4 border-l-slate-400 space-y-2">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="font-bold text-slate-700">BASIC RAG PIPELINE</span>
            <span className="text-slate-400">Standard Top-K</span>
          </div>
          <div className="grid grid-cols-3 gap-2 font-mono text-xs pt-1">
            <div>
              <span className="text-slate-400 text-[10px] block">Precision@1</span>
              <span className="font-bold text-slate-900">{expData ? basicP1.toFixed(2) : '...'}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Recall@5</span>
              <span className="font-bold text-slate-900">{expData ? basicR5.toFixed(2) : '...'}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Input Tokens</span>
              <span className="font-bold text-slate-900">{expData ? basicTokens.toFixed(1) : '...'}</span>
            </div>
          </div>
        </div>

        <div className="dev-card bg-white border-l-4 border-l-[#00288e] space-y-2">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="font-bold text-[#00288e]">OPTIMIZED RAG PIPELINE</span>
            <span className="text-slate-400">Threshold Pruned</span>
          </div>
          <div className="grid grid-cols-3 gap-2 font-mono text-xs pt-1">
            <div>
              <span className="text-slate-400 text-[10px] block">Precision@1</span>
              <span className="font-bold text-slate-900">{expData ? optP1.toFixed(2) : '...'}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Recall@5</span>
              <span className="font-bold text-amber-700">{expData ? optR5.toFixed(2) : '...'}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Input Tokens</span>
              <span className="font-bold text-emerald-700">{expData ? optTokens.toFixed(1) : '...'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Comparison Table */}
      <div className="dev-card space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
          STRATEGY COMPARISON MATRIX
        </h2>

        <div className="border border-slate-200 rounded-[6px] overflow-x-auto bg-white w-full">
          <table className="dev-table font-mono min-w-[550px] sm:min-w-full">
            <thead>
              <tr>
                <th>Metric / Dimension</th>
                <th className="text-right w-44">Basic Pipeline (Top-K)</th>
                <th className="text-right w-44">Optimized Pipeline</th>
                <th className="text-right w-44">Delta / Impact</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-bold text-slate-900">Precision@1</td>
                <td className="text-right text-slate-800">{expData ? basicP1.toFixed(2) : '...'}</td>
                <td className="text-right text-slate-800">{expData ? optP1.toFixed(2) : '...'}</td>
                <td className="text-right text-slate-500 font-semibold">
                  {expData ? (Math.abs(p1Delta) < 0.001 ? '0.00 (Neutral)' : `${p1Delta >= 0 ? '+' : ''}${p1Delta.toFixed(2)}`) : '...'}
                </td>
              </tr>
              <tr>
                <td className="font-bold text-slate-900">Recall@5</td>
                <td className="text-right text-slate-800">{expData ? basicR5.toFixed(2) : '...'}</td>
                <td className="text-right text-amber-700 font-bold">{expData ? optR5.toFixed(2) : '...'}</td>
                <td className="text-right text-amber-700 font-bold">
                  {expData ? `${recallDelta >= 0 ? '+' : ''}${recallDelta.toFixed(2)} (${recallDelta < 0 ? 'Recall drop' : 'Neutral'})` : '...'}
                </td>
              </tr>
              <tr>
                <td className="font-bold text-slate-900">Estimated Input Tokens</td>
                <td className="text-right text-slate-800">{expData ? basicTokens.toFixed(1) : '...'}</td>
                <td className="text-right text-emerald-700 font-bold">{expData ? optTokens.toFixed(1) : '...'}</td>
                <td className="text-right text-emerald-700 font-bold">
                  {expData ? `-${inputTokenReductionPct.toFixed(1)}%` : '...'}
                </td>
              </tr>
              <tr>
                <td className="font-bold text-slate-900">Total Latency</td>
                <td className="text-right text-slate-800">{expData ? `${basicLatency.toFixed(2)} ms` : '...'}</td>
                <td className="text-right text-emerald-700 font-bold">{expData ? `${optLatency.toFixed(2)} ms` : '...'}</td>
                <td className="text-right text-emerald-700 font-bold">
                  {expData ? `-${latencyReductionPct.toFixed(1)}% (${latencyDiff.toFixed(2)} ms)` : '...'}
                </td>
              </tr>
              <tr>
                <td className="font-bold text-slate-900">Context Reduction</td>
                <td className="text-right text-slate-500">0.0%</td>
                <td className="text-right text-[#00288e] font-bold">{expData ? `${contextReduction.toFixed(1)}%` : '...'}</td>
                <td className="text-right text-[#00288e] font-bold">{expData ? `+${contextReduction.toFixed(1)}%` : '...'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* TRADE-OFF ANALYSIS */}
      <div className="dev-card space-y-3 font-sans">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
          TRADE-OFF ANALYSIS & OBSERVATIONS
        </h2>
        <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
          <p>
            Pruning low-similarity context chunks yields a{' '}
            <strong className="text-emerald-700">
              {expData ? `${inputTokenReductionPct.toFixed(1)}% Input Token Reduction` : '...'}
            </strong>{' '}
            ({expData ? `${basicTokens.toFixed(1)} → ${optTokens.toFixed(1)}` : '...'}) and a{' '}
            <strong className="text-emerald-700">
              {expData ? `${contextReduction.toFixed(1)}% Context Reduction` : '...'}
            </strong>, while average execution latency achieved a{' '}
            <strong className="text-emerald-700">
              {expData ? `${latencyReductionPct.toFixed(1)}% Latency Reduction` : '...'}
            </strong>{' '}
            ({expData ? `${basicLatency.toFixed(2)} ms → ${optLatency.toFixed(2)} ms` : '...'}).
          </p>
          <p>
            However, filtering lower-ranked context chunks causes{' '}
            <strong className="text-amber-700">
              Recall@5 to change from {expData ? basicR5.toFixed(2) : '...'} to {expData ? optR5.toFixed(2) : '...'}
            </strong>{' '}
            (Recall delta: {expData ? `${recallDelta >= 0 ? '+' : ''}${recallDelta.toFixed(2)}` : '...'}) across the benchmark evaluation dataset.
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-[5px] font-mono text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
            <span>Recall Trade-off Vector:</span>
            <span className="font-bold">
              {expData ? `${basicR5.toFixed(2)} → ${optR5.toFixed(2)} (${recallDelta >= 0 ? '+' : ''}${recallDelta.toFixed(2)})` : '...'}
            </span>
          </div>
        </div>
      </div>

      {/* SINGLE QUERY DIFFERENTIAL */}
      <div className="dev-card space-y-3 font-sans">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
            LIVE SINGLE-QUERY DIFFERENTIAL TESTER
          </h2>
          <span className="text-xs text-slate-400 font-mono">Real-time side-by-side run</span>
        </div>

        <form onSubmit={handleRunCompare} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="Type a test query to run differential execution..."
            className="dev-input flex-1 min-h-[36px]"
          />
          <button
            type="submit"
            disabled={isComparing}
            className="btn-primary font-mono text-xs min-h-[36px]"
          >
            {isComparing ? 'Executing...' : 'Run Differential'}
          </button>
        </form>

        {compareData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 min-w-0">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-[6px] space-y-2">
              <div className="flex items-center justify-between font-mono text-xs border-b border-slate-200 pb-1.5">
                <span className="font-bold text-slate-700">BASIC PIPELINE</span>
                <span className="text-slate-500">{compareData.basic.latency_ms.toFixed(1)} ms</span>
              </div>
              <p className="text-xs text-slate-800 font-sans leading-relaxed">{compareData.basic.answer}</p>
              <div className="font-mono text-[11px] text-slate-500 pt-2 flex justify-between border-t border-slate-200">
                <span>Chunks: {compareData.basic.selected_chunks}</span>
                <span>Tokens: {compareData.basic.input_tokens}</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-[6px] space-y-2">
              <div className="flex items-center justify-between font-mono text-xs border-b border-slate-200 pb-1.5">
                <span className="font-bold text-[#00288e]">OPTIMIZED PIPELINE</span>
                <span className="text-emerald-700 font-bold">{compareData.optimized.latency_ms.toFixed(1)} ms</span>
              </div>
              <p className="text-xs text-slate-800 font-sans leading-relaxed">{compareData.optimized.answer}</p>
              <div className="font-mono text-[11px] text-slate-500 pt-2 flex justify-between border-t border-slate-200">
                <span>Chunks: {compareData.optimized.selected_chunks}</span>
                <span className="text-emerald-700 font-bold">Tokens: {compareData.optimized.input_tokens}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
