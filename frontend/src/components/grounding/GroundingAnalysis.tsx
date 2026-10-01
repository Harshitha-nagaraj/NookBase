import React from 'react';
import clsx from 'clsx';
import type { DebugResponse } from '../../types/api';

interface GroundingAnalysisProps {
  data: DebugResponse | null;
}

export const GroundingAnalysis: React.FC<GroundingAnalysisProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="dev-panel flex flex-col gap-3">
        <div className="flex justify-between items-center border-b border-[#34342D] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-[#E8E3D9] uppercase tracking-wider">GROUNDING</span>
            <span className="text-xs text-[#A9A59B] font-sans">/ Evidence Verification</span>
          </div>
          <span className="badge badge-neutral font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#77746C]/60"></span>
            Idle
          </span>
        </div>
        <div className="text-xs text-[#A9A59B] font-sans py-6 text-center border border-dashed border-[#34342D] rounded-[8px] bg-[#171814]">
          Run a query to verify claims against retrieved context evidence.
        </div>
      </div>
    );
  }

  const { grounding } = data;
  const allClaims = grounding.claims && grounding.claims.length > 0
    ? grounding.claims
    : [...grounding.supported_claims, ...grounding.unsupported_claims];

  return (
    <div className="dev-panel flex flex-col gap-3.5">
      <div className="flex justify-between items-center border-b border-[#34342D] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-[#E8E3D9] uppercase tracking-wider">GROUNDING</span>
          <span className="text-xs text-[#A9A59B] font-sans">/ Evidence Verification</span>
        </div>
        
        <span className={clsx(
          "badge font-mono uppercase text-[10px]",
          grounding.status.includes("GROUNDED") ? "badge-good" : 
          grounding.status.includes("PARTIAL") ? "badge-warning" : "badge-error"
        )}>
          <span className={clsx(
            "w-1.5 h-1.5 rounded-full",
            grounding.status.includes("GROUNDED") ? "bg-[#4A8060] shadow-[0_0_6px_rgba(74,128,96,0.6)]" : 
            grounding.status.includes("PARTIAL") ? "bg-[#E07A45] shadow-[0_0_6px_rgba(224,122,69,0.6)]" : "bg-[#B9574B] shadow-[0_0_6px_rgba(185,87,75,0.6)]"
          )}></span>
          {grounding.status}
        </span>
      </div>

      <div className="text-xs text-[#C8C4BB] font-sans bg-[#171814] p-3 rounded-[8px] border border-[#34342D] leading-relaxed shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] space-y-1">
        <span className="text-[#A9A59B] font-mono uppercase text-[10px] font-semibold block tracking-wider">Verification Summary</span>
        <p>{grounding.explanation}</p>
        <p className="text-[10px] text-[#A9A59B] italic font-mono pt-1">
          Groundedness: {Math.round((grounding.groundedness_score ?? 0) * 100)}% (Heuristic semantic similarity)
        </p>
      </div>

      <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[320px] pr-0.5">
        {allClaims.length === 0 ? (
          <div className="text-xs text-[#A9A59B] font-sans p-3 text-center border border-[#34342D] rounded-[8px] bg-[#171814]">
            No factual claims extracted for verification.
          </div>
        ) : (
          allClaims.map((claim, idx) => {
            const statusStr = claim.status || (claim.supported ? 'SUPPORTED' : 'UNSUPPORTED');
            const isGood = statusStr === 'SUPPORTED';
            const isPartial = statusStr === 'PARTIALLY_SUPPORTED';

            return (
              <div 
                key={idx} 
                className={clsx(
                  "p-3 rounded-[8px] border text-xs font-sans flex flex-col gap-2 transition-all duration-150",
                  isGood ? "bg-[#171814] border-[#34342D] shadow-[0_2px_8px_rgba(0,0,0,0.15)]" :
                  isPartial ? "bg-[#272017] border-[#E07A45]/40 shadow-[0_2px_8px_rgba(0,0,0,0.2)]" :
                  "bg-[#2B1716] border-[#B9574B]/40 shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] font-bold text-[#A9A59B] uppercase tracking-wider">CLAIM 0{idx + 1}</span>
                    <span className="font-normal text-xs text-[#F1EDE4] leading-relaxed">
                      "{claim.claim_text || claim.claim}"
                    </span>
                  </div>

                  <span className={clsx(
                    "badge shrink-0 font-mono text-[10px] uppercase",
                    isGood ? "badge-good" : isPartial ? "badge-warning" : "badge-error"
                  )}>
                    <span className={clsx("w-1.5 h-1.5 rounded-full", isGood ? "bg-[#4A8060]" : isPartial ? "bg-[#E07A45]" : "bg-[#B9574B]")}></span>
                    {statusStr}
                  </span>
                </div>
                
                {(isGood || isPartial) && (claim.evidence_chunk_id || (claim.supporting_chunks && claim.supporting_chunks.length > 0)) && (
                  <div className="pt-2 border-t border-[#34342D] flex items-center justify-between text-[11px] text-[#A9A59B] font-mono">
                    <div>
                      <span>Source: </span>
                      <strong className="text-[#F1EDE4]">
                        {claim.evidence_source || (claim.supporting_chunks && claim.supporting_chunks.length > 0 ? claim.supporting_chunks[0].source : claim.evidence_chunk_id)}
                      </strong>
                    </div>
                    <div>
                      <span>Score: </span>
                      <strong className="text-[#4A8060] font-semibold">{claim.support_score ? claim.support_score.toFixed(3) : '0.000'}</strong>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

};





