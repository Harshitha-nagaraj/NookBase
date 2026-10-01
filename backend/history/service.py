import datetime
from typing import List, Dict, Any, Optional
from backend.history.repository import RunHistoryRepository

class RunHistoryService:
    def __init__(self, repository: Optional[RunHistoryRepository] = None):
        self.repository = repository or RunHistoryRepository()

    def determine_failure_category(
        self,
        retrieval_status: str,
        grounding_status: str,
        efficiency_status: str,
        security_risk: str,
        strategy: str = "standard",
        removed_count: int = 0,
        top_rank_changed: bool = False
    ) -> str:
        ret_upper = (retrieval_status or "").upper()
        if "LIKELY_RETRIEVAL_FAILURE" in ret_upper or "FAIL" in ret_upper or ret_upper == "NO_RESULTS":
            return "LIKELY_RETRIEVAL_FAILURE"
        elif "WEAK" in ret_upper:
            return "WEAK_RETRIEVAL"
        
        if strategy == "filtered" and removed_count > 0:
            return "CONTEXT_REDUCTION_RISK"
            
        if strategy == "reranked" and top_rank_changed:
            return "RERANKING_CHANGE"

        # Check grounding status
        gr_upper = (grounding_status or "").upper()
        if "UNGROUNDED" in gr_upper:
            return "GROUNDING_FAILURE"
        elif "PARTIALLY" in gr_upper:
            return "PARTIAL_GROUNDING"

        # Check security risk
        sec_upper = (security_risk or "").upper()
        if sec_upper in ["HIGH", "CRITICAL"]:
            return "SECURITY_WARNING"

        # Check efficiency
        eff_upper = (efficiency_status or "").upper()
        if "WARN" in eff_upper or "HIGH" in eff_upper or "INEFFICIENT" in eff_upper:
            return "EFFICIENCY_WARNING"

        return "GOOD_RETRIEVAL"

    def save_debug_run(self, req_query: str, top_k: int, debug_res: Dict[str, Any], strategy: str = "standard", threshold: float = 0.35) -> str:
        retrieval = debug_res.get("retrieval", {})
        retrieved_chunks = retrieval.get("results", [])
        ret_config = debug_res.get("retrieval_config", {"top_k": top_k, "threshold": threshold, "strategy": strategy})
        reranking = debug_res.get("reranking", {"enabled": False, "results": []})
        
        grounding = debug_res.get("grounding", {})
        efficiency = debug_res.get("efficiency", {})
        security = debug_res.get("security", {})
        diagnosis = debug_res.get("diagnosis", {})

        candidates_count = retrieval.get("candidates", len(retrieved_chunks))
        retained_count = retrieval.get("retained", len(retrieved_chunks))
        removed_count = retrieval.get("removed", 0)

        top_rank_changed = False
        if reranking.get("enabled") and reranking.get("results"):
            top_item = reranking["results"][0]
            top_rank_changed = top_item.get("original_rank") != top_item.get("reranked_rank")

        retrieval_status = retrieval.get("status", diagnosis.get("retrieval", "UNKNOWN"))
        grounding_status = grounding.get("status", diagnosis.get("grounding", "UNKNOWN"))
        efficiency_status = efficiency.get("efficiency_status", diagnosis.get("efficiency", "UNKNOWN"))
        security_risk = security.get("risk_level", diagnosis.get("security", "LOW"))

        failure_category = self.determine_failure_category(
            retrieval_status, grounding_status, efficiency_status, security_risk,
            strategy=ret_config.get("strategy", strategy),
            removed_count=removed_count,
            top_rank_changed=top_rank_changed
        )

        chunk_ids = [c.get("chunk_id", f"c_{i}") for i, c in enumerate(retrieved_chunks)]
        sources = list(dict.fromkeys([c.get("source", "unknown") for c in retrieved_chunks if c.get("source")]))
        similarities = [float(c.get("similarity", 0.0)) for c in retrieved_chunks]
        distances = [float(c.get("distance", 0.0)) for c in retrieved_chunks]

        timestamp = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        run_record = {
            "timestamp": timestamp,
            "query": req_query,
            "generated_answer": debug_res.get("answer", ""),
            "retrieved_chunks": retrieved_chunks,
            "chunk_ids": chunk_ids,
            "source_documents": sources,
            "similarity_values": similarities,
            "distance_values": distances,
            "retrieval_configuration": ret_config,
            "top_k": top_k,
            "strategy": ret_config.get("strategy", strategy),
            "threshold": ret_config.get("threshold", threshold),
            "candidates_count": candidates_count,
            "retained_count": retained_count,
            "removed_count": removed_count,
            "reranking": reranking,
            "grounding_result": {
                "answer": grounding.get("answer", debug_res.get("answer", "")),
                "status": grounding_status,
                "explanation": grounding.get("explanation", ""),
                "supported_claims": grounding.get("supported_claims", []),
                "unsupported_claims": grounding.get("unsupported_claims", [])
            },
            "grounding_status": grounding_status,
            "retrieval_status": retrieval_status,
            "efficiency_metrics": efficiency,
            "estimated_input_tokens": efficiency.get("estimated_input_tokens", 0),
            "estimated_output_tokens": efficiency.get("estimated_output_tokens", 0),
            "estimated_total_tokens": efficiency.get("total_estimated_tokens", 0),
            "retrieval_latency_ms": efficiency.get("retrieval_latency_ms", 0.0),
            "generation_latency_ms": efficiency.get("generation_latency_ms", 0.0),
            "total_latency_ms": efficiency.get("total_latency_ms", 0.0),
            "diagnosis": diagnosis,
            "failure_category": failure_category,
            "security": security
        }

        return self.repository.save_run(run_record)

    def get_runs(self, limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        total = self.repository.get_total_count()
        runs = self.repository.get_runs(limit=limit, offset=offset)
        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "runs": runs
        }

    def get_run_by_id(self, run_id: str) -> Optional[Dict[str, Any]]:
        return self.repository.get_run_by_id(run_id)

    def delete_run(self, run_id: str) -> bool:
        return self.repository.delete_run(run_id)
