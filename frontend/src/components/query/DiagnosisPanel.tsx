import React from 'react';
import clsx from 'clsx';
import type { DebugResponse } from '../../types/api';

interface DiagnosisPanelProps {
  data: DebugResponse | null;
}

export const DiagnosisPanel: React.FC<DiagnosisPanelProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="dev-panel flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-[#34342D] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-[#E8E3D9] uppercase tracking-wider">DIAGNOSIS</span>
            <span className="text-xs text-[#A9A59B] font-sans">/ Automated Checks</span>
          </div>
          <span className="badge badge-neutral font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#77746C]/60"></span>
            Idle
          </span>
        </div>
        <div className="text-xs text-[#A9A59B] font-sans py-5 text-center border border-dashed border-[#34342D] rounded-[8px] bg-[#171814]">
          No query executed. Run a query to inspect automated diagnostic checks.
        </div>
      </div>
    );
  }

  const { retrieval, grounding, efficiency, security } = data;

  const isGood = 
    retrieval.status.includes("GOOD") && 
    grounding.status.includes("GROUNDED") && 
    efficiency.efficiency_status.includes("OPTIMAL") &&
    (!security || security.risk_level === "LOW");

  return (
    <div className="dev-panel flex flex-col gap-3.5">
      <div className="flex items-center justify-between border-b border-[#34342D] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-[#E8E3D9] uppercase tracking-wider">DIAGNOSIS</span>
          <span className="text-xs text-[#A9A59B] font-sans">/ Automated Checks</span>
        </div>
        <span className={clsx("badge font-mono uppercase text-[10px]", isGood ? "badge-good" : "badge-warning")}>
          <span className={clsx(
            "w-1.5 h-1.5 rounded-full",
            isGood ? "bg-[#4A8060] shadow-[0_0_6px_rgba(74,128,96,0.6)]" : "bg-[#E07A45] shadow-[0_0_6px_rgba(224,122,69,0.6)]"
          )}></span>
          {isGood ? "HEALTHY" : "ISSUES DETECTED"}
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {/* Retrieval Diagnosis */}
        <div className="bg-[#171814] border border-[#34342D] rounded-[8px] p-3 flex flex-col gap-1.5 font-sans text-xs shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] transition-all">
          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-[#A9A59B] font-semibold uppercase tracking-tight">RETRIEVAL QUALITY</span>
            <span className={retrieval.status.includes("GOOD") ? "text-[#4A8060] font-bold flex items-center gap-1.5" : "text-[#E07A45] font-bold flex items-center gap-1.5"}>
              <span className={clsx("w-1.5 h-1.5 rounded-full", retrieval.status.includes("GOOD") ? "bg-[#4A8060]" : "bg-[#E07A45]")} />
              {retrieval.status}
            </span>
          </div>
          <div className="text-[#C8C4BB] text-xs leading-relaxed font-sans">
            Top-ranked context is relevant. Best score <strong className="font-mono text-[#F1EDE4]">{retrieval.best_score.toFixed(4)}</strong> across {retrieval.results.length} retrieved chunks.
          </div>
        </div>

        {/* Grounding Diagnosis */}
        <div className="bg-[#171814] border border-[#34342D] rounded-[8px] p-3 flex flex-col gap-1.5 font-sans text-xs shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] transition-all">
          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-[#A9A59B] font-semibold uppercase tracking-tight">GROUNDING VERIFICATION</span>
            <span className={clsx(
              "font-bold flex items-center gap-1.5",
              grounding.status.includes("GROUNDED") ? "text-[#4A8060]" : 
              grounding.status.includes("PARTIAL") ? "text-[#E07A45]" : "text-[#B9574B]"
            )}>
              <span className={clsx("w-1.5 h-1.5 rounded-full", grounding.status.includes("GROUNDED") ? "bg-[#4A8060]" : grounding.status.includes("PARTIAL") ? "bg-[#E07A45]" : "bg-[#B9574B]")} />
              {grounding.status}
            </span>
          </div>
          <div className="text-[#C8C4BB] text-xs leading-relaxed font-sans">
            {grounding.explanation}
          </div>
          <div className="text-[#A9A59B] text-[11px] font-mono pt-1.5 border-t border-[#34342D]/60 flex items-center justify-between">
            <span>Claims extracted:</span>
            <span><strong className="text-[#4A8060]">{grounding.supported_claims.length}</strong> supported, <strong className="text-[#B9574B]">{grounding.unsupported_claims.length}</strong> unsupported</span>
          </div>
        </div>

        {/* Efficiency Diagnosis */}
        <div className="bg-[#171814] border border-[#34342D] rounded-[8px] p-3 flex flex-col gap-1.5 font-sans text-xs shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] transition-all">
          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-[#A9A59B] font-semibold uppercase tracking-tight">EFFICIENCY & LATENCY</span>
            <span className="text-[#F1EDE4] font-bold">{efficiency.efficiency_status}</span>
          </div>
          <div className="text-[#C8C4BB] text-xs font-sans">
            Total latency: <strong className="font-mono text-[#F1EDE4]">{efficiency.total_latency_ms.toFixed(1)} ms</strong> (<span className="font-mono text-[#A9A59B]">{efficiency.retrieval_latency_ms.toFixed(1)}ms</span> retrieval, <span className="font-mono text-[#A9A59B]">{efficiency.generation_latency_ms.toFixed(1)}ms</span> generation).
          </div>
          {efficiency.warnings.length > 0 && (
            <div className="text-[#E07A45] bg-[#302019] border border-[#C96B3C]/40 p-2.5 rounded-[6px] mt-1 font-sans text-[11px]">
              <span className="font-semibold font-mono uppercase text-[#E07A45] block mb-0.5">Warnings:</span>
              <ul className="list-disc pl-4 space-y-0.5 text-[#C8C4BB]">
                {efficiency.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Security Diagnosis */}
        {security && (
          <div className="bg-[#171814] border border-[#34342D] rounded-[8px] p-3 flex flex-col gap-1.5 font-sans text-xs shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] transition-all">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-[#A9A59B] font-semibold uppercase tracking-tight">SECURITY RISK SCAN</span>
              <span className={clsx(
                "font-bold flex items-center gap-1.5",
                security.risk_level === "HIGH" ? "text-[#B9574B]" :
                security.risk_level === "MEDIUM" ? "text-[#E07A45]" : "text-[#4A8060]"
              )}>
                <span className={clsx("w-1.5 h-1.5 rounded-full", security.risk_level === "HIGH" ? "bg-[#B9574B]" : security.risk_level === "MEDIUM" ? "bg-[#E07A45]" : "bg-[#4A8060]")} />
                {security.risk_level} RISK
              </span>
            </div>
            <div className="text-[#C8C4BB] text-xs font-sans">
              {security.explanation}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};




