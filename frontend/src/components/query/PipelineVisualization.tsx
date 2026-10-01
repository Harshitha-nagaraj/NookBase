import React from 'react';
import { ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import type { DebugResponse } from '../../types/api';

interface PipelineVisualizationProps {
  data: DebugResponse | null;
  isLoading: boolean;
}

export const PipelineVisualization: React.FC<PipelineVisualizationProps> = ({ data, isLoading }) => {
  const getBadgeClass = (status: string | undefined) => {
    if (isLoading) return "badge-warning";
    if (!status) return "badge-neutral";
    if (status.includes("GOOD") || status.includes("GROUNDED") || status.includes("COMPLETED") || status.includes("BUILT") || status.includes("GENERATED") || status.includes("LOW") || status === "OK") {
      return "badge-good";
    }
    if (status.includes("WEAK") || status.includes("PARTIAL") || status.includes("MEDIUM") || status === "WARN") {
      return "badge-warning";
    }
    return "badge-error";
  };

  const hasSecurityFindings = Boolean(
    data?.security && (
      (data.security.finding_count && data.security.finding_count > 0) ||
      (data.security.affected_chunks && data.security.affected_chunks > 0) ||
      (data.security.risk_level && data.security.risk_level !== 'NONE')
    )
  );

  const steps = [
    {
      id: 'query',
      label: 'QUERY',
      val: data ? `${data.query.length} chars` : 'Idle',
      sub: null,
      status: data ? 'OK' : null
    },
    {
      id: 'embedding',
      label: 'EMBEDDING',
      val: data ? '384 dims' : 'Idle',
      sub: 'Dense vector',
      status: data ? 'OK' : null
    },
    {
      id: 'retrieval',
      label: 'RETRIEVAL',
      val: data ? `${data.retrieval.results.length} chunks` : 'Idle',
      sub: data?.efficiency.retrieval_latency_ms ? `${data.efficiency.retrieval_latency_ms.toFixed(1)}ms` : null,
      status: data?.diagnosis.retrieval
    },
    {
      id: 'context',
      label: 'CONTEXT',
      val: data ? `${data.efficiency.estimated_input_tokens} tok` : 'Idle',
      sub: data ? 'Prompt built' : null,
      status: data ? 'BUILT' : null
    },
    {
      id: 'security',
      label: 'SECURITY',
      val: data?.security ? `${data.security.affected_chunks ?? data.security.suspicious_chunks_count} flagged` : 'Idle',
      sub: data?.security?.risk_level ? `${data.security.risk_level} risk` : null,
      status: data?.security ? (hasSecurityFindings ? 'AFFECTED' : 'OK') : null
    },
    {
      id: 'generation',
      label: 'GENERATION',
      val: data ? `${data.efficiency.estimated_output_tokens} tok` : 'Idle',
      sub: data?.efficiency.generation_latency_ms ? `${data.efficiency.generation_latency_ms.toFixed(1)}ms` : null,
      status: data ? 'COMPLETED' : null
    },
    {
      id: 'grounding',
      label: 'GROUNDING',
      val: data ? `${(data.grounding.supported_claims_count ?? data.grounding.supported_claims.length) + (data.grounding.partially_supported_claims_count ?? 0)}/${data.grounding.total_claims ?? (data.grounding.supported_claims.length + data.grounding.unsupported_claims.length)} claims` : 'Idle',
      sub: data?.grounding.status,
      status: data?.diagnosis.grounding
    }
  ];

  return (
    <div className="dev-panel flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-[#34342D] pb-2">
        <div className="flex items-center gap-2 font-mono text-xs text-[#F1EDE4]">
          <span className="font-semibold uppercase tracking-wider text-[#E8E3D9]">EXECUTION TRACE</span>
          <span className="text-[#A9A59B] font-sans text-xs">/ Pipeline Sequence</span>
        </div>
        {data && (
          <div className="text-xs font-mono text-[#A9A59B] flex items-center gap-2">
            <span>total_latency:</span>
            <span className="font-semibold text-[#4A8060] bg-[#1B2B22] px-2 py-0.5 rounded-[6px] border border-[#315B45]/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
              {data.efficiency.total_latency_ms.toFixed(1)} ms
            </span>
          </div>
        )}
      </div>

      {/* Dense Observability Trace Flow */}
      <div className="bg-[#171814] border border-[#34342D] rounded-[9px] p-2.5 flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 overflow-x-auto shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
        {steps.map((step, idx) => {
          const isActive = isLoading;
          const isDone = Boolean(data && step.status);
          const affectedStage = data?.root_cause?.affected_stage;
          const isAffected = Boolean(
            (affectedStage && (
              affectedStage.toLowerCase() === step.id ||
              (affectedStage === 'EFFICIENCY' && (step.id === 'retrieval' || step.id === 'context' || step.id === 'generation'))
            )) || (step.id === 'security' && hasSecurityFindings)
          );

          return (
            <React.Fragment key={step.id}>
              <div 
                className={clsx(
                  "flex items-center gap-2.5 flex-1 min-w-[135px] shrink-0 p-2.5 rounded-[8px] border transition-all duration-150 relative",
                  isAffected && "ring-2 ring-red-500 border-red-500/80 bg-red-950/20 shadow-[0_0_12px_rgba(239,68,68,0.25)]",
                  !isAffected && isActive && "bg-[#302019] border-[#C96B3C]/60 shadow-[0_0_12px_rgba(201,107,60,0.15)]",
                  !isAffected && isDone && "bg-[#1B2B22] border-[#315B45]/70 shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.04)]",
                  !isAffected && !isActive && !isDone && "bg-[#24231E] border-[#34342D] text-[#77746C]"
                )}
              >
                <div className="flex flex-col w-full gap-0.5">
                  <div className="flex items-center justify-between gap-1.5 w-full">
                    <span className="font-mono text-[10px] font-bold text-[#A9A59B] tracking-wider flex items-center gap-1">
                      <span>{step.label}</span>
                      {isAffected && (
                        <span className="text-[8px] bg-red-600 text-white font-mono px-1 py-0.2 rounded font-bold uppercase tracking-normal">
                          AFFECTED
                        </span>
                      )}
                    </span>
                    {step.status ? (
                      <span className={clsx("badge text-[9px] px-1.5 py-0 uppercase font-mono rounded-[4px]", getBadgeClass(step.status))}>
                        {step.status.length > 10 ? step.status.substring(0, 10) : step.status}
                      </span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#77746C]/40"></span>
                    )}
                  </div>
                  <span className="text-xs font-mono font-bold text-[#F1EDE4] tracking-tight">{step.val}</span>
                  {step.sub && <span className="text-[10px] font-sans text-[#A9A59B] truncate">{step.sub}</span>}
                </div>
              </div>
              {idx < steps.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-[#77746C]/60 shrink-0 hidden sm:block" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
