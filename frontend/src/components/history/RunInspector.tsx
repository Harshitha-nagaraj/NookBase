import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import type { RunDetailResponse } from '../../types/api';

interface RunInspectorProps {
  run: RunDetailResponse;
  onBack: () => void;
}

export const RunInspector: React.FC<RunInspectorProps> = ({ run, onBack }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'retrieval' | 'grounding' | 'efficiency' | 'diagnosis'>('overview');

  const supportedCount = run.grounding_result?.supported_claims?.length ?? 0;
  const unsupportedCount = run.grounding_result?.unsupported_claims?.length ?? 0;
  const totalClaims = supportedCount + unsupportedCount;

  return (
    <div className="space-y-4 font-sans pb-8">
      {/* Top Header & Back Button */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-zinc-500" />
            <span>Back to History</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold font-mono text-[#00288e]">{run.run_id}</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 uppercase">
                {run.failure_category || 'GROUNDED'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">{run.timestamp}</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs text-zinc-600">
          <div>Strategy: <span className="font-bold text-[#00288e] uppercase">{run.strategy || 'standard'}</span></div>
          <div>Top-K: <span className="font-semibold text-zinc-900">{run.top_k}</span> · Thresh: <span className="font-semibold text-zinc-900">{run.threshold ?? 0.35}</span></div>
          <div>Total Latency: <span className="font-semibold text-zinc-900">{run.total_latency_ms?.toFixed(1)} ms</span></div>
        </div>
      </div>

      {/* Query Banner */}
      <div className="p-3 bg-white rounded border border-zinc-200 space-y-1">
        <div className="text-[10px] font-mono font-semibold uppercase text-zinc-400 tracking-wider">
          USER QUERY
        </div>
        <div className="text-sm font-medium text-zinc-900 font-sans">"{run.query}"</div>
      </div>

      {/* Pipeline Visual Flow */}
      <div className="p-3 bg-zinc-50 rounded border border-zinc-200">
        <div className="text-[10px] font-mono font-semibold uppercase text-zinc-400 tracking-wider mb-2">
          PIPELINE EXECUTION TRACE
        </div>
        <div className="flex items-center justify-between gap-1 overflow-x-auto text-xs font-mono">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded border border-zinc-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-zinc-800">Query</span>
          </div>
          <span className="text-zinc-400">→</span>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded border border-zinc-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-zinc-800">Embedding</span>
          </div>
          <span className="text-zinc-400">→</span>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded border border-zinc-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-zinc-800">Retrieval</span>
            <span className="text-[10px] text-zinc-400">({run.strategy || 'std'} · {run.retrieved_chunks?.length || 0} chunks)</span>
          </div>
          <span className="text-zinc-400">→</span>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded border border-zinc-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-zinc-800">Context</span>
          </div>
          <span className="text-zinc-400">→</span>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded border border-zinc-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-zinc-800">Generation</span>
          </div>
          <span className="text-zinc-400">→</span>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded border border-zinc-200">
            <span className={`w-2 h-2 rounded-full ${run.grounding_status?.toUpperCase().includes('UNGROUNDED') ? 'bg-red-500' : 'bg-emerald-500'}`} />
            <span className="font-semibold text-zinc-800">Grounding</span>
            <span className="text-[10px] text-zinc-400">({run.grounding_status})</span>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-zinc-200 font-mono text-xs">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'retrieval', label: `Retrieval (${run.retrieved_chunks?.length || 0})` },
          { id: 'grounding', label: `Grounding (${supportedCount}/${totalClaims})` },
          { id: 'efficiency', label: 'Efficiency & Latency' },
          { id: 'diagnosis', label: 'Diagnosis Breakdown' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[#00288e] text-[#00288e] bg-blue-50/40'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:border-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="p-4 bg-white rounded border border-zinc-200 space-y-2">
              <div className="text-[10px] font-mono font-semibold uppercase text-zinc-400 tracking-wider">
                GENERATED ANSWER
              </div>
              <div className="text-sm text-zinc-800 leading-relaxed font-sans bg-zinc-50 p-3 rounded border border-zinc-100">
                {run.generated_answer || 'No answer generated'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-white rounded border border-zinc-200 font-mono text-xs space-y-1">
                <div className="text-[10px] text-zinc-400 uppercase font-semibold">Retrieval Configuration</div>
                <div className="font-bold text-[#00288e] uppercase">{run.strategy || 'standard'} (Top-K={run.top_k})</div>
                <div className="text-zinc-500 text-[11px]">
                  Candidates: {run.candidates_count ?? run.retrieved_chunks?.length ?? 0} · Retained: {run.retained_count ?? run.retrieved_chunks?.length ?? 0}
                </div>
              </div>

              <div className="p-3 bg-white rounded border border-zinc-200 font-mono text-xs space-y-1">
                <div className="text-[10px] text-zinc-400 uppercase font-semibold">Grounding Status</div>
                <div className="font-bold text-zinc-800">{run.grounding_status}</div>
                <div className="text-zinc-500 text-[11px]">{supportedCount} / {totalClaims} claims supported</div>
              </div>

              <div className="p-3 bg-white rounded border border-zinc-200 font-mono text-xs space-y-1">
                <div className="text-[10px] text-zinc-400 uppercase font-semibold">Total Tokens</div>
                <div className="font-bold text-zinc-800">{run.estimated_total_tokens} tokens</div>
                <div className="text-zinc-500 text-[11px]">in: {run.estimated_input_tokens} / out: {run.estimated_output_tokens}</div>
              </div>
            </div>
          </div>
        )}

        {/* RETRIEVAL TAB */}
        {activeTab === 'retrieval' && (
          <div className="space-y-3">
            <div className="text-xs font-mono text-zinc-500 flex items-center justify-between">
              <span>Strategy: <strong className="text-[#00288e] uppercase">{run.strategy || 'standard'}</strong> · Top-K = {run.top_k} · Threshold = {run.threshold ?? 0.35}</span>
              <span>
                Retained: <strong className="text-emerald-700">{run.retained_count ?? run.retrieved_chunks?.length ?? 0}</strong> / Candidates: {run.candidates_count ?? run.retrieved_chunks?.length ?? 0}
              </span>
            </div>

            <div className="space-y-2">
              {(run.retrieved_chunks || []).map((chunk, idx) => {
                const origRank = chunk.original_rank ?? chunk.rank ?? idx + 1;
                const rerankedRank = chunk.reranked_rank ?? chunk.rank ?? idx + 1;
                const retrScore = chunk.retrieval_score ?? chunk.similarity ?? 0;
                const rerankScore = chunk.rerank_score ?? chunk.similarity ?? 0;
                const isRetained = chunk.retained !== false;

                return (
                  <div key={idx} className={`p-3 rounded border space-y-2 text-xs ${!isRetained ? 'bg-amber-50/30 border-amber-200' : 'bg-white border-zinc-200'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 font-bold text-[10px]">
                          Orig #{origRank}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-[#00288e] font-bold text-[10px]">
                          Rerank #{rerankedRank}
                        </span>
                        <span className="font-semibold text-zinc-900">{chunk.chunk_id}</span>
                        <span className="text-zinc-400">·</span>
                        <span className="text-zinc-600 font-sans">{chunk.source}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span>Retr Score: <strong className="text-zinc-700">{retrScore.toFixed(4)}</strong></span>
                        <span>Rerank Score: <strong className="text-emerald-700">{rerankScore.toFixed(4)}</strong></span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isRetained ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {isRetained ? 'RETAINED' : 'REMOVED'}
                        </span>
                      </div>
                    </div>
                    <div className="p-2.5 bg-zinc-50 rounded text-zinc-800 font-sans text-xs border border-zinc-100 leading-relaxed">
                      {chunk.text}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* GROUNDING TAB */}
        {activeTab === 'grounding' && (
          <div className="space-y-4">
            <div className="p-3 bg-white rounded border border-zinc-200 space-y-1">
              <div className="text-[10px] font-mono font-semibold uppercase text-zinc-400">Grounding Explanation</div>
              <p className="text-xs text-zinc-700">{run.grounding_result?.explanation || 'No explanation available.'}</p>
            </div>

            {/* Supported Claims */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-semibold uppercase text-emerald-700 tracking-wider">
                Supported Claims ({supportedCount})
              </h4>
              {(run.grounding_result?.supported_claims || []).map((claim, idx) => (
                <div key={idx} className="p-3 bg-white rounded border border-emerald-200 flex items-start gap-2.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="space-y-1 flex-1">
                    <div className="text-zinc-900 font-medium">{claim.claim_text}</div>
                    <div className="font-mono text-[11px] text-zinc-500 flex items-center gap-3">
                      <span>Evidence Chunk: <strong className="text-zinc-700">{claim.evidence_chunk_id || 'N/A'}</strong></span>
                      <span>Support Score: <strong className="text-emerald-700">{claim.support_score?.toFixed(4)}</strong></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Unsupported Claims */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-semibold uppercase text-red-700 tracking-wider">
                Unsupported Claims ({unsupportedCount})
              </h4>
              {unsupportedCount === 0 ? (
                <div className="p-3 bg-zinc-50 rounded border border-zinc-200 text-xs text-zinc-500 font-mono">
                  No unsupported claims detected.
                </div>
              ) : (
                (run.grounding_result?.unsupported_claims || []).map((claim, idx) => (
                  <div key={idx} className="p-3 bg-white rounded border border-red-200 flex items-start gap-2.5 text-xs">
                    <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                    <div className="space-y-1 flex-1">
                      <div className="text-zinc-900 font-medium">{claim.claim_text}</div>
                      <div className="font-mono text-[11px] text-zinc-500">
                        No supporting evidence found in retrieved context.
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* EFFICIENCY TAB */}
        {activeTab === 'efficiency' && (
          <div className="space-y-4 font-mono text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Token Metrics Table */}
              <div className="p-4 bg-white rounded border border-zinc-200 space-y-3">
                <h4 className="font-bold uppercase text-zinc-700 text-[11px]">Token Breakdown</h4>
                <div className="space-y-2 divide-y divide-zinc-100">
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-500">Estimated Input Tokens:</span>
                    <span className="font-bold text-zinc-900">{run.estimated_input_tokens}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-500">Estimated Output Tokens:</span>
                    <span className="font-bold text-zinc-900">{run.estimated_output_tokens}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-500">Estimated Total Tokens:</span>
                    <span className="font-bold text-[#00288e]">{run.estimated_total_tokens}</span>
                  </div>
                </div>
              </div>

              {/* Latency Table */}
              <div className="p-4 bg-white rounded border border-zinc-200 space-y-3">
                <h4 className="font-bold uppercase text-zinc-700 text-[11px]">Latency Breakdown</h4>
                <div className="space-y-2 divide-y divide-zinc-100">
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-500">Retrieval Latency:</span>
                    <span className="font-bold text-zinc-900">{run.retrieval_latency_ms?.toFixed(2)} ms</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-500">Generation Latency:</span>
                    <span className="font-bold text-zinc-900">{run.generation_latency_ms?.toFixed(2)} ms</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-500">Total Latency:</span>
                    <span className="font-bold text-[#00288e]">{run.total_latency_ms?.toFixed(2)} ms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DIAGNOSIS TAB */}
        {activeTab === 'diagnosis' && (
          <div className="space-y-3 font-mono text-xs">
            <div className="p-4 bg-white rounded border border-zinc-200 space-y-3">
              <h4 className="font-bold text-zinc-900 uppercase text-[11px]">System Diagnostics Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-2.5 bg-zinc-50 rounded border border-zinc-200">
                  <div className="text-[10px] text-zinc-400 uppercase font-semibold">Retrieval</div>
                  <div className="font-bold text-zinc-800 mt-1">{run.diagnosis?.retrieval || run.retrieval_status}</div>
                </div>
                <div className="p-2.5 bg-zinc-50 rounded border border-zinc-200">
                  <div className="text-[10px] text-zinc-400 uppercase font-semibold">Grounding</div>
                  <div className="font-bold text-zinc-800 mt-1">{run.diagnosis?.grounding || run.grounding_status}</div>
                </div>
                <div className="p-2.5 bg-zinc-50 rounded border border-zinc-200">
                  <div className="text-[10px] text-zinc-400 uppercase font-semibold">Efficiency</div>
                  <div className="font-bold text-zinc-800 mt-1">{run.diagnosis?.efficiency || 'OPTIMAL'}</div>
                </div>
                <div className="p-2.5 bg-zinc-50 rounded border border-zinc-200">
                  <div className="text-[10px] text-zinc-400 uppercase font-semibold">Security</div>
                  <div className="font-bold text-zinc-800 mt-1">{run.diagnosis?.security || 'SAFE'}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
