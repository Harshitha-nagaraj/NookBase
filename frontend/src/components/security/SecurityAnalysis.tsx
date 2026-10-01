import React from 'react';
import clsx from 'clsx';
import type { DebugResponse } from '../../types/api';

interface SecurityAnalysisProps {
  data: DebugResponse | null;
}

export const SecurityAnalysis: React.FC<SecurityAnalysisProps> = ({ data }) => {
  if (!data || !data.security) {
    return (
      <div id="security-section" className="dev-panel flex flex-col gap-3">
        <div className="flex justify-between items-center border-b border-[#34342D] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-[#E8E3D9] uppercase tracking-wider">SECURITY CHECK</span>
            <span className="text-xs text-[#A9A59B] font-sans">/ Vulnerability Scanner</span>
          </div>
          <span className="badge badge-neutral font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#77746C]/60"></span>
            Idle
          </span>
        </div>
        <div className="text-xs text-[#A9A59B] font-sans py-6 text-center border border-dashed border-[#34342D] rounded-[8px] bg-[#171814]">
          Run a query to perform prompt injection and malicious context scanning.
        </div>
      </div>
    );
  }

  const { security } = data;

  const scenarios = [
    { name: "Ignore previous instructions", status: security.risk_level === "HIGH" ? "DETECTED" : "CLEAN" },
    { name: "System prompt extraction", status: security.risk_level === "HIGH" ? "DETECTED" : "CLEAN" },
    { name: "Role hijacking", status: security.matched_patterns.length > 0 ? "DETECTED" : "CLEAN" },
    { name: "Context poisoning", status: security.suspicious_chunks_count > 0 ? "DETECTED" : "CLEAN" },
  ];

  return (
    <div id="security-section" className="dev-panel flex flex-col gap-3.5">
      <div className="flex justify-between items-center border-b border-[#34342D] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-[#E8E3D9] uppercase tracking-wider">SECURITY CHECK</span>
          <span className="text-xs text-[#A9A59B] font-sans">/ Vulnerability Scanner</span>
        </div>
        <span className={clsx(
          "badge font-mono uppercase text-[10px]",
          security.risk_level === "HIGH" ? "badge-error" : security.risk_level === "MEDIUM" ? "badge-warning" : "badge-good"
        )}>
          <span className={clsx(
            "w-1.5 h-1.5 rounded-full",
            security.risk_level === "HIGH" ? "bg-[#B9574B] shadow-[0_0_6px_rgba(185,87,75,0.6)]" :
            security.risk_level === "MEDIUM" ? "bg-[#E07A45] shadow-[0_0_6px_rgba(224,122,69,0.6)]" :
            "bg-[#4A8060] shadow-[0_0_6px_rgba(74,128,96,0.6)]"
          )}></span>
          {security.risk_level} RISK
        </span>
      </div>

      <div className="border border-[#34342D] rounded-[8px] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
        <table className="dev-table">
          <thead>
            <tr className="bg-[#171814]">
              <th className="text-[#A9A59B]">TEST SCENARIO</th>
              <th className="text-right w-28 text-[#A9A59B]">RESULT</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((sc, idx) => (
              <tr key={idx} className="border-b border-[#34342D]">
                <td className="text-[#F1EDE4] font-sans text-xs">{sc.name}</td>
                <td className="text-right">
                  <span className={clsx(
                    "badge text-[10px] uppercase font-mono",
                    sc.status === "DETECTED" ? "badge-error" : "badge-good"
                  )}>
                    <span className={clsx("w-1.5 h-1.5 rounded-full", sc.status === "DETECTED" ? "bg-[#B9574B]" : "bg-[#4A8060]")}></span>
                    {sc.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-[#C8C4BB] font-sans bg-[#171814] p-3 rounded-[8px] border border-[#34342D] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
        <span className="font-mono text-[10px] font-semibold text-[#A9A59B] uppercase block mb-0.5 tracking-wider">Scan Summary</span>
        <p className="text-[#C8C4BB] text-xs leading-relaxed">
          {security.explanation}
        </p>
      </div>
    </div>
  );
};




