import React from 'react';
import { RefreshCw, Settings, User, Activity } from 'lucide-react';
import type { NavTab } from './Sidebar';

interface TopBarProps {
  activeTab: NavTab;
  runId?: string;
  latencyMs?: number;
  apiStatus: 'checking' | 'connected' | 'offline';
  onRefresh?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  runId = 'Run #042',
  latencyMs = 37.2,
  apiStatus,
  onRefresh,
}) => {
  const getTabBreadcrumb = (tab: NavTab) => {
    switch (tab) {
      case 'analyze':
        return 'Workbench';
      case 'documents':
        return 'Documents';
      case 'evaluation':
        return 'Evaluation';
      case 'experiments':
        return 'Experiments';
      case 'security':
        return 'Security';
      default:
        return 'Workbench';
    }
  };

  return (
    <header className="ml-[240px] fixed top-0 right-0 left-0 h-12 bg-white/95 backdrop-blur-sm border-b border-zinc-200 px-6 flex items-center justify-between z-10 font-sans">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-zinc-500 font-medium">RAG Debugger</span>
        <span className="text-zinc-300">/</span>
        <span className="text-zinc-900 font-semibold">{getTabBreadcrumb(activeTab)}</span>
      </div>

      {/* Right Tools & Metadata */}
      <div className="flex items-center gap-4 text-xs font-mono text-zinc-600">
        {/* Run Metadata */}
        <div className="flex items-center gap-3 border-r border-zinc-200 pr-4">
          <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 text-[11px] font-semibold">
            {runId}
          </span>
          <div className="flex items-center gap-1 text-zinc-500 text-[11px]">
            <Activity className="w-3 h-3 text-[#00288e]" />
            <span>{latencyMs.toFixed(1)} ms</span>
          </div>
        </div>

        {/* Connection Status Indicator */}
        <div className="flex items-center gap-1.5 border-r border-zinc-200 pr-4">
          <span
            className={`w-2 h-2 rounded-full ${
              apiStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'
            }`}
          />
          <span className="text-[11px] text-zinc-700">
            {apiStatus === 'connected' ? 'Connected' : 'Connecting...'}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onRefresh}
            title="Refresh active view"
            className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded transition-colors flex items-center gap-1 text-[11px] font-sans"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            title="Settings"
            className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* User Icon Avatar */}
          <div className="w-6 h-6 rounded-full bg-[#00288e] text-white flex items-center justify-center font-bold text-[10px] ml-1">
            <User className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </header>
  );
};
