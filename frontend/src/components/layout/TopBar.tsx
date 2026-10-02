import React from 'react';
import { RefreshCw, Activity, AlertCircle, Menu } from 'lucide-react';
import type { NavTab } from './Sidebar';

interface TopBarProps {
  activeTab: NavTab;
  runId?: string;
  latencyMs?: number;
  apiStatus: 'checking' | 'connected' | 'offline';
  onRefresh?: () => void;
  onMenuToggle?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  runId = 'Run #042',
  latencyMs = 37.2,
  apiStatus,
  onRefresh,
  onMenuToggle,
}) => {
  const getHeaderMeta = (tab: NavTab) => {
    switch (tab) {
      case 'analyze':
        return {
          title: 'Analyze',
          description: 'Inspect retrieval, grounding, context, and pipeline behavior',
        };
      case 'history':
        return {
          title: 'Run History',
          description: 'Audit log of past RAG queries, grounding diagnostic traces, and telemetry',
        };
      case 'documents':
        return {
          title: 'Documents',
          description: 'Indexed knowledge base corpus and vector chunk store',
        };
      case 'evaluation':
        return {
          title: 'Evaluation',
          description: 'System Quality Benchmarks, precision@k, recall@k, and hallucination scoring',
        };
      case 'experiments':
        return {
          title: 'Experiments',
          description: 'Engineering context optimization trade-offs and pipeline comparisons',
        };
      case 'security':
        return {
          title: 'Security',
          description: 'Prompt injection scanner, jailbreak detection, and chunk safety console',
        };
      default:
        return {
          title: 'Analyze',
          description: 'Inspect retrieval, grounding, context, and pipeline behavior',
        };
    }
  };

  const meta = getHeaderMeta(activeTab);

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-[240px] h-13 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between z-20 font-sans shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* Title, Hamburger Menu & Contextual Description */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            aria-label="Toggle navigation menu"
            className="p-1.5 -ml-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden focus:outline-none focus:ring-1 focus:ring-slate-300"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-sm font-bold text-slate-900 tracking-tight">{meta.title}</h1>
        <span className="text-slate-300 hidden sm:inline">|</span>
        <span className="text-xs text-slate-500 font-normal hidden md:inline truncate max-w-xs lg:max-w-md">{meta.description}</span>
      </div>

      {/* Connection & Telemetry Status & Refresh */}
      <div className="flex items-center gap-2 sm:gap-4 text-xs font-mono text-slate-600">
        {/* Run ID & Telemetry */}
        <div className="hidden md:flex items-center gap-3 border-r border-slate-200 pr-4">
          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold">
            {runId}
          </span>
          <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
            <Activity className="w-3.5 h-3.5 text-[#00288e]" />
            <span>{latencyMs.toFixed(1)} ms</span>
          </div>
        </div>

        {/* Connection Status Indicator */}
        <div className="flex items-center gap-1.5 border-r border-slate-200 pr-2 sm:pr-4">
          {apiStatus === 'connected' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium text-slate-700 hidden sm:inline">Connected</span>
            </>
          ) : apiStatus === 'checking' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span className="text-[11px] font-medium text-amber-700 hidden sm:inline">Checking...</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-[11px] font-medium text-rose-700 hidden sm:inline">Offline</span>
            </>
          )}
        </div>

        {/* Refresh Action */}
        <button
          onClick={onRefresh}
          title="Refresh connection & active view"
          className="px-2 sm:px-2.5 py-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition-colors flex items-center gap-1.5 text-[11px] font-sans font-medium min-h-[32px]"
        >
          <RefreshCw className="w-3 h-3 text-slate-500" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </header>
  );
};
