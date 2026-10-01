import React from 'react';
import clsx from 'clsx';

interface TopNavProps {
  apiStatus: 'checking' | 'connected' | 'offline';
}

export const TopNav: React.FC<TopNavProps> = ({ apiStatus }) => {
  return (
    <header className="h-12 border-b border-[#34342D] bg-[#171814] flex items-center justify-between px-5 sticky top-0 z-50 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-sm text-[#F1EDE4] tracking-tight font-sans flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C96B3C] shadow-[0_0_8px_rgba(201,107,60,0.6)]"></span>
            RAG Debugger
          </span>
          <span className="text-[11px] text-[#A9A59B] hidden sm:inline-block border-l border-[#34342D] pl-2.5 font-sans">
            Observability & Trace
          </span>
        </div>

        {/* Clean Functional Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 border-l border-[#34342D] pl-4 text-xs font-medium text-[#A9A59B]">
          <a 
            href="#query-workspace" 
            className="relative px-3 py-1 rounded-[6px] text-[#E07A45] bg-[#302019] font-medium border border-[#C96B3C]/30 transition-all duration-150 after:absolute after:bottom-[-2px] after:left-2 after:right-2 after:h-[2px] after:bg-[#C96B3C] after:rounded-full"
          >
            Analyze
          </a>
          <a href="#evaluation-section" className="px-3 py-1 rounded-[6px] hover:bg-[#24231E] hover:text-[#F1EDE4] transition-all duration-150">Evaluation</a>
          <a href="#benchmarks-section" className="px-3 py-1 rounded-[6px] hover:bg-[#24231E] hover:text-[#F1EDE4] transition-all duration-150">Experiments</a>
          <a href="#documents-section" className="px-3 py-1 rounded-[6px] hover:bg-[#24231E] hover:text-[#F1EDE4] transition-all duration-150">Documents</a>
          <a href="#security-section" className="px-3 py-1 rounded-[6px] hover:bg-[#24231E] hover:text-[#F1EDE4] transition-all duration-150">Security</a>
        </nav>
      </div>
      
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2 text-[11px] bg-[#1D1E1A] px-2.5 py-1 rounded-[6px] border border-[#34342D] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
          <span className="text-[#77746C] font-mono text-[10px]">API</span>
          <span className={clsx(
            "w-1.5 h-1.5 rounded-full transition-all",
            apiStatus === 'checking' && "bg-[#C58A45] animate-pulse shadow-[0_0_6px_rgba(197,138,69,0.5)]",
            apiStatus === 'connected' && "bg-[#4A8060] shadow-[0_0_6px_rgba(74,128,96,0.6)]",
            apiStatus === 'offline' && "bg-[#B9574B] shadow-[0_0_6px_rgba(185,87,75,0.6)]"
          )} />
          <span className="font-mono text-[#F1EDE4] font-semibold uppercase text-[10px]">
            {apiStatus === 'connected' ? 'Connected' : apiStatus === 'checking' ? 'Connecting...' : 'Offline'}
          </span>
        </div>
      </div>
    </header>
  );
};





