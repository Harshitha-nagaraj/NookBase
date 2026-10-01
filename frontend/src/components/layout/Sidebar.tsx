import React from 'react';
import { Terminal, History, FileText, BarChart2, FlaskConical, ShieldCheck, Settings, AlertCircle } from 'lucide-react';

export type NavTab = 'analyze' | 'history' | 'documents' | 'evaluation' | 'experiments' | 'security';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  apiStatus: 'checking' | 'connected' | 'offline';
  documentCount?: number;
  chunkCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  apiStatus,
  documentCount = 0,
  chunkCount = 0,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'analyze', label: 'Analyze', icon: <Terminal className="w-4 h-4" /> },
    { id: 'history', label: 'Run History', icon: <History className="w-4 h-4" /> },
    { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
    { id: 'evaluation', label: 'Evaluation', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'experiments', label: 'Experiments', icon: <FlaskConical className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-[240px] fixed left-0 top-0 bottom-0 bg-[#f5f5f0] border-r border-zinc-200 flex flex-col justify-between z-20 font-sans select-none">
      <div>
        {/* Top Header Area (48px height) */}
        <div className="h-12 px-4 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00288e]" />
            <span className="font-semibold text-sm tracking-tight text-zinc-900">RAG Debugger</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">v1.2</span>
        </div>

        {/* Subtitle / Observability badge */}
        <div className="px-4 py-2 border-b border-zinc-200/60 bg-zinc-100/40">
          <span className="text-[11px] text-zinc-500 font-medium">RAG observability platform</span>
        </div>

        {/* Metadata Section: Project & Index */}
        <div className="p-4 border-b border-zinc-200/80 space-y-3 font-mono text-xs">
          <div>
            <div className="text-[10px] uppercase text-zinc-400 font-semibold tracking-wider">Project</div>
            <div className="text-zinc-800 font-medium truncate mt-0.5">rag_debugger</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-zinc-400 font-semibold tracking-wider">Index</div>
            <div className="text-zinc-700 mt-0.5">
              {documentCount} docs · {chunkCount} chunks
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="p-2 space-y-0.5">
          <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-zinc-400 font-semibold tracking-wider">
            Navigation
          </div>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[4px] text-xs font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-[#00288e] text-white'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-zinc-500'}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area: API Status & Settings */}
      <div className="p-3 border-t border-zinc-200 space-y-2 bg-[#f0f0ea]">
        <div className="flex items-center justify-between text-xs px-2 py-1">
          <div className="flex items-center gap-1.5">
            {apiStatus === 'connected' && (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-zinc-700 font-mono text-[11px]">API Connected</span>
              </>
            )}
            {apiStatus === 'checking' && (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span className="text-zinc-600 font-mono text-[11px]">Checking API...</span>
              </>
            )}
            {apiStatus === 'offline' && (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-red-700 font-mono text-[11px]">API Offline</span>
              </>
            )}
          </div>
          <span className="text-[10px] font-mono text-zinc-400">8000</span>
        </div>

        <button className="w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 transition-colors">
          <div className="flex items-center gap-2">
            <Settings className="w-3.5 h-3.5 text-zinc-500" />
            <span>Settings</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400">Ctrl+,</span>
        </button>
      </div>
    </aside>
  );
};
