import React, { useState } from 'react';
import { Play, ChevronDown, ChevronRight, AlertTriangle, Layers, Filter, Sparkles, Check, Shield, Activity, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import type { DebugResponse, RetrievalExperimentResponse, RetrievalExperimentConfigResult, CounterfactualResponse } from '../types/api';
import { debugApi } from '../api/debug';

interface AnalyzePageProps {
  data: DebugResponse | null;
  isLoading: boolean;
  error: string | null;
  onRunDebug: (query: string, topK: number, strategy?: string, threshold?: number) => void;
}

export const AnalyzePage: React.FC<AnalyzePageProps> = ({
  data,
  isLoading,
  error,
  onRunDebug,
}) => {
  const [query, setQuery] = useState(
    data?.query || 'What are the main benefits of retrieval-augmented generation?'
  );
  const [topK, setTopK] = useState(5);
  const [strategy, setStrategy] = useState<'standard' | 'filtered' | 'reranked'>('standard');
  const [similarityThreshold, setSimilarityThreshold] = useState(0.35);
  const [expandedChunkId, setExpandedChunkId] = useState<string | null>(null);
  const [expandedClaimIdx, setExpandedClaimIdx] = useState<number | null>(null);

  // Retrieval Experiment State
  const [isExpLoading, setIsExpLoading] = useState(false);
  const [expResults, setExpResults] = useState<RetrievalExperimentResponse | null>(null);
  const [expError, setExpError] = useState<string | null>(null);

  // Counterfactual Analysis State
  const [isCfLoading, setIsCfLoading] = useState(false);
  const [cfResults, setCfResults] = useState<CounterfactualResponse | null>(null);
  const [cfError, setCfError] = useState<string | null>(null);

  const handleRunCounterfactual = async () => {
    if (!query.trim()) return;
    setIsCfLoading(true);
    setCfError(null);
    try {
      const res = await debugApi.runCounterfactual(query, topK, strategy, similarityThreshold);
      setCfResults(res);
    } catch (err: any) {
      setCfError(err.response?.data?.detail || err.message || 'Failed to run counterfactual analysis');
    } finally {
      setIsCfLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onRunDebug(query, topK, strategy, similarityThreshold);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (query.trim() && !isLoading) {
        onRunDebug(query, topK, strategy, similarityThreshold);
      }
    }
  };

  const handleRunExperiment = async () => {
    if (!query.trim()) return;
    setIsExpLoading(true);
    setExpError(null);
    try {
      const res = await debugApi.runRetrievalExperiment(query, [
        { top_k: topK, strategy: 'standard', threshold: similarityThreshold },
        { top_k: topK, strategy: 'filtered', threshold: similarityThreshold },
        { top_k: topK, strategy: 'reranked', threshold: similarityThreshold }
      ]);
      setExpResults(res);
    } catch (err: any) {
      setExpError(err.response?.data?.detail || err.message || 'Failed to run retrieval experiment');
    } finally {
      setIsExpLoading(false);
    }
  };

  // Pipeline Trace Steps Data
  const hasSecurityFindings = Boolean(
    data?.security && (
      (data.security.finding_count && data.security.finding_count > 0) ||
      (data.security.affected_chunks && data.security.affected_chunks > 0) ||
      (data.security.risk_level && data.security.risk_level !== 'NONE' && data.security.risk_level !== 'CLEAN')
    )
  );

  const traceSteps = [
    {
      name: 'QUERY',
      status: data ? 'OK' : 'IDLE',
      latency: data
        ? (data.efficiency.query_latency_ms !== undefined && data.efficiency.query_latency_ms > 0
            ? (data.efficiency.query_latency_ms < 0.1 ? '<0.1 ms' : `${data.efficiency.query_latency_ms.toFixed(1)} ms`)
            : '<0.1 ms')
        : 'N/A',
      meta: `${query.length} chars`,
    },
    {
      name: 'EMBEDDING',
      status: data ? 'OK' : 'IDLE',
      latency: 'N/A',
      meta: data ? 'Incl. in RETRIEVAL' : '384 dims',
    },
    {
      name: 'RETRIEVAL',
      status: data ? (data.retrieval.results.length > 0 ? 'OK' : 'WARN') : 'IDLE',
      latency: data ? `${data.efficiency.retrieval_latency_ms.toFixed(1)} ms` : 'N/A',
      meta: data ? `${data.retrieval.strategy || strategy} (k=${data.retrieval.results.length})` : `k=${topK}`,
    },
    {
      name: 'CONTEXT',
      status: data ? 'OK' : 'IDLE',
      latency: data
        ? (data.efficiency.context_build_latency_ms !== undefined
            ? (data.efficiency.context_build_latency_ms < 0.1 ? '<0.1 ms' : `${data.efficiency.context_build_latency_ms.toFixed(1)} ms`)
            : '<0.1 ms')
        : 'N/A',
      meta: data ? `${data.efficiency.estimated_input_tokens} tokens` : '0 tok',
    },
    {
      name: 'SECURITY',
      status: data ? (hasSecurityFindings ? 'AFFECTED' : 'OK') : 'IDLE',
      latency: data
        ? (data.efficiency.security_latency_ms !== undefined
            ? (data.efficiency.security_latency_ms < 0.1 ? '<0.1 ms' : `${data.efficiency.security_latency_ms.toFixed(1)} ms`)
            : 'N/A')
        : 'N/A',
      meta: data ? `${data.security?.affected_chunks ?? data.security?.suspicious_chunks_count ?? 0} flagged` : '0 flagged',
    },
    {
      name: 'GENERATION',
      status: data ? 'OK' : 'IDLE',
      latency: data ? `${data.efficiency.generation_latency_ms.toFixed(1)} ms` : 'N/A',
      meta: data ? `${data.efficiency.estimated_output_tokens} tokens` : '0 tok',
    },
    {
      name: 'GROUNDING',
      status: data
        ? data.grounding.status.toUpperCase() === 'GROUNDED'
          ? 'OK'
          : data.grounding.status.toUpperCase().includes('PARTIAL') ? 'PARTIAL' : 'WARN'
        : 'IDLE',
      latency: data
        ? (data.efficiency.grounding_latency_ms !== undefined
            ? `${data.efficiency.grounding_latency_ms.toFixed(1)} ms`
            : 'N/A')
        : 'N/A',
      meta: data
        ? `${(data.grounding.supported_claims_count ?? data.grounding.supported_claims.length) + (data.grounding.partially_supported_claims_count ?? 0)}/${
            data.grounding.total_claims ?? (data.grounding.supported_claims.length + data.grounding.unsupported_claims.length)
          } claims`
        : '0 claims',
    },
  ];

  return (
    <div className="space-y-6 text-slate-900 font-sans pb-12">
      {/* HEADER SECTION */}
      <div className="dev-card bg-gradient-to-r from-white via-slate-50 to-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
              Analyze RAG Pipeline
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              WORKSTATION
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs text-slate-500 font-mono mt-1">
            <span>Query</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
            <span>Retrieval</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
            <span>Context</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
            <span>Generation</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
            <span>Diagnostics</span>
          </div>
        </div>

        {data?.run_id && (
          <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-[6px] font-mono text-xs">
            <span className="text-slate-500 font-medium">Persisted Run:</span>
            <span className="font-bold text-[#00288e]">{data.run_id}</span>
          </div>
        )}
      </div>

      {/* QUERY PLAYGROUND */}
      <form onSubmit={handleSubmit} className="dev-card space-y-4">
        <div className="flex items-center justify-between">
          <label htmlFor="rag-query-input" className="font-mono text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#00288e]" />
            <span>QUERY PLAYGROUND</span>
          </label>
          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">Ctrl + Enter to run</span>
        </div>

        <div>
          <textarea
            id="rag-query-input"
            rows={2}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a RAG query to inspect retrieval, grounding, efficiency, and pipeline behavior..."
            className="w-full bg-slate-50/50 border border-slate-300 rounded-[6px] p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#00288e] focus:bg-white focus:ring-1 focus:ring-[#00288e] transition-colors resize-y font-sans shadow-inner"
          />
        </div>

        {/* Controls Grid */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 pt-1 border-t border-slate-100">
          {/* Strategy Pills */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <span className="text-[11px] font-mono font-semibold text-slate-500 uppercase sm:mr-1 text-center sm:text-left">
              Strategy:
            </span>
            <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
            {[
              { id: 'standard', label: 'Standard', fullLabel: 'Standard Retrieval', icon: <Layers className="w-3.5 h-3.5" /> },
              { id: 'filtered', label: 'Filtered', fullLabel: 'Filtered Retrieval', icon: <Filter className="w-3.5 h-3.5" /> },
              { id: 'reranked', label: 'Reranked', fullLabel: 'Reranked Retrieval', icon: <Sparkles className="w-3.5 h-3.5" /> },
            ].map((strat) => {
              const active = strategy === strat.id;
              return (
                <button
                  key={strat.id}
                  type="button"
                  onClick={() => setStrategy(strat.id as any)}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[5px] text-xs font-medium border transition-colors min-h-[34px] ${
                    active
                      ? 'bg-[#00288e] text-white border-[#00288e] shadow-sm font-semibold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{strat.icon}</span>
                  <span className="hidden sm:inline">{strat.fullLabel}</span>
                  <span className="sm:hidden">{strat.label}</span>
                  {active && <Check className="w-3.5 h-3.5 ml-0.5" />}
                </button>
              );
            })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Top-K & Threshold inputs */}
            <div className="flex flex-row justify-center sm:justify-start items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <label htmlFor="top-k-input" className="text-slate-600 font-medium text-[11px]">Top-K:</label>
                <input
                  id="top-k-input"
                  type="number"
                  min={1}
                  max={20}
                  value={topK}
                  onChange={(e) => setTopK(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                  className="w-14 dev-input text-center py-1 min-h-[34px]"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <label htmlFor="sim-thresh-input" className="text-slate-600 font-medium text-[11px]">Threshold:</label>
                <input
                  id="sim-thresh-input"
                  type="number"
                  step="0.05"
                  min="0.0"
                  max="1.0"
                  value={similarityThreshold}
                  onChange={(e) => setSimilarityThreshold(Math.max(0, Math.min(1, parseFloat(e.target.value) || 0)))}
                  className="w-18 dev-input text-center py-1 min-h-[34px]"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                type="button"
                onClick={handleRunExperiment}
                disabled={isExpLoading || !query.trim()}
                className="btn-secondary min-h-[36px]"
              >
                {isExpLoading ? (
                  <span className="w-3 h-3 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Layers className="w-3.5 h-3.5 text-[#00288e]" />
                )}
                <span>Run Experiment</span>
              </button>

              <button
                type="button"
                onClick={handleRunCounterfactual}
                disabled={isCfLoading || !query.trim()}
                className="btn-secondary min-h-[36px]"
              >
                {isCfLoading ? (
                  <span className="w-3 h-3 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-[#00288e]" />
                )}
                <span>Run Counterfactual</span>
              </button>

              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="btn-primary min-h-[36px]"
              >
                {isLoading ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Executing...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Analysis</span>
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-[6px] p-3 text-xs text-rose-800 flex items-start gap-2.5 font-mono">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Execution Error:</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* 3-STRATEGY EXPERIMENT MATRIX */}
      {expError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-xs font-mono text-rose-700 rounded-[6px]">
          Experiment Error: {expError}
        </div>
      )}

      {expResults && (
        <div className="dev-card space-y-3 font-sans">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase text-slate-900 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-[#00288e]" />
                <span>3-STRATEGY RETRIEVAL EXPERIMENT MATRIX</span>
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Query: "{expResults.query}"
              </p>
            </div>
            <button
              onClick={() => setExpResults(null)}
              className="text-xs text-slate-400 hover:text-slate-600 font-mono"
            >
              [Close]
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-[6px]">
            <table className="dev-table font-mono">
              <thead>
                <tr>
                  <th>Strategy</th>
                  <th className="text-center">Candidates</th>
                  <th className="text-center">Retained</th>
                  <th className="text-center">Removed</th>
                  <th className="text-right">Input Tokens</th>
                  <th className="text-right">Total Tokens</th>
                  <th className="text-right">Latency</th>
                  <th>Grounding</th>
                  <th>Diagnosis</th>
                </tr>
              </thead>
              <tbody>
                {expResults.results.map((res: RetrievalExperimentConfigResult) => (
                  <tr key={res.strategy}>
                    <td className="font-bold text-[#00288e] uppercase">
                      {res.strategy}
                    </td>
                    <td className="text-center text-slate-700">{res.candidates}</td>
                    <td className="text-center font-bold text-emerald-700">{res.retained}</td>
                    <td className="text-center text-amber-700">{res.removed}</td>
                    <td className="text-right text-slate-800">{res.input_tokens}</td>
                    <td className="text-right text-slate-900 font-bold">{res.total_tokens}</td>
                    <td className="text-right text-slate-800">{res.total_latency_ms.toFixed(1)} ms</td>
                    <td>
                      <span className={`badge-status ${
                        res.grounding_status.toUpperCase() === 'GOOD' || res.grounding_status.toUpperCase() === 'PASS' || res.grounding_status.toUpperCase() === 'GROUNDED'
                          ? 'badge-good'
                          : 'badge-warn'
                      }`}>
                        {res.grounding_status}
                      </span>
                    </td>
                    <td className="text-slate-700 text-[11px] font-sans">
                      {res.diagnosis_category}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PIPELINE TRACE VISUALIZATION */}
      <div className="dev-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#00288e]" />
            <span>PIPELINE TRACE</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Execution Flow Telemetry</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
          {traceSteps.map((step, idx) => (
            <div
              key={step.name}
              className="relative bg-slate-50/80 border border-slate-200 rounded-[6px] p-2.5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="font-bold text-slate-800">{step.name}</span>
                <span
                  className={`badge-status text-[10px] px-1.5 py-0.2 ${
                    step.status === 'OK'
                      ? 'badge-good'
                      : step.status === 'WARN' || step.status === 'PARTIAL'
                      ? 'badge-warn'
                      : step.status === 'AFFECTED'
                      ? 'badge-danger'
                      : 'badge-neutral'
                  }`}
                >
                  {step.status}
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between text-xs font-mono text-slate-600">
                <span className="font-semibold text-slate-900">{step.latency}</span>
                <span className="text-[10px] text-slate-400">{step.meta}</span>
              </div>
              {idx < traceSteps.length - 1 && (
                <div className="hidden lg:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 text-slate-300 pointer-events-none">
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* RETRIEVAL INSPECTOR */}
      <div id="retrieval-inspector" className="dev-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
          <div>
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[#00288e]" />
              <span>RETRIEVED CONTEXT INSPECTOR</span>
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Strategy: <strong className="text-[#00288e] uppercase">{data?.retrieval_config?.strategy || strategy}</strong>
              {data?.retrieval && (
                <span className="ml-2">
                  · Retained: <strong className="text-emerald-700">{data.retrieval.retained ?? data.retrieval.results.length}</strong>
                  · Removed: <strong className="text-amber-700">{data.retrieval.removed ?? 0}</strong>
                </span>
              )}
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
            {data ? `${data.retrieval.results.length} chunks retrieved` : '0 chunks retrieved'}
          </span>
        </div>

        <div className="border border-slate-200 rounded-[6px] overflow-x-auto bg-white w-full">
          <table className="dev-table min-w-[650px] sm:min-w-full">
            <thead>
              <tr>
                <th className="w-14 text-center">Rank</th>
                <th className="w-16 text-center">Rerank</th>
                <th className="w-24 text-right">Retr Score</th>
                <th className="w-24 text-right">Rerank Score</th>
                <th className="w-36">Source</th>
                <th>Chunk Content Preview</th>
                <th className="w-24 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {data && data.retrieval.results.length > 0 ? (
                data.retrieval.results.map((res) => {
                  const isExpanded = expandedChunkId === res.chunk_id;
                  const origRank = res.original_rank ?? res.rank;
                  const rerankedRank = res.reranked_rank ?? res.rank;
                  const rawRetr = res.retrieval_score ?? res.similarity ?? 0;
                  const rawRerank = res.rerank_score ?? res.similarity ?? 0;
                  const retrScore = typeof rawRetr === 'number' ? rawRetr : 0;
                  const rerankScore = typeof rawRerank === 'number' ? rawRerank : 0;
                  const isRetained = res.retained !== false;

                  return (
                    <React.Fragment key={res.chunk_id}>
                      <tr
                        onClick={() =>
                          setExpandedChunkId(isExpanded ? null : res.chunk_id)
                        }
                        className={`cursor-pointer transition-colors ${
                          !isRetained ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="text-center font-mono text-slate-500 font-semibold">#{String(origRank).padStart(2, '0')}</td>
                        <td className="text-center font-mono font-bold text-[#00288e]">
                          #{String(rerankedRank).padStart(2, '0')}
                        </td>
                        <td className="text-right font-mono font-medium text-slate-700">
                          {retrScore.toFixed(4)}
                        </td>
                        <td className="text-right font-mono font-bold text-emerald-700">
                          {rerankScore.toFixed(4)}
                        </td>
                        <td className="font-mono text-slate-700 text-[11px] truncate max-w-[140px]">
                          {res.source}
                        </td>
                        <td className="text-slate-800 line-clamp-1 max-w-xs sm:max-w-xl font-sans">
                          <span className="flex items-center gap-1.5">
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span className="truncate text-xs font-normal">{res.text}</span>
                          </span>
                        </td>
                        <td className="text-right">
                          <span className={`badge-status ${isRetained ? 'badge-good' : 'badge-warn'}`}>
                            {isRetained ? 'RETAINED' : 'REMOVED'}
                          </span>
                        </td>
                      </tr>

                      {/* Expandable chunk details */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="bg-slate-50/80 p-3 sm:p-4 border-b border-slate-200 font-mono text-xs">
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 bg-white p-3 rounded-[6px] border border-slate-200 text-slate-700">
                                <div>
                                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Source File</div>
                                  <div className="text-slate-900 font-bold truncate mt-0.5">{res.source}</div>
                                </div>
                                <div>
                                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Chunk ID</div>
                                  <div className="text-slate-900 font-bold mt-0.5">{res.chunk_id}</div>
                                </div>
                                <div>
                                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Original Rank</div>
                                  <div className="text-slate-900 font-bold mt-0.5">#{origRank}</div>
                                </div>
                                <div>
                                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Reranked Rank</div>
                                  <div className="text-[#00288e] font-bold mt-0.5">#{rerankedRank}</div>
                                </div>
                                <div>
                                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Retrieval Score</div>
                                  <div className="text-slate-900 font-bold mt-0.5">{retrScore.toFixed(4)}</div>
                                </div>
                                <div>
                                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Rerank Score</div>
                                  <div className="text-emerald-700 font-bold mt-0.5">{rerankScore.toFixed(4)}</div>
                                </div>
                                <div>
                                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Status</div>
                                  <div className={`font-bold mt-0.5 ${isRetained ? 'text-emerald-700' : 'text-amber-700'}`}>
                                    {isRetained ? 'RETAINED' : 'REMOVED'}
                                  </div>
                                </div>
                              </div>

                              <div>
                                <div className="text-slate-400 text-[10px] uppercase font-semibold tracking-wider mb-1 font-mono">
                                  Full Context Content:
                                </div>
                                <div className="bg-white border border-slate-200 rounded-[6px] p-3 text-slate-800 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                                  {res.text}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 font-mono text-xs">
                    {isLoading ? 'Retrieving vector context...' : 'No retrieval results to display. Execute a query to inspect context.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GENERATED ANSWER & DIAGNOSTIC PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Left 7 Columns: Answer & Grounding Analysis */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-6 min-w-0">
          {/* Generated Answer Panel */}
          <div className="dev-card space-y-2">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#00288e]" />
              <span>GENERATED RESPONSE</span>
            </h2>
            <div className="bg-slate-50/60 border border-slate-200 rounded-[6px] p-4 text-xs text-slate-800 leading-relaxed font-sans min-h-[80px]">
              {data ? (
                data.answer
              ) : (
                <span className="text-slate-400 italic font-mono text-xs">
                  Execute a query to inspect the LLM response and claim attributions...
                </span>
              )}
            </div>
          </div>

          {/* Grounding Analysis Panel */}
          <div id="grounding-inspector" className="dev-card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>GROUNDING ANALYSIS</span>
              </h2>
              {data?.grounding && (
                <span className={`badge-status ${
                  data.grounding.status.toUpperCase() === 'GROUNDED' ? 'badge-good' :
                  data.grounding.status.toUpperCase().includes('PARTIAL') ? 'badge-warn' : 'badge-danger'
                }`}>
                  {data.grounding.status} ({Math.round((data.grounding.groundedness_score ?? 0) * 100)}%)
                </span>
              )}
            </div>

            {data?.grounding && (
              <div className="space-y-2 text-xs font-mono">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-[5px] border border-slate-200">
                  <span className="font-semibold text-slate-800">{data.grounding.total_claims ?? (data.grounding.claims?.length ?? (data.grounding.supported_claims.length + data.grounding.unsupported_claims.length))} claims</span>
                  <span className="text-emerald-700 font-bold">
                    ✓ {data.grounding.supported_claims_count ?? data.grounding.supported_claims.filter(c => (c.status || 'SUPPORTED') === 'SUPPORTED').length} Supported
                  </span>
                  <span className="text-amber-700 font-bold">
                    △ {data.grounding.partially_supported_claims_count ?? data.grounding.supported_claims.filter(c => c.status === 'PARTIALLY_SUPPORTED').length} Partial
                  </span>
                  <span className="text-rose-700 font-bold">
                    ✕ {data.grounding.unsupported_claims_count ?? data.grounding.unsupported_claims.length} Unsupported
                  </span>
                </div>
              </div>
            )}

            {/* Claims Table */}
            <div className="border border-slate-200 rounded-[6px] overflow-x-auto bg-white w-full">
              <table className="dev-table min-w-[500px] sm:min-w-full">
                <thead>
                  <tr>
                    <th>Extracted Claim</th>
                    <th className="w-28">Status</th>
                    <th className="w-24 text-right">Support</th>
                    <th className="w-36">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {data && (data.grounding.claims?.length || data.grounding.supported_claims.length > 0 || data.grounding.unsupported_claims.length > 0) ? (
                    (data.grounding.claims && data.grounding.claims.length > 0
                      ? data.grounding.claims
                      : [...data.grounding.supported_claims, ...data.grounding.unsupported_claims]
                    ).map((claim, idx) => {
                      const isExpanded = expandedClaimIdx === idx;
                      const claimStatus = claim.status || (claim.supported ? 'SUPPORTED' : 'UNSUPPORTED');
                      const mainSource = claim.evidence_source || (claim.supporting_chunks && claim.supporting_chunks.length > 0 ? claim.supporting_chunks[0].source : (claim.evidence_chunk_id ? claim.evidence_chunk_id : 'None'));

                      return (
                        <React.Fragment key={idx}>
                          <tr
                            onClick={() => setExpandedClaimIdx(isExpanded ? null : idx)}
                            className="cursor-pointer hover:bg-slate-50 transition-colors"
                          >
                            <td className="text-slate-800 font-medium font-sans">
                              <span className="flex items-center gap-1.5">
                                {isExpanded ? (
                                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                                )}
                                <span>"{claim.claim_text || claim.claim}"</span>
                              </span>
                            </td>
                            <td>
                              <span className={`badge-status ${
                                claimStatus === 'SUPPORTED' ? 'badge-good' :
                                claimStatus === 'PARTIALLY_SUPPORTED' ? 'badge-warn' : 'badge-danger'
                              }`}>
                                {claimStatus}
                              </span>
                            </td>
                            <td className="text-right font-mono font-semibold text-slate-700">
                              {claim.support_score ? claim.support_score.toFixed(4) : '0.0000'}
                            </td>
                            <td className="font-mono text-slate-600 text-[11px] truncate max-w-[140px]">
                              {mainSource}
                            </td>
                          </tr>

                          {/* Claim Details */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={4} className="bg-slate-50/80 p-3.5 border-b border-slate-200 text-xs">
                                <div className="space-y-3 bg-white p-3 rounded-[6px] border border-slate-200">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                                    <div>
                                      <div className="text-slate-400 text-[10px] uppercase font-semibold">Claim Status</div>
                                      <div className={`font-bold mt-0.5 uppercase ${
                                        claimStatus === 'SUPPORTED' ? 'text-emerald-700' :
                                        claimStatus === 'PARTIALLY_SUPPORTED' ? 'text-amber-700' : 'text-rose-700'
                                      }`}>
                                        {claimStatus}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-slate-400 text-[10px] uppercase font-semibold">Support Score</div>
                                      <div className="text-slate-900 font-bold mt-0.5">{claim.support_score ? claim.support_score.toFixed(4) : '0.0000'}</div>
                                    </div>
                                    <div>
                                      <div className="text-slate-400 text-[10px] uppercase font-semibold">Evidence Chunk</div>
                                      <div className="text-[#00288e] font-bold mt-0.5">{claim.evidence_chunk_id || 'None'}</div>
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-slate-400 text-[10px] uppercase font-semibold font-mono mb-1">
                                      Claim Text:
                                    </div>
                                    <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-slate-900 font-medium">
                                      "{claim.claim_text || claim.claim}"
                                    </div>
                                  </div>

                                  {/* Supporting Chunks */}
                                  <div>
                                    <div className="text-slate-400 text-[10px] uppercase font-semibold font-mono mb-1">
                                      Context Citation Evidence:
                                    </div>
                                    {claim.supporting_chunks && claim.supporting_chunks.length > 0 ? (
                                      <div className="space-y-2">
                                        {claim.supporting_chunks.map((sc, scIdx) => (
                                          <div key={scIdx} className="bg-emerald-50/50 border border-emerald-200 p-2.5 rounded-[5px] text-xs">
                                            <div className="flex items-center justify-between font-mono text-[11px] text-emerald-800 font-semibold mb-1">
                                              <span>Chunk: {sc.chunk_id} ({sc.source})</span>
                                              <span>Score: {sc.score.toFixed(4)}</span>
                                            </div>
                                            <div className="text-slate-800 font-sans text-xs italic">
                                              "{sc.text_snippet}"
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="bg-slate-100 p-2.5 rounded border border-slate-200 text-slate-500 font-mono text-[11px]">
                                        No context chunk provided sufficient support threshold for this claim.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-slate-400 font-mono text-xs">
                        {isLoading ? 'Evaluating claims...' : 'No claims evaluated yet. Execute a query to run grounding check.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Diagnostic Root Cause & Efficiency Telemetry */}
        <div className="lg:col-span-5 space-y-4 sm:space-y-6 min-w-0">
          {/* Diagnostic Panel */}
          <div className="dev-card space-y-3">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 flex items-center justify-between">
              <span>SYSTEM DIAGNOSIS & ROOT CAUSE</span>
              {data?.root_cause?.confidence && (
                <span className="badge-status badge-info">
                  {data.root_cause.confidence} CONFIDENCE
                </span>
              )}
            </h2>

            {data?.root_cause ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-[6px] border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-slate-500">PRIMARY ISSUE</span>
                    <span className="font-bold text-[#00288e] uppercase">{data.root_cause.primary_issue.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-slate-500">AFFECTED STAGE</span>
                    <span className="font-semibold text-slate-900">{data.root_cause.affected_stage}</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-[6px] border border-slate-200 space-y-1">
                  <div className="text-[10px] font-mono uppercase font-semibold text-slate-400">Diagnosis Detail</div>
                  <p className="text-slate-800 leading-relaxed font-sans">{data.root_cause.explanation}</p>
                </div>

                {data.root_cause.evidence && data.root_cause.evidence.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-mono uppercase font-semibold text-slate-400">Evidence</div>
                    <ul className="space-y-1">
                      {data.root_cause.evidence.map((ev, idx) => (
                        <li key={idx} className="p-2 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-700 flex items-start gap-1.5">
                          <span className="text-[#00288e] font-bold">•</span>
                          <span>{ev}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-400 font-mono italic py-4">
                Execute a query to calculate deterministic root cause diagnosis...
              </div>
            )}
          </div>

          {/* Efficiency Section */}
          <div id="efficiency-section" className="dev-card space-y-3 font-mono text-xs">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 flex items-center justify-between">
              <span>EFFICIENCY & TELEMETRY</span>
              <span className="text-[10px] text-slate-400 font-normal">Observability</span>
            </h2>

            <div className="grid grid-cols-3 gap-2 text-center pb-1">
              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <div className="text-[9px] uppercase text-slate-400">Input Tokens</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{data ? data.efficiency.estimated_input_tokens : 511}</div>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <div className="text-[9px] uppercase text-slate-400">Output Tokens</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{data ? data.efficiency.estimated_output_tokens : 22}</div>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <div className="text-[9px] uppercase text-slate-400">Total Tokens</div>
                <div className="text-sm font-bold text-[#00288e] mt-0.5">{data ? data.efficiency.total_estimated_tokens : 533}</div>
              </div>
            </div>

            <div className="space-y-1.5 border-t border-slate-100 pt-2 text-[11px]">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Retrieval Latency</span>
                <span className="text-slate-900 font-semibold">{data ? `${data.efficiency.retrieval_latency_ms.toFixed(1)} ms` : 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Security Latency</span>
                <span className="text-slate-900 font-semibold">{data ? `${(data.efficiency.security_latency_ms ?? 0).toFixed(1)} ms` : 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Generation Latency</span>
                <span className="text-slate-900 font-semibold">{data ? `${data.efficiency.generation_latency_ms.toFixed(1)} ms` : 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Grounding Latency</span>
                <span className="text-slate-900 font-semibold">{data ? `${(data.efficiency.grounding_latency_ms ?? 0).toFixed(1)} ms` : 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 font-bold text-slate-900">
                <span>Total Execution</span>
                <span className="text-[#00288e]">{data ? `${data.efficiency.total_latency_ms.toFixed(1)} ms` : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECURITY INSPECTOR */}
      <div id="security-inspector" className="dev-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#00288e]" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
              SECURITY SCAN CONSOLE
            </h2>
          </div>
          {data?.security && (
            <span className={`badge-status ${
              data.security.risk_level === 'HIGH' ? 'badge-danger' :
              data.security.risk_level === 'MEDIUM' ? 'badge-warn' : 'badge-good'
            }`}>
              RISK: {data.security.risk_level}
            </span>
          )}
        </div>

        {data?.security ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs font-mono">
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <div className="text-[10px] text-slate-400 uppercase">Scanned Chunks</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{data.security.retrieved_chunks_scanned}</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <div className="text-[10px] text-slate-400 uppercase">Safe Chunks</div>
                <div className="text-sm font-bold text-emerald-700 mt-0.5">{data.security.safe_chunks}</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <div className="text-[10px] text-slate-400 uppercase">Suspicious Chunks</div>
                <div className={`text-sm font-bold mt-0.5 ${data.security.affected_chunks > 0 ? 'text-rose-700' : 'text-slate-900'}`}>{data.security.affected_chunks}</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <div className="text-[10px] text-slate-400 uppercase">Matched Patterns</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{data.security.finding_count}</div>
              </div>
            </div>

            {/* Findings Table */}
            <div className="border border-slate-200 rounded-[6px] overflow-x-auto bg-white w-full">
              <table className="dev-table min-w-[550px] sm:min-w-full">
                <thead>
                  <tr>
                    <th className="w-24">Severity</th>
                    <th className="w-48">Threat Category</th>
                    <th className="w-36">Source</th>
                    <th>Matched Pattern Text</th>
                  </tr>
                </thead>
                <tbody>
                  {data.security.findings && data.security.findings.length > 0 ? (
                    data.security.findings.map((f, idx) => (
                      <tr key={idx}>
                        <td>
                          <span className={`badge-status ${f.severity === 'HIGH' ? 'badge-danger' : 'badge-warn'}`}>
                            {f.severity}
                          </span>
                        </td>
                        <td className="font-mono font-bold text-[#00288e]">{f.category}</td>
                        <td className="font-mono text-slate-600 text-[11px]">{f.source}</td>
                        <td className="font-mono text-rose-800 bg-rose-50/50 px-2 py-1 rounded text-xs">{f.matched_text}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-slate-400 font-mono text-xs">
                        No security threats or suspicious injection patterns detected in retrieved context.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 font-mono italic py-4">
            Execute a query to run security inspection console...
          </div>
        )}
      </div>

      {/* COUNTERFACTUAL ANALYSIS */}
      <div className="dev-card space-y-4 font-sans">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-2.5">
          <div>
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
              COUNTERFACTUAL STRATEGY EXPERIMENT ANALYSIS
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Evaluates 5 controlled retrieval strategies across the same query.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRunCounterfactual}
            disabled={isCfLoading || !query.trim()}
            className="btn-primary w-full sm:w-auto min-h-[36px]"
          >
            {isCfLoading ? (
              <span>Running controlled strategies...</span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run Counterfactual Analysis</span>
              </span>
            )}
          </button>
        </div>

        {cfError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-xs font-mono text-rose-700 rounded-[6px]">
            Counterfactual Error: {cfError}
          </div>
        )}

        {cfResults && (
          <div className="border border-slate-200 rounded-[6px] overflow-x-auto bg-white w-full">
            <table className="dev-table font-mono min-w-[600px] sm:min-w-full">
              <thead>
                <tr>
                  <th>Strategy</th>
                  <th className="text-center">Top-K</th>
                  <th className="text-center">Chunks</th>
                  <th className="text-right">Input Tokens</th>
                  <th className="text-right">Latency</th>
                  <th>Grounding</th>
                  <th>Retrieval Status</th>
                </tr>
              </thead>
              <tbody>
                {cfResults.counterfactual_runs.map((run, idx) => (
                  <tr key={idx} className={idx === 0 ? 'bg-slate-50/80 font-bold' : ''}>
                    <td className="font-bold text-slate-900">
                      {run.name} {idx === 0 && <span className="text-[10px] text-[#00288e] font-normal ml-1">(Original)</span>}
                    </td>
                    <td className="text-center text-slate-700">{run.top_k}</td>
                    <td className="text-center font-bold text-emerald-700">{run.retained_count}</td>
                    <td className="text-right text-slate-800">{run.input_tokens} tok</td>
                    <td className="text-right text-slate-900">{run.total_latency_ms.toFixed(1)} ms</td>
                    <td>
                      <span className={`badge-status ${run.grounding_status === 'GROUNDED' ? 'badge-good' : 'badge-warn'}`}>
                        {run.grounding_status}
                      </span>
                    </td>
                    <td className="text-slate-700 text-[11px]">
                      {run.diagnosis_category}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
