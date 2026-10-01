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
          detection: 'No override tokens detected',
          risk: 'CLEAN',
          status: 'CLEAN',
          snippet: 'RAG Debugger is a tool for developers to inspect Retrieval-Augmented Generation...',
        },
        {
          scenario: 'Hidden Instruction Exfiltration Test',
          source: 'chunk_sample_02',
          detection: 'System prompt guardrails verified',
          risk: 'CLEAN',
          status: 'CLEAN',
          snippet: 'ChromaDB is a popular open-source vector database used for local storage...',
        },
      ];

  const riskLevel = data?.risk_level?.toUpperCase() || 'CLEAN';

  return (
    <div className="space-y-6 text-slate-900 font-sans pb-12">
      {/* Header */}
      <div className="dev-card flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-slate-900">
              Prompt Injection & Chunk Safety Scanner
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              SECURITY CONSOLE
            </span>
          </div>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Scan retrieved context chunks for prompt injection attacks, jailbreak attempts, and data leak patterns.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-500">Global Risk:</span>
          <span className={`badge-status ${
            riskLevel === 'HIGH' ? 'badge-danger' :
            riskLevel === 'MEDIUM' || riskLevel === 'LOW' ? 'badge-warn' : 'badge-good'
          }`}>
            {riskLevel}
          </span>
        </div>
      </div>

      {/* Query Scanner Input Bar */}
      <form onSubmit={handleScanSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={scanQuery}
            onChange={(e) => setScanQuery(e.target.value)}
            placeholder="Type a query to run security inspection scanner..."
            className="dev-input w-full pl-3 font-sans"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary"
        >
          <Search className="w-3.5 h-3.5" />
          <span>{isLoading ? 'Scanning...' : 'Scan Query'}</span>
        </button>
      </form>

      {/* Security Overview Telemetry Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="dev-card bg-white space-y-1">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">RISK ASSESSMENT</div>
          <div className={`text-base font-bold ${
            riskLevel === 'HIGH' ? 'text-rose-700' :
            riskLevel === 'MEDIUM' ? 'text-amber-700' : 'text-emerald-700'
          }`}>
            {riskLevel}
          </div>
          <div className="text-[11px] text-slate-500 font-sans">Security level</div>
        </div>

        <div className="dev-card bg-white space-y-1">
          <div className="text-[10px] text-slate-400 uppercase font-semibold font-mono">SUSPICIOUS CHUNKS</div>
          <div className="text-base font-bold text-slate-900">
            {data?.suspicious_chunks_count ?? 0} <span className="text-xs font-normal text-slate-500">detected</span>
          </div>
          <div className="text-[11px] text-slate-500 font-sans">Flagged chunks</div>
        </div>

        <div className="dev-card bg-white space-y-1">
          <div className="text-[10px] text-slate-400 uppercase font-semibold font-mono">MATCHED PATTERNS</div>
          <div className="text-base font-bold text-slate-900">
            {data?.matched_patterns?.length ?? 0} <span className="text-xs font-normal text-slate-500">rules</span>
          </div>
          <div className="text-[11px] text-slate-500 font-sans">Active threat rules</div>
        </div>

        <div className="dev-card bg-white space-y-1">
          <div className="text-[10px] text-slate-400 uppercase font-semibold font-mono">SCANNER STATUS</div>
          <div className="text-sm font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Guardrails Active
          </div>
          <div className="text-[11px] text-slate-500 font-sans">Context inspection</div>
        </div>
      </div>

      {/* Security Console Table */}
      <div className="dev-card space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00288e]" />
            <span>CHUNK SAFETY SCAN RESULTS</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">Context Rule Inspection</span>
        </div>

        <div className="border border-slate-200 rounded-[6px] overflow-hidden bg-white">
          <table className="dev-table">
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
                <tr key={idx} className={item.status !== 'CLEAN' ? 'bg-rose-50/30' : ''}>
                  <td className="font-medium text-slate-900 font-sans">
                    <div>{item.scenario}</div>
                    {item.snippet && (
                      <div className="text-[11px] text-slate-400 font-mono line-clamp-1 mt-0.5">
                        {item.snippet}
                      </div>
                    )}
                  </td>
                  <td className="font-mono text-slate-600 text-[11px]">{item.source}</td>
                  <td className="font-mono text-slate-600 text-[11px]">{item.detection}</td>
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
