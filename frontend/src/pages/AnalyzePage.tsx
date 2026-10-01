import React, { useState } from 'react';
import { Play, ChevronDown, ChevronRight, AlertTriangle, Layers, Filter, Sparkles, Check, Shield } from 'lucide-react';
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
  const [expandedSecurityIdx, setExpandedSecurityIdx] = useState<number | null>(null);

  // Retrieval Experiment State
  const [isExpLoading, setIsExpLoading] = useState(false);
  const [expResults, setExpResults] = useState<RetrievalExperimentResponse | null>(null);
  const [expError, setExpError] = useState<string | null>(null);

  // Counterfactual Analysis State
  const [isCfLoading, setIsCfLoading] = useState(false);
  const [cfResults, setCfResults] = useState<CounterfactualResponse | null>(null);
  const [cfError, setCfError] = useState<string | null>(null);
  const [expandedCfIdx, setExpandedCfIdx] = useState<number | null>(null);

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
      (data.security.risk_level && data.security.risk_level !== 'NONE')
    )
  );

  const traceSteps = [
    {
      name: 'QUERY',
      status: 'OK',
      latency: '0.8ms',
      meta: `${query.length} chars`,
    },
    {
      name: 'EMBEDDING',
      status: 'OK',
      latency: '12.4ms',
      meta: '384 dims',
    },
    {
      name: 'RETRIEVAL',
      status: data ? (data.retrieval.results.length > 0 ? 'OK' : 'WARN') : 'IDLE',
      latency: data ? `${data.efficiency.retrieval_latency_ms.toFixed(1)}ms` : '14.2ms',
      meta: data ? `${data.retrieval.strategy || strategy} (k=${data.retrieval.results.length})` : `k=${topK}`,
    },
    {
      name: 'CONTEXT',
      status: data ? 'OK' : 'IDLE',
      latency: '2.1ms',
      meta: data ? `${data.efficiency.estimated_input_tokens} tokens` : '1864 chars',
    },
    {
      name: 'SECURITY',
      status: data ? (hasSecurityFindings ? 'AFFECTED' : 'OK') : 'IDLE',
      latency: '1.5ms',
      meta: data ? `${data.security?.affected_chunks ?? data.security?.suspicious_chunks_count ?? 0} flagged` : '0 flagged',
    },
    {
      name: 'GENERATION',
      status: data ? 'OK' : 'IDLE',
      latency: data ? `${data.efficiency.generation_latency_ms.toFixed(1)}ms` : '18.5ms',
      meta: data ? `${data.efficiency.estimated_output_tokens} tokens` : 'out=85 tks',
    },
    {
      name: 'GROUNDING',
      status: data
        ? data.grounding.status.toUpperCase() === 'GROUNDED'
          ? 'OK'
          : data.grounding.status.toUpperCase().includes('PARTIAL') ? 'PARTIAL' : 'WARN'
        : 'IDLE',
      latency: '5.2ms',
      meta: data
        ? `${(data.grounding.supported_claims_count ?? data.grounding.supported_claims.length) + (data.grounding.partially_supported_claims_count ?? 0)}/${
            data.grounding.total_claims ?? (data.grounding.supported_claims.length + data.grounding.unsupported_claims.length)
          } claims`
        : '0 claims',
    },
  ];

  return (
    <div className="space-y-6 text-zinc-900 font-sans pb-12">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">Query Playground & Retrieval Tuning</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Configure Top-K, similarity thresholds, and reranking to analyze impact on retrieval, context, grounding, and latency.
          </p>
        </div>
        {data?.run_id && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded font-mono text-xs">
            <span className="text-zinc-500 font-medium">Persisted Run:</span>
            <span className="font-bold text-[#00288e]">{data.run_id}</span>
          </div>
        )}
      </div>

      {/* Query Input & Strategy Playground */}
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded border border-zinc-200">
        <div className="flex items-center justify-between">
          <label htmlFor="rag-query-input" className="font-mono text-xs font-semibold text-zinc-700 uppercase tracking-wider">
            QUERY PLAYGROUND
          </label>
          <span className="text-[11px] font-mono text-zinc-400">Press Cmd+Enter or click Run</span>
        </div>

        <div>
          <textarea
            id="rag-query-input"
            rows={2}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a query to debug retrieval, filtering, and reranking..."
            className="w-full bg-zinc-50 border border-zinc-300 rounded-[4px] p-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#00288e] focus:bg-white focus:ring-1 focus:ring-[#00288e] transition-colors resize-y font-sans shadow-none"
          />
        </div>

        {/* Strategy Buttons Selector */}
        <div className="space-y-1.5 pt-1">
          <div className="text-[10px] font-mono font-semibold text-zinc-500 uppercase tracking-wider">
            RETRIEVAL STRATEGY
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'standard', label: 'Standard Retrieval', desc: 'Default vector search', icon: <Layers className="w-3.5 h-3.5" /> },
              { id: 'filtered', label: 'Filtered Retrieval', desc: 'Remove chunks below threshold', icon: <Filter className="w-3.5 h-3.5" /> },
              { id: 'reranked', label: 'Reranked Retrieval', desc: 'Local cosine + lexical rerank', icon: <Sparkles className="w-3.5 h-3.5" /> },
            ].map((strat) => {
              const active = strategy === strat.id;
              return (
                <button
                  key={strat.id}
                  type="button"
                  onClick={() => setStrategy(strat.id as any)}
                  className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-[#00288e] text-white border-[#00288e]'
                      : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  <span>{strat.icon}</span>
                  <span>{strat.label}</span>
                  {active && <Check className="w-3.5 h-3.5 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Controls Bar: Top-K & Threshold */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-zinc-100">
          <div className="flex items-center gap-5 text-xs text-zinc-600 font-sans">
            <div className="flex items-center gap-2">
              <label htmlFor="top-k-input" className="text-zinc-700 font-medium font-mono text-[11px]">Top-K (1–20):</label>
              <input
                id="top-k-input"
                type="number"
                min={1}
                max={20}
                value={topK}
                onChange={(e) => setTopK(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                className="w-16 bg-white border border-zinc-300 rounded px-2 py-1 font-mono text-xs text-zinc-900 focus:outline-none focus:border-[#00288e]"
              />
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="sim-thresh-input" className="text-zinc-700 font-medium font-mono text-[11px]">Similarity Threshold (0.0–1.0):</label>
              <input
                id="sim-thresh-input"
                type="number"
                step="0.05"
                min="0.0"
                max="1.0"
                value={similarityThreshold}
                onChange={(e) => setSimilarityThreshold(Math.max(0, Math.min(1, parseFloat(e.target.value) || 0)))}
                className="w-20 bg-white border border-zinc-300 rounded px-2 py-1 font-mono text-xs text-zinc-900 focus:outline-none focus:border-[#00288e]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRunExperiment}
              disabled={isExpLoading || !query.trim()}
              className="px-3.5 py-2 text-xs font-medium text-zinc-700 bg-zinc-100 border border-zinc-300 rounded hover:bg-zinc-200 transition-colors flex items-center gap-1.5"
            >
              {isExpLoading ? (
                <span className="w-3 h-3 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Layers className="w-3.5 h-3.5 text-[#00288e]" />
              )}
              <span>Run 3-Strategy Experiment</span>
            </button>

            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="bg-[#00288e] text-white hover:bg-[#001f70] py-2 px-4 rounded text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              {isLoading ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Executing Pipeline...</span>
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
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-800 flex items-start gap-2 font-mono">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Execution Error:</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* 3-STRATEGY RETRIEVAL EXPERIMENT COMPARISON */}
      {expError && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs font-mono text-red-700 rounded">
          Experiment Error: {expError}
        </div>
      )}

      {expResults && (
        <div className="bg-white rounded border border-zinc-200 p-4 space-y-3 font-sans">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#00288e]" />
                <span>Retrieval Strategy Experiment Results</span>
              </h3>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                Multi-strategy evaluation for query: "{expResults.query}"
              </p>
            </div>
            <button
              onClick={() => setExpResults(null)}
              className="text-xs text-zinc-400 hover:text-zinc-600 font-mono"
            >
              Close
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 font-mono text-[11px] uppercase text-zinc-500">
                  <th className="py-2.5 px-3 font-semibold">Strategy</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Candidates</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Retained</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Removed</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Input Tokens</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Total Tokens</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Latency</th>
                  <th className="py-2.5 px-3 font-semibold">Grounding</th>
                  <th className="py-2.5 px-3 font-semibold">Diagnosis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {expResults.results.map((res: RetrievalExperimentConfigResult) => (
                  <tr key={res.strategy} className="hover:bg-zinc-50/60 font-mono">
                    <td className="py-2.5 px-3 font-bold text-[#00288e] uppercase">
                      {res.strategy}
                    </td>
                    <td className="py-2.5 px-3 text-center text-zinc-700">{res.candidates}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-700">{res.retained}</td>
                    <td className="py-2.5 px-3 text-center text-amber-700">{res.removed}</td>
                    <td className="py-2.5 px-3 text-right text-zinc-800">{res.input_tokens}</td>
                    <td className="py-2.5 px-3 text-right text-zinc-900 font-bold">{res.total_tokens}</td>
                    <td className="py-2.5 px-3 text-right text-zinc-800">{res.total_latency_ms.toFixed(1)} ms</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        res.grounding_status.toUpperCase() === 'GOOD' || res.grounding_status.toUpperCase() === 'PASS'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {res.grounding_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-700 text-[11px] font-sans">
                      {res.diagnosis_category}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PIPELINE TRACE */}
      <div className="pt-2 border-t border-zinc-200">
        <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider font-semibold mb-3">
          PIPELINE TRACE
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {traceSteps.map((step) => (
            <div
              key={step.name}
              className="bg-white border border-zinc-200 rounded p-2.5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="font-semibold text-zinc-800">{step.name}</span>
                <span
                  className={`text-[10px] px-1 py-0.2 rounded ${
                    step.status === 'OK'
                      ? 'bg-emerald-50 text-emerald-700 font-semibold'
                      : step.status === 'WARN' || step.status === 'PARTIAL'
                      ? 'bg-amber-50 text-amber-700 font-semibold'
                      : 'bg-zinc-100 text-zinc-500'
                  }`}
                >
                  {step.status}
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between text-xs font-mono text-zinc-500">
                <span>{step.latency}</span>
                <span className="text-[10px] text-zinc-400">{step.meta}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <hr className="border-zinc-200" />

      {/* RETRIEVAL INSPECTOR TABLE */}
      <div id="retrieval-inspector" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
              Retrieval Inspector
            </h2>
            <p className="text-xs text-zinc-500 font-mono">
              Strategy: <strong className="text-[#00288e] uppercase">{data?.retrieval_config?.strategy || strategy}</strong>
              {data?.retrieval && (
                <span className="ml-2">
                  · Candidates: <strong>{data.retrieval.candidates ?? data.retrieval.results.length}</strong>
                  · Retained: <strong className="text-emerald-700">{data.retrieval.retained ?? data.retrieval.results.length}</strong>
                  · Removed: <strong className="text-amber-700">{data.retrieval.removed ?? 0}</strong>
                </span>
              )}
            </p>
          </div>
          <span className="text-xs text-zinc-500 font-mono">
            {data ? `${data.retrieval.results.length} chunks available` : 'No run executed'}
          </span>
        </div>

        <div className="border border-zinc-200 rounded overflow-hidden bg-white">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 font-mono text-[11px] uppercase text-zinc-500">
                <th className="py-2.5 px-3 w-14 text-center">Orig Rank</th>
                <th className="py-2.5 px-3 w-16 text-center">Rerank</th>
                <th className="py-2.5 px-3 w-24">Retr. Score</th>
                <th className="py-2.5 px-3 w-24">Rerank Score</th>
                <th className="py-2.5 px-3 w-36">Source</th>
                <th className="py-2.5 px-3">Chunk Text Preview</th>
                <th className="py-2.5 px-3 w-24 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-sans">
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
                          !isRetained ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-zinc-50'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center font-mono text-zinc-500">#{origRank}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-[#00288e]">
                          #{rerankedRank}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-medium text-zinc-700">
                          {retrScore.toFixed(4)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                          {rerankScore.toFixed(4)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-zinc-700 text-[11px] truncate max-w-[140px]">
                          {res.source}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-800 line-clamp-1 max-w-xl">
                          <span className="flex items-center gap-1.5">
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            )}
                            <span className="truncate">{res.text}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              isRetained
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {isRetained ? 'RETAINED' : 'REMOVED'}
                          </span>
                        </td>
                      </tr>

                      {/* Expandable row detail */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="bg-zinc-50 p-4 border-b border-zinc-200 font-mono text-xs">
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 bg-white p-3 rounded border border-zinc-200 text-zinc-700">
                                <div>
                                  <div className="text-zinc-400 text-[10px] uppercase font-semibold">Source Document</div>
                                  <div className="text-zinc-900 font-bold truncate mt-0.5">{res.source}</div>
                                </div>
                                <div>
                                  <div className="text-zinc-400 text-[10px] uppercase font-semibold">Chunk ID</div>
                                  <div className="text-zinc-900 font-bold mt-0.5">{res.chunk_id}</div>
                                </div>
                                <div>
                                  <div className="text-zinc-400 text-[10px] uppercase font-semibold">Original Rank</div>
                                  <div className="text-zinc-900 font-bold mt-0.5">#{origRank}</div>
                                </div>
                                <div>
                                  <div className="text-zinc-400 text-[10px] uppercase font-semibold">Reranked Rank</div>
                                  <div className="text-[#00288e] font-bold mt-0.5">#{rerankedRank}</div>
                                </div>
                                <div>
                                  <div className="text-zinc-400 text-[10px] uppercase font-semibold">Retrieval Score</div>
                                  <div className="text-zinc-900 font-bold mt-0.5">{retrScore.toFixed(4)}</div>
                                </div>
                                <div>
                                  <div className="text-zinc-400 text-[10px] uppercase font-semibold">Rerank Score</div>
                                  <div className="text-emerald-700 font-bold mt-0.5">{rerankScore.toFixed(4)}</div>
                                </div>
                                <div>
                                  <div className="text-zinc-400 text-[10px] uppercase font-semibold">Status</div>
                                  <div className={`font-bold mt-0.5 ${isRetained ? 'text-emerald-700' : 'text-amber-700'}`}>
                                    {isRetained ? 'RETAINED' : 'REMOVED'}
                                  </div>
                                </div>
                              </div>

                              <div>
                                <div className="text-zinc-400 text-[10px] uppercase font-semibold tracking-wider mb-1">
                                  Full Chunk Text:
                                </div>
                                <div className="bg-white border border-zinc-200 rounded p-3 text-zinc-800 font-mono text-xs whitespace-pre-wrap leading-relaxed">
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
                  <td colSpan={7} className="text-center py-6 text-zinc-400 font-mono text-xs">
                    {isLoading ? 'Retrieving vector matches...' : 'No retrieval results to display. Click "Run Analysis".'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <hr className="border-zinc-200" />

      {/* ANSWER & GROUNDING SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Answer & Evidence Table (Left 7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Generated Answer */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
              Generated Answer
            </h2>
            <div className="bg-white border border-zinc-200 rounded p-4 text-sm text-zinc-800 leading-relaxed font-sans">
              {data ? (
                data.answer
              ) : (
                <span className="text-zinc-400 italic">
                  Run a query to view generated answer and evidence attribution...
                </span>
              )}
            </div>
          </div>

          {/* Grounding Analysis Panel */}
          <div id="grounding-inspector" className="space-y-3">
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
              Grounding Inspector
            </h2>

            <div className="bg-white border border-zinc-200 rounded p-4 space-y-3 font-sans">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="font-bold text-zinc-900 uppercase tracking-wider">GROUNDING ANALYSIS</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold ${
                    data?.grounding?.status === 'GROUNDED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    data?.grounding?.status === 'PARTIALLY_GROUNDED' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    data?.grounding?.status === 'UNSUPPORTED' ? 'bg-red-50 text-red-700 border border-red-200' :
                    'bg-zinc-100 text-zinc-600'
                  }`}>
                    {data?.grounding?.status || 'IDLE'}
                  </span>
                </div>
                {data?.grounding && (
                  <div className="font-mono text-xs font-bold text-[#00288e] bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                    Groundedness: {Math.round((data.grounding.groundedness_score ?? 0) * 100)}%
                  </div>
                )}
              </div>

              {data?.grounding && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                    <span className="text-zinc-700 font-semibold">{data.grounding.total_claims ?? (data.grounding.claims?.length ?? (data.grounding.supported_claims.length + data.grounding.unsupported_claims.length))} claims detected</span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      ✓ {data.grounding.supported_claims_count ?? data.grounding.supported_claims.filter(c => (c.status || 'SUPPORTED') === 'SUPPORTED').length} Supported
                    </span>
                    <span className="text-amber-700 font-bold flex items-center gap-1">
                      △ {data.grounding.partially_supported_claims_count ?? data.grounding.supported_claims.filter(c => c.status === 'PARTIALLY_SUPPORTED').length} Partially Supported
                    </span>
                    <span className="text-red-700 font-bold flex items-center gap-1">
                      ✕ {data.grounding.unsupported_claims_count ?? data.grounding.unsupported_claims.length} Unsupported
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-500 font-sans italic pt-1 border-t border-zinc-100">
                    Grounding is a heuristic based on semantic similarity between claims and retrieved context. It is not a factual truth verifier.
                  </p>
                </div>
              )}

              {/* Claim-Level Table */}
              <div className="border border-zinc-200 rounded overflow-hidden mt-3">
                <table className="w-full text-left border-collapse text-xs font-sans">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 font-mono text-[11px] uppercase text-zinc-500">
                      <th className="py-2.5 px-3">Claim</th>
                      <th className="py-2.5 px-3 w-28">Status</th>
                      <th className="py-2.5 px-3 w-24">Support Score</th>
                      <th className="py-2.5 px-3 w-40">Supporting Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
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
                              className="cursor-pointer hover:bg-zinc-50 transition-colors"
                            >
                              <td className="py-2.5 px-3 text-zinc-800 font-medium">
                                <span className="flex items-center gap-1.5">
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                  )}
                                  <span>"{claim.claim_text || claim.claim}"</span>
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                                    claimStatus === 'SUPPORTED'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : claimStatus === 'PARTIALLY_SUPPORTED'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-red-50 text-red-700 border border-red-200'
                                  }`}
                                >
                                  {claimStatus}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-semibold text-zinc-700">
                                {claim.support_score ? claim.support_score.toFixed(4) : '0.0000'}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-zinc-600 text-[11px] truncate max-w-[150px]">
                                {mainSource}
                              </td>
                            </tr>

                            {/* Expandable Claim Details */}
                            {isExpanded && (
                              <tr>
                                <td colSpan={4} className="bg-zinc-50 p-3.5 border-b border-zinc-200 font-sans text-xs">
                                  <div className="space-y-3 bg-white p-3 rounded border border-zinc-200">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                                      <div>
                                        <div className="text-zinc-400 text-[10px] uppercase font-semibold">Claim Status</div>
                                        <div className={`font-bold mt-0.5 uppercase ${
                                          claimStatus === 'SUPPORTED' ? 'text-emerald-700' :
                                          claimStatus === 'PARTIALLY_SUPPORTED' ? 'text-amber-700' : 'text-red-700'
                                        }`}>
                                          {claimStatus}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-zinc-400 text-[10px] uppercase font-semibold">Support Score</div>
                                        <div className="text-zinc-900 font-bold mt-0.5">{claim.support_score ? claim.support_score.toFixed(4) : '0.0000'}</div>
                                      </div>
                                      <div>
                                        <div className="text-zinc-400 text-[10px] uppercase font-semibold">Supporting Chunk ID</div>
                                        <div className="text-[#00288e] font-bold mt-0.5">{claim.evidence_chunk_id || 'None'}</div>
                                      </div>
                                    </div>

                                    <div>
                                      <div className="text-zinc-400 text-[10px] uppercase font-semibold font-mono mb-1">
                                        Claim Text:
                                      </div>
                                      <div className="bg-zinc-50 p-2.5 rounded border border-zinc-200 text-zinc-900 font-medium">
                                        "{claim.claim_text || claim.claim}"
                                      </div>
                                    </div>

                                    {/* Supporting Chunks Preview */}
                                    <div>
                                      <div className="text-zinc-400 text-[10px] uppercase font-semibold font-mono mb-1">
                                        Supporting Context Evidence:
                                      </div>
                                      {claim.supporting_chunks && claim.supporting_chunks.length > 0 ? (
                                        <div className="space-y-2">
                                          {claim.supporting_chunks.map((sc, scIdx) => (
                                            <div key={scIdx} className="bg-emerald-50/50 border border-emerald-200 p-2.5 rounded text-xs">
                                              <div className="flex items-center justify-between font-mono text-[11px] text-emerald-800 font-semibold mb-1">
                                                <span>Chunk: {sc.chunk_id} ({sc.source})</span>
                                                <span>Score: {sc.score.toFixed(4)}</span>
                                              </div>
                                              <div className="text-zinc-800 font-sans text-xs italic">
                                                "{sc.text_snippet}"
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : claim.evidence_text ? (
                                        <div className="bg-emerald-50/50 border border-emerald-200 p-2.5 rounded text-xs">
                                          <div className="font-mono text-[11px] text-emerald-800 font-semibold mb-1">
                                            Chunk: {claim.evidence_chunk_id} ({claim.evidence_source || 'source'})
                                          </div>
                                          <div className="text-zinc-800 font-sans text-xs italic">
                                            "{claim.evidence_text}"
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="bg-zinc-100 p-2.5 rounded border border-zinc-200 text-zinc-500 font-mono text-[11px]">
                                          No matching context chunk reached support threshold for this claim.
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
                        <td colSpan={4} className="text-center py-6 text-zinc-400 font-mono text-xs">
                          {isLoading ? 'Extracting and verifying claims...' : 'No claims evaluated yet. Click "Run Analysis".'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

        {/* Diagnosis & Efficiency Columns (Right 5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* DIAGNOSIS */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
              System Diagnosis
            </h2>
            <div className="bg-white border border-zinc-200 rounded p-4 space-y-3 text-xs font-sans">
              {/* RETRIEVAL */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono font-bold text-zinc-800 tracking-wider">RETRIEVAL</span>
                  <p className="text-zinc-500 mt-0.5">
                    {data?.diagnosis?.retrieval || 'Relevant chunks were retrieved with strong vector scores.'}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 ml-2">GOOD</span>
              </div>

              <hr className="border-zinc-200" />

              {/* CONTEXT */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono font-bold text-zinc-800 tracking-wider">CONTEXT</span>
                  <p className="text-zinc-500 mt-0.5">
                    {data?.diagnosis?.context || 'Retrieved context is filtered & formatted cleanly.'}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 ml-2">WARNING</span>
              </div>

              <hr className="border-zinc-200" />

              {/* GROUNDING */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono font-bold text-zinc-800 tracking-wider">GROUNDING</span>
                  <p className="text-zinc-500 mt-0.5">
                    {data?.diagnosis?.grounding || data?.grounding?.explanation || 'Claims have supporting evidence.'}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 ml-2">PARTIAL</span>
              </div>

              <hr className="border-zinc-200" />

              {/* EFFICIENCY */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono font-bold text-zinc-800 tracking-wider">EFFICIENCY</span>
                  <p className="text-zinc-500 mt-0.5">
                    {data?.diagnosis?.efficiency || 'Context latency & tokens are within normal bounds.'}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#00288e] border border-blue-200 ml-2">OPTIMAL</span>
              </div>

              <hr className="border-zinc-200" />

              {/* SECURITY */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono font-bold text-zinc-800 tracking-wider">SECURITY</span>
                  <p className="text-zinc-500 mt-0.5">
                    {data?.diagnosis?.security ? `Risk Level: ${data.diagnosis.security}` : data?.security?.explanation || 'No prompt injection threats detected.'}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ml-2 ${
                  data?.security?.risk_level === 'HIGH' ? 'bg-red-50 text-red-700 border-red-200' :
                  data?.security?.risk_level === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {data?.security?.risk_level || 'SECURE'}
                </span>
              </div>
            </div>
          </div>

          {/* EFFICIENCY PROFILER */}
          <div id="efficiency-section" className="space-y-3">
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
              Efficiency Profiler
            </h2>
            <div className="bg-white border border-zinc-200 rounded p-4 text-xs font-mono space-y-2">
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-500">Retrieved chunks</span>
                <span className="text-zinc-900 font-semibold">{data ? data.retrieval.results.length : 5}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-500">Estimated input tokens</span>
                <span className="text-zinc-900 font-semibold">{data ? data.efficiency.estimated_input_tokens : 200}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-500">Output tokens</span>
                <span className="text-zinc-900 font-semibold">{data ? data.efficiency.estimated_output_tokens : 85}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-500">Total tokens</span>
                <span className="text-zinc-900 font-semibold">{data ? data.efficiency.total_estimated_tokens : 285}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-500">Retrieval latency</span>
                <span className="text-zinc-900 font-semibold">{data ? `${data.efficiency.retrieval_latency_ms.toFixed(2)} ms` : '14.20 ms'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-500">Generation latency</span>
                <span className="text-zinc-900 font-semibold">{data ? `${data.efficiency.generation_latency_ms.toFixed(2)} ms` : '18.50 ms'}</span>
              </div>
              <div className="flex justify-between py-1 pt-1 font-bold text-zinc-900">
                <span>Total latency</span>
                <span className="text-[#00288e]">{data ? `${data.efficiency.total_latency_ms.toFixed(2)} ms` : '33.72 ms'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <hr className="border-zinc-200 my-6" />

      {/* SECURITY INSPECTOR SECTION */}
      <div id="security-inspector" className="space-y-4 font-sans bg-white p-5 rounded border border-zinc-200">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#00288e]" />
              <h2 className="text-base font-bold text-zinc-900 tracking-tight font-mono uppercase">
                SECURITY INSPECTOR
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
                PROMPT-INJECTION DIAGNOSTICS
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-sans mt-0.5">
              Detects instruction-like threats inside retrieved document chunks before context generation.
            </p>
          </div>

          {data?.security && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-500">SECURITY RISK:</span>
              <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase ${
                data.security.risk_level === 'HIGH' ? 'bg-red-50 text-red-700 border border-red-200' :
                data.security.risk_level === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                data.security.risk_level === 'LOW' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {data.security.risk_level}
              </span>
            </div>
          )}
        </div>

        {/* Security Metrics & Boundary Notice */}
        {data?.security ? (
          <div className="space-y-4">
            {/* Top Grid Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-zinc-50 p-3 rounded border border-zinc-200">
                <div className="text-[10px] font-mono font-semibold text-zinc-400 uppercase">Chunks Scanned</div>
                <div className="text-sm font-bold font-mono text-zinc-900 mt-0.5">
                  {data.security.retrieved_chunks_scanned}
                </div>
              </div>

              <div className="bg-zinc-50 p-3 rounded border border-zinc-200">
                <div className="text-[10px] font-mono font-semibold text-zinc-400 uppercase">Safe Chunks</div>
                <div className="text-sm font-bold font-mono text-emerald-700 mt-0.5">
                  {data.security.safe_chunks}
                </div>
              </div>

              <div className="bg-zinc-50 p-3 rounded border border-zinc-200">
                <div className="text-[10px] font-mono font-semibold text-zinc-400 uppercase">Affected Chunks</div>
                <div className={`text-sm font-bold font-mono mt-0.5 ${data.security.affected_chunks > 0 ? 'text-red-700' : 'text-zinc-700'}`}>
                  {data.security.affected_chunks}
                </div>
              </div>

              <div className="bg-zinc-50 p-3 rounded border border-zinc-200">
                <div className="text-[10px] font-mono font-semibold text-zinc-400 uppercase">Findings</div>
                <div className={`text-sm font-bold font-mono mt-0.5 ${data.security.finding_count > 0 ? 'text-amber-700' : 'text-zinc-700'}`}>
                  {data.security.finding_count}
                </div>
              </div>
            </div>

            {/* Categories Detected */}
            <div className="space-y-1">
              <div className="text-[10px] font-mono font-semibold text-zinc-400 uppercase">Categories Detected</div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {data.security.categories_detected && data.security.categories_detected.length > 0 ? (
                  data.security.categories_detected.map((cat, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-red-50 text-red-800 border border-red-200">
                      • {cat.replace(/_/g, ' ')}
                    </span>
                  ))
                ) : (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    No threat categories detected
                  </span>
                )}
              </div>
            </div>

            {/* Security Boundary Explanation Banner */}
            <div className="bg-blue-50/60 p-3.5 rounded border border-blue-200 space-y-1">
              <div className="text-[10px] font-mono font-bold text-[#00288e] uppercase flex items-center gap-1.5">
                <span>SECURITY BOUNDARY PRINCIPLE</span>
              </div>
              <p className="text-zinc-800 text-xs leading-relaxed">
                Retrieved documents are <strong>DATA</strong>, NOT trusted instructions. The RAG system should not allow text inside a retrieved document to override system instructions, developer directives, application policies, or tool permissions.
              </p>
            </div>

            {/* Recommendation Box */}
            <div className="bg-zinc-50 p-3.5 rounded border border-zinc-200 space-y-1">
              <div className="text-[10px] font-mono font-semibold text-zinc-500 uppercase">RECOMMENDED ACTION</div>
              <p className="text-zinc-800 text-xs font-sans leading-relaxed">
                "{data.security.recommendation}"
              </p>
            </div>

            {/* SECURITY FINDINGS TABLE */}
            <div className="space-y-2 pt-2">
              <div className="text-[11px] font-mono font-bold text-zinc-700 uppercase">
                SECURITY FINDINGS TABLE ({data.security.findings ? data.security.findings.length : 0})
              </div>

              <div className="border border-zinc-200 rounded overflow-hidden bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 font-mono text-[11px] uppercase text-zinc-500">
                      <th className="py-2.5 px-3 w-24">Severity</th>
                      <th className="py-2.5 px-3 w-48">Category</th>
                      <th className="py-2.5 px-3 w-36">Source</th>
                      <th className="py-2.5 px-3">Matched Text</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-sans">
                    {data.security.findings && data.security.findings.length > 0 ? (
                      data.security.findings.map((f, idx) => {
                        const isExpanded = expandedSecurityIdx === idx;
                        return (
                          <React.Fragment key={idx}>
                            <tr
                              onClick={() => setExpandedSecurityIdx(isExpanded ? null : idx)}
                              className="cursor-pointer hover:bg-zinc-50 transition-colors"
                            >
                              <td className="py-2.5 px-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                                  f.severity === 'HIGH' ? 'bg-red-50 text-red-700 border border-red-200' :
                                  f.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                  'bg-zinc-100 text-zinc-700 border border-zinc-200'
                                }`}>
                                  {f.severity}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-[#00288e] text-[11px]">
                                {f.category}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-zinc-700 text-[11px] truncate max-w-[140px]">
                                {f.source}
                              </td>
                              <td className="py-2.5 px-3 text-zinc-800 line-clamp-1">
                                <span className="flex items-center gap-1.5">
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                  )}
                                  <span className="font-mono text-xs text-red-800 bg-red-50/60 px-1.5 py-0.5 rounded border border-red-100 truncate">
                                    "{f.matched_text}"
                                  </span>
                                </span>
                              </td>
                            </tr>

                            {/* Expandable Finding Detail */}
                            {isExpanded && (
                              <tr>
                                <td colSpan={4} className="bg-zinc-50 p-4 border-b border-zinc-200 font-mono text-xs">
                                  <div className="space-y-3 bg-white p-3 rounded border border-zinc-200">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                      <div>
                                        <div className="text-zinc-400 text-[10px] uppercase font-semibold">Source Document</div>
                                        <div className="text-zinc-900 font-bold mt-0.5">{f.source}</div>
                                      </div>
                                      <div>
                                        <div className="text-zinc-400 text-[10px] uppercase font-semibold">Chunk ID</div>
                                        <div className="text-[#00288e] font-bold mt-0.5">{f.chunk_id}</div>
                                      </div>
                                      <div>
                                        <div className="text-zinc-400 text-[10px] uppercase font-semibold">Threat Category</div>
                                        <div className="text-red-700 font-bold mt-0.5">{f.category}</div>
                                      </div>
                                    </div>

                                    <div>
                                      <div className="text-zinc-400 text-[10px] uppercase font-semibold mb-1">
                                        Matched Pattern Text:
                                      </div>
                                      <div className="bg-red-50/50 border border-red-200 rounded p-2.5 text-red-900 font-mono text-xs font-semibold">
                                        "{f.matched_text}"
                                      </div>
                                    </div>

                                    <div>
                                      <div className="text-zinc-400 text-[10px] uppercase font-semibold mb-1">
                                        Explanation:
                                      </div>
                                      <div className="text-zinc-800 font-sans text-xs leading-relaxed">
                                        {f.explanation}
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
                        <td colSpan={4} className="text-center py-6 text-zinc-400 font-mono text-xs">
                          No prompt injection findings detected in retrieved chunks.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-zinc-400 italic py-4 font-mono">
            Run a query to view prompt-injection security diagnostics...
          </div>
        )}
      </div>

      <hr className="border-zinc-200 my-6" />

      {/* ROOT CAUSE ANALYSIS SECTION */}
      <div id="root-cause-section" className="space-y-4 font-sans bg-white p-5 rounded border border-zinc-200">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-900 tracking-tight font-mono uppercase">
                ROOT CAUSE ANALYSIS
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
                DETERMINISTIC DIAGNOSIS
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-sans mt-0.5">
              Analyzes multi-stage RAG metrics to deterministically explain why this RAG run failed or succeeded.
            </p>
          </div>

          {data?.root_cause && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] font-mono text-zinc-400 uppercase font-semibold">Diagnostic Confidence</div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  data.root_cause.confidence === 'HIGH' ? 'bg-blue-50 text-[#00288e] border border-blue-200' :
                  data.root_cause.confidence === 'MEDIUM' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                  'bg-zinc-100 text-zinc-700 border border-zinc-200'
                }`}>
                  {data.root_cause.confidence} (QUALITATIVE)
                </span>
              </div>
            </div>
          )}
        </div>

        {data?.root_cause ? (
          <div className="space-y-4 text-xs font-sans">
            {/* Primary Issue & Affected Stage Header Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-zinc-50 rounded border border-zinc-200">
              <div>
                <div className="text-[10px] font-mono font-semibold text-zinc-400 uppercase">Primary Root Cause</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase ${
                    data.root_cause.primary_issue === 'RETRIEVAL_FAILURE' ? 'bg-red-100 text-red-800 border border-red-300' :
                    data.root_cause.primary_issue === 'CONTEXT_FAILURE' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                    data.root_cause.primary_issue === 'GENERATION_FAILURE' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                    data.root_cause.primary_issue === 'EFFICIENCY_ISSUE' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                    'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {data.root_cause.primary_issue.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono font-semibold text-zinc-400 uppercase">Affected Stage</div>
                <div className="mt-1 font-mono font-bold text-zinc-900 text-sm">
                  {data.root_cause.affected_stage}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono font-semibold text-zinc-400 uppercase">Confidence</div>
                <div className="mt-1 font-mono font-semibold text-zinc-800">
                  {data.root_cause.confidence}
                </div>
              </div>
            </div>

            {/* Primary Explanation */}
            <div className="bg-white p-3.5 rounded border border-zinc-200 space-y-1">
              <div className="text-[10px] font-mono font-semibold text-zinc-400 uppercase">Failure Explanation</div>
              <p className="text-zinc-800 text-xs leading-relaxed">
                {data.root_cause.explanation}
              </p>
            </div>

            {/* Evidence & Why Section */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono font-semibold text-zinc-400 uppercase">
                WHY? (DIAGNOSTIC EVIDENCE)
              </div>
              <ul className="space-y-1.5">
                {data.root_cause.evidence.map((ev, idx) => {
                  const isRetrievalEv = ev.toLowerCase().includes('retriev');
                  const isGroundingEv = ev.toLowerCase().includes('ground') || ev.toLowerCase().includes('claim');
                  const isEffEv = ev.toLowerCase().includes('latenc') || ev.toLowerCase().includes('token');

                  const handleJump = () => {
                    if (isRetrievalEv) {
                      document.getElementById('retrieval-inspector')?.scrollIntoView({ behavior: 'smooth' });
                    } else if (isGroundingEv) {
                      document.getElementById('grounding-inspector')?.scrollIntoView({ behavior: 'smooth' });
                    } else if (isEffEv) {
                      document.getElementById('efficiency-section')?.scrollIntoView({ behavior: 'smooth' });
                    }
                  };

                  return (
                    <li
                      key={idx}
                      onClick={handleJump}
                      className={`p-2.5 bg-zinc-50 rounded border border-zinc-200 text-zinc-800 font-sans text-xs flex items-start gap-2 ${
                        isRetrievalEv || isGroundingEv || isEffEv ? 'cursor-pointer hover:bg-blue-50/50 hover:border-blue-200 transition-colors' : ''
                      }`}
                    >
                      <span className="text-[#00288e] font-bold">•</span>
                      <span className="flex-1">{ev}</span>
                      {(isRetrievalEv || isGroundingEv || isEffEv) && (
                        <span className="text-[10px] font-mono font-semibold text-[#00288e] shrink-0 hover:underline">
                          Inspect stage →
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Secondary Issues */}
            {data.root_cause.secondary_issues && data.root_cause.secondary_issues.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="text-[10px] font-mono font-semibold text-zinc-400 uppercase">SECONDARY ISSUES</div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {data.root_cause.secondary_issues.map((sec, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200">
                      • {sec.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Investigation */}
            <div className="bg-blue-50/60 p-3.5 rounded border border-blue-200 space-y-1">
              <div className="text-[10px] font-mono font-bold text-[#00288e] uppercase">
                RECOMMENDED INVESTIGATION
              </div>
              <p className="text-zinc-800 text-xs font-sans leading-relaxed">
                "{data.root_cause.recommendation}"
              </p>
            </div>

            {/* Experiment Evidence (Counterfactual Connection) */}
            {(cfResults || data.root_cause.counterfactual_summary) && (
              <div className="bg-amber-50/60 p-3.5 rounded border border-amber-200 space-y-1 font-sans">
                <div className="text-[10px] font-mono font-bold text-amber-900 uppercase">
                  EXPERIMENT EVIDENCE (COUNTERFACTUAL OBSERVATIONS)
                </div>
                <p className="text-zinc-800 text-xs leading-relaxed">
                  {data.root_cause.counterfactual_summary || `${cfResults?.counterfactual_runs.length ?? 5} configurations were tested for this query.`}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-zinc-400 italic py-4 font-mono">
            Run a query to view root cause diagnostic analysis...
          </div>
        )}
      </div>

      <hr className="border-zinc-200 my-6" />

      {/* COUNTERFACTUAL RAG ANALYSIS SECTION */}
      <div className="space-y-4 font-sans bg-white p-5 rounded border border-zinc-200">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-900 tracking-tight font-mono uppercase">
                COUNTERFACTUAL ANALYSIS
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#00288e] border border-blue-200">
                WHAT-IF EXPERIMENT
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-sans mt-0.5">
              "What changes if we alter retrieval?" — Evaluates 5 controlled configurations against the same query and measures exact trade-offs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {data && (
              data.grounding.status.includes('PARTIAL') ||
              data.grounding.status.includes('UNSUPPORTED') ||
              data.grounding.status.includes('NO_ANSWER') ||
              (data.diagnosis.retrieval && data.diagnosis.retrieval.includes('WEAK'))
            ) && (
              <button
                type="button"
                onClick={handleRunCounterfactual}
                disabled={isCfLoading || !query.trim()}
                className="px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-300 rounded hover:bg-amber-100 transition-colors flex items-center gap-1.5"
              >
                <span>Replay Failure</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRunCounterfactual}
              disabled={isCfLoading || !query.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#00288e] hover:bg-[#001f70] rounded transition-colors flex items-center gap-2 shadow-sm"
            >
              {isCfLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Running 5 controlled configurations...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Run Counterfactual Analysis</span>
                </>
              )}
            </button>
          </div>
        </div>

        {cfError && (
          <div className="p-3 bg-red-50 border border-red-200 text-xs font-mono text-red-700 rounded">
            Counterfactual Error: {cfError}
          </div>
        )}

        {isCfLoading && (
          <div className="p-8 text-center space-y-2 border border-dashed border-zinc-300 rounded bg-zinc-50">
            <div className="w-6 h-6 border-2 border-[#00288e] border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="font-mono text-xs font-semibold text-zinc-700 uppercase">
              Executing 5 Controlled Counterfactual Configurations...
            </div>
            <div className="text-xs text-zinc-500">
              Measuring candidate filtering, token reduction, latency shifts, grounding metrics, and claim attributions.
            </div>
          </div>
        )}

        {cfResults && !isCfLoading && (
          <div className="space-y-4">
            <div className="border border-zinc-200 rounded overflow-hidden">
              <table className="w-full text-left border-collapse text-xs font-sans">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 font-mono text-[11px] uppercase text-zinc-500">
                    <th className="py-2.5 px-3">Configuration</th>
                    <th className="py-2.5 px-3">Strategy</th>
                    <th className="py-2.5 px-3 text-center">Top-K</th>
                    <th className="py-2.5 px-3 text-center">Retained</th>
                    <th className="py-2.5 px-3 text-right">Tokens</th>
                    <th className="py-2.5 px-3 text-right">Latency</th>
                    <th className="py-2.5 px-3">Grounding</th>
                    <th className="py-2.5 px-3">Diagnosis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {cfResults.counterfactual_runs.map((run, idx) => {
                    const isOriginal = idx === 0;
                    const isExpanded = expandedCfIdx === idx;
                    const changeInfo = cfResults.changes_observed.find(c => c.target_name === run.name);

                    return (
                      <React.Fragment key={idx}>
                        <tr
                          onClick={() => setExpandedCfIdx(isExpanded ? null : idx)}
                          className={`cursor-pointer transition-colors ${
                            isOriginal ? 'bg-blue-50/40 hover:bg-blue-50' : 'hover:bg-zinc-50'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-semibold text-zinc-900">
                            <span className="flex items-center gap-1.5">
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              )}
                              <span>{run.name}</span>
                              {isOriginal && (
                                <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-[#00288e] text-white rounded">ORIGINAL</span>
                              )}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#00288e] uppercase text-[11px]">
                            {run.strategy}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-semibold text-zinc-700">
                            {run.top_k}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">
                            {run.retained_count} <span className="text-zinc-400 font-normal">/ {run.candidates_count}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-zinc-800">
                            {run.input_tokens} tok
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-zinc-900">
                            {run.total_latency_ms.toFixed(1)} ms
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                              run.grounding_status === 'GROUNDED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              run.grounding_status.includes('PARTIAL') ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {run.grounding_status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-zinc-700 font-mono text-[11px]">
                            {run.diagnosis_category}
                          </td>
                        </tr>

                        {/* Expanded Detail & WHAT CHANGED? Panel */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="bg-zinc-50 p-4 border-b border-zinc-200 font-sans text-xs">
                              <div className="space-y-4 bg-white p-4 rounded border border-zinc-200">
                                {/* Details Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs bg-zinc-50 p-3 rounded border border-zinc-200">
                                  <div>
                                    <div className="text-zinc-400 text-[10px] uppercase font-semibold">Strategy & Top-K</div>
                                    <div className="text-zinc-900 font-bold mt-0.5 uppercase">{run.strategy} (K={run.top_k})</div>
                                  </div>
                                  <div>
                                    <div className="text-zinc-400 text-[10px] uppercase font-semibold">Retained / Removed</div>
                                    <div className="text-zinc-900 font-bold mt-0.5">{run.retained_count} kept · {run.removed_count} removed</div>
                                  </div>
                                  <div>
                                    <div className="text-zinc-400 text-[10px] uppercase font-semibold">Input Tokens</div>
                                    <div className="text-zinc-900 font-bold mt-0.5">{run.input_tokens} tok</div>
                                  </div>
                                  <div>
                                    <div className="text-zinc-400 text-[10px] uppercase font-semibold">Total Latency</div>
                                    <div className="text-[#00288e] font-bold mt-0.5">{run.total_latency_ms.toFixed(1)} ms</div>
                                  </div>
                                </div>

                                {/* WHAT CHANGED PANEL */}
                                {!isOriginal && changeInfo && (
                                  <div className="bg-blue-50/50 border border-blue-200 p-3.5 rounded space-y-2">
                                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#00288e] uppercase">
                                      <span>WHAT CHANGED?</span>
                                      <span className="text-zinc-500 font-normal">/ Measured vs Original ({cfResults.original_run.name})</span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs pt-1">
                                      <div className="bg-white p-2 rounded border border-blue-100">
                                        <div className="text-zinc-400 text-[10px] uppercase font-semibold">Context Tokens</div>
                                        <div className="text-zinc-900 font-bold">{cfResults.original_run.input_tokens} → {run.input_tokens}</div>
                                        <div className={`text-[10px] font-bold ${changeInfo.context_token_change <= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                                          {changeInfo.context_token_pct_change >= 0 ? '+' : ''}{changeInfo.context_token_pct_change.toFixed(1)}% ({changeInfo.context_token_change >= 0 ? '+' : ''}{changeInfo.context_token_change} tok)
                                        </div>
                                      </div>

                                      <div className="bg-white p-2 rounded border border-blue-100">
                                        <div className="text-zinc-400 text-[10px] uppercase font-semibold">Chunks Retained</div>
                                        <div className="text-zinc-900 font-bold">{cfResults.original_run.retained_count} → {run.retained_count}</div>
                                        <div className="text-[10px] text-zinc-600 font-semibold">
                                          {changeInfo.removed_chunks_count} removed
                                        </div>
                                      </div>

                                      <div className="bg-white p-2 rounded border border-blue-100">
                                        <div className="text-zinc-400 text-[10px] uppercase font-semibold">Latency</div>
                                        <div className="text-zinc-900 font-bold">{cfResults.original_run.total_latency_ms.toFixed(1)}ms → {run.total_latency_ms.toFixed(1)}ms</div>
                                        <div className={`text-[10px] font-bold ${changeInfo.latency_change_ms <= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                                          {changeInfo.latency_change_ms >= 0 ? '+' : ''}{changeInfo.latency_change_ms.toFixed(1)} ms
                                        </div>
                                      </div>

                                      <div className="bg-white p-2 rounded border border-blue-100">
                                        <div className="text-zinc-400 text-[10px] uppercase font-semibold">Grounding Status</div>
                                        <div className="text-zinc-900 font-bold">{run.grounding_status}</div>
                                        <div className="text-[10px] text-zinc-600 font-semibold">
                                          {changeInfo.grounding_status_change}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="text-xs text-zinc-800 font-sans pt-1 leading-relaxed">
                                      <strong>Diagnostic Observation:</strong> {changeInfo.explanation}
                                    </div>
                                  </div>
                                )}

                                {/* Strategy Trade-offs */}
                                {run.tradeoffs && run.tradeoffs.length > 0 && (
                                  <div className="space-y-1">
                                    <div className="text-[10px] font-mono font-semibold uppercase text-zinc-400">
                                      STRATEGY TRADE-OFFS & CHARACTERISTICS
                                    </div>
                                    <ul className="list-disc list-inside text-xs text-zinc-700 space-y-0.5 font-sans">
                                      {run.tradeoffs.map((to, toIdx) => (
                                        <li key={toIdx}>{to}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Retrieved Chunks Preview */}
                                <div className="space-y-1">
                                  <div className="text-[10px] font-mono font-semibold uppercase text-zinc-400">
                                    RETRIEVED CHUNKS ({run.chunks.length})
                                  </div>
                                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                    {run.chunks.map((ch, chIdx) => (
                                      <div key={chIdx} className="bg-zinc-50 p-2 rounded border border-zinc-200 text-xs font-mono flex items-start justify-between gap-2">
                                        <div>
                                          <span className="font-bold text-[#00288e]">{ch.chunk_id}</span>
                                          <span className="text-zinc-500 font-sans text-[11px] ml-2">({ch.source})</span>
                                          <div className="text-zinc-800 font-sans text-xs line-clamp-1 mt-0.5">
                                            "{ch.text}"
                                          </div>
                                        </div>
                                        <span className="font-bold text-emerald-700 shrink-0">
                                          {(ch.similarity || ch.retrieval_score || 0).toFixed(4)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

