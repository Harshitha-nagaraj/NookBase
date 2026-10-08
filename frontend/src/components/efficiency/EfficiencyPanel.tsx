import React from 'react';
import type { DebugResponse } from '../../types/api';

interface EfficiencyPanelProps {
  data: DebugResponse | null;
}

export const EfficiencyPanel: React.FC<EfficiencyPanelProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="dev-panel flex flex-col gap-3">
        <div className="flex justify-between items-center border-b border-[#34342D] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-[#E8E3D9] uppercase tracking-wider">CONTEXT EFFICIENCY</span>
            <span className="text-xs text-[#A9A59B] font-sans">/ Token Usage</span>
          </div>
          <span className="badge badge-neutral font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#77746C]/60"></span>
            Idle
          </span>
        </div>
        <div className="text-xs text-[#A9A59B] font-sans py-6 text-center border border-dashed border-[#34342D] rounded-[8px] bg-[#171814]">
          Run a query to inspect token usage, stage latencies, and context reduction.
        </div>
      </div>
    );
  }

  const { efficiency, retrieval } = data;

  const metrics = [
    { label: "Input tokens", value: efficiency.estimated_input_tokens, unit: "" },
    { label: "Output tokens", value: efficiency.estimated_output_tokens, unit: "" },
    { label: "Total tokens", value: efficiency.total_estimated_tokens, unit: "", bold: true },
    { label: "Retrieved chunks", value: retrieval.results.length, unit: "" },
    { label: "Retrieval latency", value: efficiency.retrieval_latency_ms.toFixed(1), unit: "ms" },
    { label: "Security latency", value: (efficiency.security_latency_ms ?? 0).toFixed(1), unit: "ms" },
    { label: "Generation latency", value: efficiency.generation_latency_ms.toFixed(1), unit: "ms" },
    { label: "Grounding latency", value: (efficiency.grounding_latency_ms ?? 0).toFixed(1), unit: "ms" },
    { label: "Total latency", value: efficiency.total_latency_ms.toFixed(1), unit: "ms", bold: true },
  ];

  return (
    <div className="dev-panel flex flex-col gap-3.5">
      <div className="flex justify-between items-center border-b border-[#34342D] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-[#E8E3D9] uppercase tracking-wider">CONTEXT EFFICIENCY</span>
          <span className="text-xs text-[#A9A59B] font-sans">/ Token Usage</span>
        </div>
        <span className="badge badge-good font-mono text-[10px] uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4A8060] shadow-[0_0_6px_rgba(74,128,96,0.6)]"></span>
          {efficiency.efficiency_status}
        </span>
      </div>

      {/* Context Reduction Line */}
      <div className="bg-[#302019] border border-[#C96B3C]/40 rounded-[8px] p-2.5 flex items-center justify-between text-xs font-sans shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
        <span className="text-[#F1EDE4] font-medium text-xs">Context compression / reduction:</span>
        <span className="font-mono font-bold text-[#E07A45] text-xs bg-[#171814] px-2 py-0.5 rounded-[4px] border border-[#C96B3C]/40 shadow-[0_2px_6px_rgba(0,0,0,0.2)]">
          {efficiency.context_reduction_percentage.toFixed(1)}%
        </span>
      </div>

      {/* Technical Metrics Table */}
      <div className="border border-[#34342D] rounded-[8px] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
        <table className="dev-table">
          <tbody>
            {metrics.map((m, idx) => (
              <tr key={idx}>
                <td className="text-[#A9A59B] text-xs font-sans">{m.label}</td>
                <td className={`text-right font-mono text-xs ${m.bold ? 'font-bold text-[#F1EDE4]' : 'text-[#C8C4BB]'}`}>
                  {m.value} {m.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};





