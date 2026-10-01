from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

@dataclass
class RootCauseResult:
    primary_issue: str          # RETRIEVAL_FAILURE | CONTEXT_FAILURE | GENERATION_FAILURE | EFFICIENCY_ISSUE | NO_FAILURE
    secondary_issues: List[str] = field(default_factory=list)
    confidence: str = "MEDIUM"  # HIGH | MEDIUM | LOW (Qualitative diagnostic confidence)
    explanation: str = ""
    evidence: List[str] = field(default_factory=list)
    affected_stage: str = "NONE" # RETRIEVAL | CONTEXT | GENERATION | EFFICIENCY | NONE
    recommendation: str = ""
    counterfactual_summary: Optional[str] = None

class RootCauseEngine:
    """
    Analyzes multi-stage RAG diagnostic metrics (retrieval, context, generation, grounding, efficiency)
    to deterministically classify the primary root cause and secondary issues of a RAG failure.
    
    NOTE: Confidence is a qualitative diagnostic confidence score based on signal convergence,
    not a statistical probability.
    """
    def __init__(self):
        pass

    def analyze(self,
                query: str,
                answer: str,
                retrieval_report: Any,
                grounding_report: Any,
                efficiency_report: Any,
                raw_results: List[Dict[str, Any]],
                counterfactual_res: Optional[Dict[str, Any]] = None) -> RootCauseResult:

        # Safely extract metrics
        ret_status = getattr(retrieval_report, "status", "UNKNOWN") if retrieval_report else "UNKNOWN"
        ret_stats = getattr(retrieval_report, "statistics", {}) if retrieval_report else {}
        best_score = ret_stats.get("best_score", 0.0)
        retrieved_count = len(raw_results) if raw_results is not None else 0

        gr_status = getattr(grounding_report, "status", "NO_ANSWER") if grounding_report else "NO_ANSWER"
        gr_score = getattr(grounding_report, "groundedness_score", 0.0) if grounding_report else 0.0
        total_claims = getattr(grounding_report, "total_claims", 0) if grounding_report else 0
        supported_count = getattr(grounding_report, "supported_claims_count", 0) if grounding_report else 0
        partial_count = getattr(grounding_report, "partially_supported_claims_count", 0) if grounding_report else 0
        unsupported_count = getattr(grounding_report, "unsupported_claims_count", 0) if grounding_report else 0

        eff_status = getattr(efficiency_report, "efficiency_status", "GOOD") if efficiency_report else "GOOD"
        total_latency_ms = getattr(efficiency_report, "total_latency_ms", 0.0) if efficiency_report else 0.0
        input_tokens = getattr(efficiency_report, "estimated_input_tokens", 0) if efficiency_report else 0
        selected_count = getattr(efficiency_report, "selected_chunk_count", retrieved_count) if efficiency_report else retrieved_count

        evidence = []
        secondary_issues = []

        # --- PRIMARY ROOT CAUSE DETERMINATION ---
        
        # 1. RETRIEVAL_FAILURE
        is_retrieval_failure = False
        if retrieved_count == 0 or ret_status == "NO_RESULTS":
            is_retrieval_failure = True
            evidence.append("No chunks were retrieved for the query.")
        elif ret_status in ["WEAK", "LIKELY_RETRIEVAL_FAILURE"] and gr_status in ["NO_ANSWER", "UNSUPPORTED"]:
            is_retrieval_failure = True
            evidence.append(f"Retrieval diagnosis is {ret_status} with best similarity score {best_score:.4f}")
            evidence.append(f"Grounding status is {gr_status} (0% evidence match)")
        elif best_score < 0.38 and gr_status != "GROUNDED":
            is_retrieval_failure = True
            evidence.append(f"Best retrieval similarity score ({best_score:.4f}) is below threshold 0.38")
            evidence.append(f"Grounding status is {gr_status}")

        if is_retrieval_failure:
            primary_issue = "RETRIEVAL_FAILURE"
            affected_stage = "RETRIEVAL"
            confidence = "HIGH" if (retrieved_count == 0 or ret_status == "LIKELY_RETRIEVAL_FAILURE") else "MEDIUM"
            explanation = "Retrieval is the primary failure point. The retrieved context did not provide sufficient evidence for the query, and grounding could not verify an answer."
            recommendation = "Inspect retrieved chunks, query formulation, embedding similarity, and top-K configuration."

        # 2. CONTEXT_FAILURE
        elif best_score >= 0.38 and (gr_status == "UNSUPPORTED" or (unsupported_count > 0 and unsupported_count >= supported_count)):
            primary_issue = "CONTEXT_FAILURE"
            affected_stage = "CONTEXT"
            confidence = "HIGH" if (gr_status == "UNSUPPORTED" and best_score >= 0.50) else "MEDIUM"
            evidence.append(f"Retrieved chunks exist with best similarity score {best_score:.4f}")
            evidence.append(f"Grounding status is {gr_status} with {unsupported_count} unsupported claims out of {total_claims}")
            evidence.append(f"Selected context ({selected_count} chunks, {input_tokens} tokens) failed to ground generated statements")
            explanation = "Context selection is the primary failure point. Relevant retrieval occurred, but the context passed to generation did not sufficiently support the generated claims."
            recommendation = "Inspect which retrieved chunks are passed into the generation context, chunk formatting, and context window limits."

        # 3. GENERATION_FAILURE
        elif best_score >= 0.50 and (not answer or not answer.strip() or "cannot determine" in answer.lower()):
            primary_issue = "GENERATION_FAILURE"
            affected_stage = "GENERATION"
            confidence = "HIGH" if (not answer or not answer.strip()) else "MEDIUM"
            evidence.append(f"Relevant context chunks retrieved with strong similarity ({best_score:.4f})")
            evidence.append(f"Generator produced an empty answer or explicit refusal ('{answer[:50]}...')")
            explanation = "Generation is the primary failure point. Retrieval and context evidence were available, but no usable answer was produced."
            recommendation = "Inspect the generation prompt, generator configuration, and model context formatting."

        # 4. EFFICIENCY_ISSUE
        elif total_latency_ms > 1000.0 or input_tokens > 1500 or eff_status == "POTENTIALLY_INEFFICIENT":
            primary_issue = "EFFICIENCY_ISSUE"
            affected_stage = "EFFICIENCY"
            confidence = "HIGH" if (total_latency_ms > 1500.0 or input_tokens > 2000) else "MEDIUM"
            if total_latency_ms > 1000.0:
                evidence.append(f"Total latency ({total_latency_ms:.1f}ms) exceeds 1000ms threshold")
            if input_tokens > 1500:
                evidence.append(f"Context payload ({input_tokens} input tokens) is large")
            explanation = "Efficiency is the primary issue. RAG quality signals are acceptable, but latency or context payload is high."
            recommendation = "Inspect context size, retrieval latency, and unnecessary retrieved chunks."

        # 5. NO_FAILURE
        else:
            primary_issue = "NO_FAILURE"
            affected_stage = "NONE"
            confidence = "HIGH" if gr_status == "GROUNDED" else "MEDIUM"
            evidence.append(f"Retrieval status is {ret_status} with best score {best_score:.4f}")
            evidence.append(f"Grounding status is {gr_status} ({gr_score*100:.0f}% groundedness)")
            evidence.append(f"Total latency is optimal ({total_latency_ms:.1f}ms, {input_tokens} input tokens)")
            explanation = "No major failure detected in the current diagnostic signals. The pipeline executed within acceptable parameters."
            recommendation = "No major failure detected in the current diagnostic signals."

        # --- SECONDARY ISSUES COLLECTION ---
        if primary_issue != "EFFICIENCY_ISSUE" and (total_latency_ms > 800.0 or input_tokens > 1200 or eff_status == "POTENTIALLY_INEFFICIENT"):
            secondary_issues.append("EFFICIENCY_ISSUE")
        if primary_issue != "RETRIEVAL_FAILURE" and ret_status in ["WEAK", "LIKELY_RETRIEVAL_FAILURE"]:
            secondary_issues.append("WEAK_RETRIEVAL")
        if primary_issue != "CONTEXT_FAILURE" and unsupported_count > 0:
            secondary_issues.append("UNSUPPORTED_CLAIMS")

        # --- COUNTERFACTUAL INTEGRATION ---
        counterfactual_summary = None
        if counterfactual_res:
            cf_runs = counterfactual_res.get("counterfactual_runs", [])
            cf_count = len(cf_runs)
            orig_gr = gr_status
            
            # Check if any configuration changed grounding status
            changed_run = None
            for r in cf_runs[1:]:
                if r.get("grounding_status") != orig_gr and r.get("grounding_status") in ["GROUNDED", "PARTIALLY_GROUNDED"]:
                    changed_run = r
                    break
            
            if changed_run:
                counterfactual_summary = f"{cf_count} configurations were tested: {changed_run['name']} strategy changed the grounding outcome from {orig_gr} to {changed_run['grounding_status']}."
                evidence.append(f"Counterfactual evidence: {changed_run['name']} strategy improved grounding to {changed_run['grounding_status']}")
            else:
                counterfactual_summary = f"{cf_count} configurations were tested: No tested retrieval configuration changed the grounding outcome from {orig_gr}."
                evidence.append(f"Counterfactual evidence: All {cf_count} tested retrieval configurations produced status {orig_gr}")

        return RootCauseResult(
            primary_issue=primary_issue,
            secondary_issues=secondary_issues,
            confidence=confidence,
            explanation=explanation,
            evidence=evidence,
            affected_stage=affected_stage,
            recommendation=recommendation,
            counterfactual_summary=counterfactual_summary
        )
