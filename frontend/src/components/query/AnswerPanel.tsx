import React from 'react';
import clsx from 'clsx';
import type { DebugResponse } from '../../types/api';

interface AnswerPanelProps {
  data: DebugResponse | null;
}

export const AnswerPanel: React.FC<AnswerPanelProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="dev-panel flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-[#34342D] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-[#E8E3D9] uppercase tracking-wider">GENERATED RESPONSE</span>
            <span className="text-xs text-[#A9A59B] font-sans">/ LLM Output</span>
          </div>
          <span className="badge badge-neutral font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#77746C]/60"></span>
            Idle
          </span>
        </div>
        <div className="text-xs text-[#A9A59B] font-sans py-8 text-center border border-dashed border-[#34342D] rounded-[8px] bg-[#171814]">
          Run a query in the workspace to inspect generated response text.
        </div>
      </div>
    );
  }

  const isNoAnswer = data.answer.toLowerCase().includes("cannot determine");
  const isUnsupported = data.grounding.status.includes("UNSUPPORTED");
  
  return (
    <div className="dev-panel flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-[#34342D] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-[#E8E3D9] uppercase tracking-wider">GENERATED RESPONSE</span>
          <span className="text-xs text-[#A9A59B] font-sans">/ LLM Output</span>
        </div>
        <div>
          {isNoAnswer ? (
             <span className="badge badge-warning uppercase font-mono text-[10px]">
               <span className="w-1.5 h-1.5 rounded-full bg-[#E07A45] shadow-[0_0_6px_rgba(224,122,69,0.6)]"></span>
               No Answer
             </span>
          ) : isUnsupported ? (
             <span className="badge badge-error uppercase font-mono text-[10px]">
               <span className="w-1.5 h-1.5 rounded-full bg-[#B9574B] shadow-[0_0_6px_rgba(185,87,75,0.6)]"></span>
               Unsupported
             </span>
          ) : (
             <span className="badge badge-good uppercase font-mono text-[10px]">
               <span className="w-1.5 h-1.5 rounded-full bg-[#4A8060] shadow-[0_0_6px_rgba(74,128,96,0.6)]"></span>
               Grounded
             </span>
          )}
        </div>
      </div>
      
      <div className={clsx(
        "p-3.5 rounded-[8px] border text-xs font-sans leading-relaxed whitespace-pre-wrap text-[#F1EDE4] shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] transition-all",
        isNoAnswer ? "bg-[#302019] border-[#C96B3C]/40 text-[#F1EDE4]" :
        isUnsupported ? "bg-[#2B1716] border-[#B9574B]/40 text-[#F1EDE4]" :
        "bg-[#171814] border-[#34342D]"
      )}>
        {data.answer}
      </div>
    </div>
  );
};





