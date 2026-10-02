import React from 'react';
import { Terminal, History, FileText, BarChart2, FlaskConical, ShieldCheck, AlertCircle, Activity, Cpu } from 'lucide-react';

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
  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'analyze', label: 'Analyze', icon: <Terminal className="w-4 h-4" /> },
    { id: 'history', label: 'Run History', icon: <History className="w-4 h-4" /> },
    { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
    { id: 'evaluation', label: 'Evaluation', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'experiments', label: 'Experiments', icon: <FlaskConical className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-[240px] fixed left-0 top-0 bottom-0 bg-[#f8fafc] border-r border-slate-200 flex flex-col justify-between z-20 font-sans select-none shadow-[1px_0_3px_rgba(0,0,0,0.02)]">
      <div>
        {/* Top Header Logo Area */}
        <div className="h-13 px-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-[5px] bg-[#00288e] flex items-center justify-center text-white font-bold shadow-sm">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xs tracking-tight text-slate-900 leading-none">NookBase</span>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5">Observability Workstation</span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
            v1.0
          </span>
        </div>

        {/* Corpus Index Summary Bar */}
        <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-slate-500 font-medium">Vector Index</span>
            <span className="text-slate-800 font-semibold">{documentCount} docs · {chunkCount} chunks</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-2.5 space-y-1">
          <div className="px-2 py-1 text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
            WORKBENCH
          </div>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-[6px] text-xs font-medium transition-all text-left ${
                  isActive
                    ? 'bg-[#00288e] text-white shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={isActive ? 'text-white' : 'text-slate-500'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom System Status Section */}
      <div className="p-3 border-t border-slate-200 bg-white space-y-2">
        <div className="px-1 text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
          SYSTEM
        </div>
        <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-[5px] bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-2">
            {apiStatus === 'connected' && (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-slate-800 font-mono text-[11px] font-medium">API Connected</span>
              </>
            )}
            {apiStatus === 'checking' && (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-slate-600 font-mono text-[11px]">Connecting...</span>
              </>
            )}
            {apiStatus === 'offline' && (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                <span className="text-rose-700 font-mono text-[11px]">API Offline</span>
              </>
            )}
          </div>
          <span className="text-[10px] font-mono text-slate-400">v1.0</span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-1 font-mono">
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-slate-400" /> Health OK
          </span>
          <span>v1.0</span>
        </div>
      </div>
    </aside>
  );
};
