import React, { useEffect, useState } from 'react';
import { ShieldCheck, CheckCircle2, Search } from 'lucide-react';
import { debugApi } from '../api/debug';
import type { SecurityResponse } from '../types/api';

export const SecurityPage: React.FC = () => {
  const [data, setData] = useState<SecurityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scanQuery, setScanQuery] = useState('What database is used for local storage in RAG Debugger?');

  const runSecurityScan = async (query: string) => {
    setIsLoading(true);
    try {
      const res = await debugApi.getSecurity(query, 5);
      setData(res);
    } catch (err) {
      console.error('Failed to fetch security report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runSecurityScan(scanQuery);
  }, []);

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (scanQuery.trim()) runSecurityScan(scanQuery);
  };

  // Sample or backend security scenarios
  const scenarios = data?.chunk_details && data.chunk_details.length > 0
    ? data.chunk_details.map((item, idx) => ({
        scenario: item.reason || `Chunk Security Scan #${idx + 1}`,
        source: item.chunk_id,
        detection: item.matched_patterns.length > 0 ? item.matched_patterns.join(', ') : 'None matched',
        risk: item.risk_level.toUpperCase(),
        status: item.is_suspicious ? 'SUSPICIOUS' : 'CLEAN',
        snippet: item.text_snippet || '',
      }))
    : [
        {
          scenario: 'Prompt Injection / System Override Check',
          source: 'chunk_sample_01',
          detection: 'No override tokens',
          risk: 'CLEAN',
          status: 'CLEAN',
          snippet: 'RAG Debugger is a tool for developers to inspect Retrieval-Augmented Generation...',
        },
        {
          scenario: 'Hidden Instruction Exfiltration Test',
          source: 'chunk_sample_02',
          detection: 'System prompt guardrails',
          risk: 'CLEAN',
          status: 'CLEAN',
          snippet: 'ChromaDB is a popular open-source vector database used for local storage...',
        },
      ];

  return (
    <div className="space-y-6 text-zinc-900 font-sans pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-[#00288e] font-semibold uppercase tracking-wider mb-1">
          <ShieldCheck className="w-4 h-4" />
          <span>SECURITY CONSOLE</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">
          Prompt Injection & Chunk Safety Scanner
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Scan retrieved context chunks for prompt injection attacks, jailbreak attempts, and data leak patterns.
        </p>
      </div>

      {/* Query Scanner Input Bar */}
      <form onSubmit={handleScanSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={scanQuery}
            onChange={(e) => setScanQuery(e.target.value)}
            placeholder="Type a query to run security inspection..."
            className="w-full bg-white border border-zinc-300 rounded-[3px] px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-[#00288e]"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Scan Query</span>
        </button>
      </form>

      {/* Security Overview Bar */}
      <div className="bg-white border border-zinc-200 rounded-[3px] p-4 font-mono text-xs space-y-2">
        <div className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
          SCAN OVERVIEW & DETECTIONS
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-zinc-700 pt-1">
          <div>
            <span className="text-zinc-400 block text-[10px]">Risk Assessment</span>
            <span className="font-semibold text-emerald-700">
              {data?.risk_level?.toUpperCase() || 'CLEAN'}
            </span>
          </div>
          <div>
            <span className="text-zinc-400 block text-[10px]">Suspicious Chunks</span>
            <span className="font-semibold text-zinc-900">
              {data?.suspicious_chunks_count ?? 0} detected
            </span>
          </div>
          <div>
            <span className="text-zinc-400 block text-[10px]">Matched Rule Patterns</span>
            <span className="font-semibold text-zinc-900">
              {data?.matched_patterns?.length ?? 0} active
            </span>
          </div>
          <div>
            <span className="text-zinc-400 block text-[10px]">Scanner Status</span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Active Guardrails
            </span>
          </div>
        </div>
      </div>

      {/* Security Console Table */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
          Security Scan Results
        </h2>
        <div className="border border-zinc-200 rounded-[3px] overflow-hidden bg-white">
          <table className="stitch-table">
            <thead>
              <tr>
                <th>Scenario / Rule</th>
                <th className="w-32">Source Chunk</th>
                <th>Detection Pattern</th>
                <th className="w-24">Risk</th>
                <th className="w-28 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((item, idx) => (
                <tr key={idx}>
                  <td className="font-medium text-zinc-900 font-sans">
                    <div>{item.scenario}</div>
                    {item.snippet && (
                      <div className="text-[11px] text-zinc-400 font-mono line-clamp-1 mt-0.5">
                        {item.snippet}
                      </div>
                    )}
                  </td>
                  <td className="font-mono text-zinc-600 text-[11px]">{item.source}</td>
                  <td className="font-mono text-zinc-600 text-[11px]">{item.detection}</td>
                  <td className="font-mono text-xs">
                    <span
                      className={`font-semibold ${
                        item.risk === 'CLEAN' ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {item.risk}
                    </span>
                  </td>
                  <td className="text-right">
                    <span
                      className={`badge-status ${
                        item.status === 'CLEAN' ? 'badge-good' : 'badge-danger'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
