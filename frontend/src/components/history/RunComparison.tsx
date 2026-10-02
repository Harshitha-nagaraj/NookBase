import React from 'react';
import { ArrowLeft, Layers } from 'lucide-react';
import type { RunDetailResponse } from '../../types/api';

interface RunComparisonProps {
  run1: RunDetailResponse;
  run2: RunDetailResponse;
  onBack: () => void;
}

export const RunComparison: React.FC<RunComparisonProps> = ({ run1, run2, onBack }) => {
  const formatDiff = (v1: number, v2: number, unit = '', lowerIsBetter = false) => {
    const diff = v2 - v1;
    if (diff === 0) return <span className="text-zinc-400 font-mono text-[11px]">0</span>;
    const isBetter = lowerIsBetter ? diff < 0 : diff > 0;
    const sign = diff > 0 ? '+' : '';
    return (
      <span
        className={`font-mono text-[11px] font-semibold ${
          isBetter ? 'text-emerald-600' : 'text-amber-600'
        }`}
      >
        {sign}{diff.toFixed(1)}{unit}
      </span>
    );
  };

  const metrics = [
    {
      label: 'Top-K Configuration',
      val1: run1.top_k,
      val2: run2.top_k,
      formattedVal1: run1.top_k,
      formattedVal2: run2.top_k,
      diff: formatDiff(run1.top_k, run2.top_k),
    },
    {
      label: 'Chunks Retrieved',
      val1: run1.retrieved_chunks?.length || 0,
      val2: run2.retrieved_chunks?.length || 0,
      formattedVal1: run1.retrieved_chunks?.length || 0,
      formattedVal2: run2.retrieved_chunks?.length || 0,
      diff: formatDiff(run1.retrieved_chunks?.length || 0, run2.retrieved_chunks?.length || 0),
    },
    {
      label: 'Input Tokens',
      val1: run1.estimated_input_tokens || 0,
      val2: run2.estimated_input_tokens || 0,
      formattedVal1: run1.estimated_input_tokens || 0,
      formattedVal2: run2.estimated_input_tokens || 0,
      diff: formatDiff(run1.estimated_input_tokens || 0, run2.estimated_input_tokens || 0, '', true),
    },
    {
      label: 'Output Tokens',
      val1: run1.estimated_output_tokens || 0,
      val2: run2.estimated_output_tokens || 0,
      formattedVal1: run1.estimated_output_tokens || 0,
      formattedVal2: run2.estimated_output_tokens || 0,
      diff: formatDiff(run1.estimated_output_tokens || 0, run2.estimated_output_tokens || 0),
    },
    {
      label: 'Total Tokens',
      val1: run1.estimated_total_tokens || 0,
      val2: run2.estimated_total_tokens || 0,
      formattedVal1: run1.estimated_total_tokens || 0,
      formattedVal2: run2.estimated_total_tokens || 0,
      diff: formatDiff(run1.estimated_total_tokens || 0, run2.estimated_total_tokens || 0, '', true),
    },
    {
      label: 'Retrieval Latency',
      val1: run1.retrieval_latency_ms || 0,
      val2: run2.retrieval_latency_ms || 0,
      formattedVal1: `${(run1.retrieval_latency_ms || 0).toFixed(1)} ms`,
      formattedVal2: `${(run2.retrieval_latency_ms || 0).toFixed(1)} ms`,
      diff: formatDiff(run1.retrieval_latency_ms || 0, run2.retrieval_latency_ms || 0, ' ms', true),
    },
    {
      label: 'Generation Latency',
      val1: run1.generation_latency_ms || 0,
      val2: run2.generation_latency_ms || 0,
      formattedVal1: `${(run1.generation_latency_ms || 0).toFixed(1)} ms`,
      formattedVal2: `${(run2.generation_latency_ms || 0).toFixed(1)} ms`,
      diff: formatDiff(run1.generation_latency_ms || 0, run2.generation_latency_ms || 0, ' ms', true),
    },
    {
      label: 'Total Latency',
      val1: run1.total_latency_ms || 0,
      val2: run2.total_latency_ms || 0,
      formattedVal1: `${(run1.total_latency_ms || 0).toFixed(1)} ms`,
      formattedVal2: `${(run2.total_latency_ms || 0).toFixed(1)} ms`,
      diff: formatDiff(run1.total_latency_ms || 0, run2.total_latency_ms || 0, ' ms', true),
    },
    {
      label: 'Grounding Status',
      val1: run1.grounding_status,
      val2: run2.grounding_status,
      formattedVal1: run1.grounding_status,
      formattedVal2: run2.grounding_status,
      diff: '—',
    },
    {
      label: 'Overall Diagnosis',
      val1: run1.failure_category,
      val2: run2.failure_category,
      formattedVal1: run1.failure_category,
      formattedVal2: run2.failure_category,
      diff: '—',
    },
  ];

  return (
    <div className="space-y-4 font-sans pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-200 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors min-h-[34px]"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-zinc-500" />
            <span>Back to History</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#00288e]" />
              <h2 className="text-base font-bold text-zinc-900">Run Comparison</h2>
            </div>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Side-by-side technical comparison between run history records
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-1 bg-white border border-zinc-200 rounded font-semibold text-[#00288e]">
            {run1.run_id}
          </span>
          <span className="text-zinc-400">vs</span>
          <span className="px-2.5 py-1 bg-white border border-zinc-200 rounded font-semibold text-[#00288e]">
            {run2.run_id}
          </span>
        </div>
      </div>

      {/* Query Comparison Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-3 bg-white rounded border border-zinc-200 space-y-1">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase font-semibold text-zinc-400">
            <span>Query ({run1.run_id})</span>
            <span>{run1.timestamp}</span>
          </div>
          <div className="text-xs font-medium text-zinc-900">"{run1.query}"</div>
        </div>
        <div className="p-3 bg-white rounded border border-zinc-200 space-y-1">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase font-semibold text-zinc-400">
            <span>Query ({run2.run_id})</span>
            <span>{run2.timestamp}</span>
          </div>
          <div className="text-xs font-medium text-zinc-900">"{run2.query}"</div>
        </div>
      </div>

      {/* Technical Metrics Comparison Table */}
      <div className="bg-white rounded border border-zinc-200 overflow-x-auto w-full">
        <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200 font-mono text-xs font-bold text-zinc-800 uppercase tracking-wider">
          Technical Metrics Comparison
        </div>
        <table className="w-full text-left border-collapse font-sans text-xs min-w-[500px] sm:min-w-full">
          <thead>
            <tr className="bg-zinc-50/50 border-b border-zinc-200 font-mono text-[11px] uppercase text-zinc-500">
              <th className="py-2 px-4 font-semibold">Metric</th>
              <th className="py-2 px-4 font-semibold text-[#00288e]">{run1.run_id}</th>
              <th className="py-2 px-4 font-semibold text-[#00288e]">{run2.run_id}</th>
              <th className="py-2 px-4 font-semibold">Delta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {metrics.map((m, idx) => (
              <tr key={idx} className="hover:bg-zinc-50/60">
                <td className="py-2.5 px-4 font-medium text-zinc-800">{m.label}</td>
                <td className="py-2.5 px-4 font-mono font-medium text-zinc-900">{m.formattedVal1}</td>
                <td className="py-2.5 px-4 font-mono font-medium text-zinc-900">{m.formattedVal2}</td>
                <td className="py-2.5 px-4">{m.diff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Generated Answer Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded border border-zinc-200 space-y-2">
          <div className="text-[10px] font-mono font-semibold uppercase text-zinc-400">
            ANSWER ({run1.run_id})
          </div>
          <div className="text-xs text-zinc-800 leading-relaxed bg-zinc-50 p-3 rounded border border-zinc-100">
            {run1.generated_answer || 'No answer'}
          </div>
        </div>

        <div className="p-4 bg-white rounded border border-zinc-200 space-y-2">
          <div className="text-[10px] font-mono font-semibold uppercase text-zinc-400">
            ANSWER ({run2.run_id})
          </div>
          <div className="text-xs text-zinc-800 leading-relaxed bg-zinc-50 p-3 rounded border border-zinc-100">
            {run2.generated_answer || 'No answer'}
          </div>
        </div>
      </div>
    </div>
  );
};
