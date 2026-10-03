import React, { useEffect } from 'react';
import { Terminal, History, FileText, BarChart2, FlaskConical, ShieldCheck, AlertCircle, Activity, X } from 'lucide-react';
import logoImage from '../../assets/nookbase-logo.png';

export type NavTab = 'analyze' | 'history' | 'documents' | 'evaluation' | 'experiments' | 'security';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  apiStatus: 'checking' | 'connected' | 'offline';
  documentCount?: number;
  chunkCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  apiStatus,
  documentCount = 0,
  chunkCount = 0,
  isOpen = false,
  onClose,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'analyze', label: 'Analyze', icon: <Terminal className="w-4 h-4" /> },
    { id: 'history', label: 'Run History', icon: <History className="w-4 h-4" /> },
    { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
    { id: 'evaluation', label: 'Evaluation', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'experiments', label: 'Experiments', icon: <FlaskConical className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleTabSelect = (tab: NavTab) => {
    onTabChange(tab);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation Container */}
      <aside
        aria-label="Sidebar Navigation"
        className={`w-[240px] fixed left-0 top-0 bottom-0 bg-[#f8fafc] border-r border-slate-200 flex flex-col justify-between z-40 font-sans select-none shadow-[1px_0_3px_rgba(0,0,0,0.02)] transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Top Header Logo Area */}
          <div className="h-13 px-4 border-b border-slate-200 flex items-center justify-between bg-white">
            <div className="flex items-center pr-2">
              <img src={logoImage} alt="NookBase Logo" className="h-7 w-auto object-contain" />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
                v1.0
              </span>
              {/* Close button for mobile screen */}
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close menu"
                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 lg:hidden focus:outline-none"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Corpus Index Summary Bar */}
          <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/80">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-slate-500 font-medium">Vector Index</span>
              <span className="text-slate-800 font-semibold">{documentCount} docs · {chunkCount} chunks</span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-2.5 space-y-1" aria-label="Main Navigation">
            <div className="px-2 py-1 text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
              WORKBENCH
            </div>
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabSelect(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-[6px] text-xs font-medium transition-all text-left min-h-[36px] ${
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
    </>
  );
};
