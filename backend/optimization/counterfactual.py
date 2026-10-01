import time
from typing import List, Dict, Any
from backend.rag.retrieval import Retriever
from backend.diagnostics.retrieval_diagnostics import DiagnosticsEngine
from backend.generation.context_builder import ContextBuilder
from backend.generation.generator import FallbackGenerator
from backend.diagnostics.grounding_diagnostics import GroundingDiagnosticsEngine
from backend.diagnostics.efficiency_diagnostics import EfficiencyDiagnosticsEngine

class CounterfactualEngine:
    """
    Executes controlled counterfactual retrieval experiments for a given query
    and measures exact differences in retrieval, context reduction, latency, and grounding.
    """
    def __init__(self,
                 retriever: Retriever,
                 retrieval_diagnostics: DiagnosticsEngine,
                 context_builder: ContextBuilder,
                 generator: FallbackGenerator,
                 grounding_diagnostics: GroundingDiagnosticsEngine,
                 efficiency_diagnostics: EfficiencyDiagnosticsEngine,
                 history_service=None):
        self.retriever = retriever
        self.retrieval_diagnostics = retrieval_diagnostics
        self.context_builder = context_builder
        self.generator = generator
        self.grounding_diagnostics = grounding_diagnostics
        self.efficiency_diagnostics = efficiency_diagnostics
        self.history_service = history_service

    def generate_configurations(self, orig_strategy: str, orig_top_k: int, orig_threshold: float) -> List[Dict[str, Any]]:
        configs = []
        
        # 1. Original
        configs.append({
            "name": "Original",
            "strategy": orig_strategy,
            "top_k": orig_top_k,
            "threshold": orig_threshold
        })

        # 2. Filtered
        filt_strategy = "filtered" if orig_strategy != "filtered" else "standard"
        configs.append({
            "name": "Filtered Strategy" if orig_strategy != "filtered" else "Standard Strategy",
            "strategy": filt_strategy,
            "top_k": orig_top_k,
            "threshold": orig_threshold
        })

        # 3. Reranked
        rerank_strategy = "reranked" if orig_strategy != "reranked" else "filtered"
        configs.append({
            "name": "Reranked Strategy" if orig_strategy != "reranked" else "Filtered Strategy (Rerank Alt)",
            "strategy": rerank_strategy,
            "top_k": orig_top_k,
            "threshold": orig_threshold
        })

        # 4. Low-K
        low_k = max(1, orig_top_k - 2) if orig_top_k > 2 else 1
        configs.append({
            "name": f"Low-K (K={low_k})",
            "strategy": orig_strategy,
            "top_k": low_k,
            "threshold": orig_threshold
        })

        # 5. High-K
        high_k = min(20, orig_top_k + 2) if orig_top_k <= 18 else 20
        configs.append({
            "name": f"High-K (K={high_k})",
            "strategy": orig_strategy,
            "top_k": high_k,
            "threshold": orig_threshold
        })

        return configs

    def run_single_config(self, query: str, cfg: Dict[str, Any]) -> Dict[str, Any]:
        t0_total = time.perf_counter()
        
        t0_ret = time.perf_counter()
        strategy_res = self.retriever.retrieve_with_strategy(
            query, top_k=cfg["top_k"], strategy=cfg["strategy"], threshold=cfg["threshold"]
        )
        t1_ret = time.perf_counter()
        raw_results = strategy_res["retained_results"]
        
        retrieval_report = self.retrieval_diagnostics.analyze(query, cfg["top_k"], raw_results)
        
        t0_ctx = time.perf_counter()
        context_data = self.context_builder.build_context(query, raw_results)
        t1_ctx = time.perf_counter()
        
        t0_gen = time.perf_counter()
        gen_result = self.generator.generate(query, context_data["formatted_context"])
        t1_gen = time.perf_counter()
        
        grounding_report = self.grounding_diagnostics.analyze(gen_result.answer, context_data["selected_chunks"])
        t1_total = time.perf_counter()
        
        efficiency_report = self.efficiency_diagnostics.analyze(
            retrieval_latency_ms=(t1_ret - t0_ret)*1000,
            context_build_latency_ms=(t1_ctx - t0_ctx)*1000,
            generation_latency_ms=(t1_gen - t0_gen)*1000,
            total_latency_ms=(t1_total - t0_total)*1000,
            query=query,
            retrieved_chunks=raw_results,
            selected_chunks=context_data["selected_chunks"],
            formatted_context=context_data["formatted_context"],
            generated_answer=gen_result.answer
        )

        category = "UNKNOWN"
        if self.history_service:
            category = self.history_service.determine_failure_category(
                retrieval_report.status,
                grounding_report.status,
                efficiency_report.efficiency_status,
                "LOW",
                strategy=cfg["strategy"],
                removed_count=strategy_res["removed_count"],
                top_rank_changed=strategy_res["reranking_enabled"] and len(strategy_res["reranking_results"]) > 0
            )

        # Build trade-offs
        tradeoffs = []
        if cfg["strategy"] == "filtered":
            tradeoffs.append(f"Filters out chunks below threshold ({strategy_res['removed_count']} removed)")
        elif cfg["strategy"] == "reranked":
            tradeoffs.append("Reorders context chunks using lexical & semantic scores (+latency)")
        
        if cfg["top_k"] < 4:
            tradeoffs.append("Fewer input tokens and lower latency; risks context omission")
        elif cfg["top_k"] > 5:
            tradeoffs.append("Higher context coverage; increases token usage and latency")

        if not tradeoffs:
            tradeoffs.append("Standard vector search baseline without filtering or reranking")

        return {
            "name": cfg["name"],
            "strategy": cfg["strategy"],
            "top_k": cfg["top_k"],
            "threshold": cfg["threshold"],
            "candidates_count": strategy_res["candidates_count"],
            "retained_count": strategy_res["retained_count"],
            "removed_count": strategy_res["removed_count"],
            "input_tokens": efficiency_report.estimated_input_tokens,
            "output_tokens": efficiency_report.estimated_output_tokens,
            "total_tokens": efficiency_report.estimated_total_tokens,
            "retrieval_latency_ms": round(efficiency_report.retrieval_latency_ms, 2),
            "generation_latency_ms": round(efficiency_report.generation_latency_ms, 2),
            "total_latency_ms": round(efficiency_report.total_latency_ms, 2),
            "grounding_status": grounding_report.status,
            "groundedness_score": grounding_report.groundedness_score,
            "total_claims": grounding_report.total_claims,
            "supported_claims_count": grounding_report.supported_claims_count,
            "partially_supported_claims_count": grounding_report.partially_supported_claims_count,
            "unsupported_claims_count": grounding_report.unsupported_claims_count,
            "diagnosis": f"Retrieval: {retrieval_report.status} · Grounding: {grounding_report.status}",
            "diagnosis_category": category,
            "answer": gen_result.answer,
            "raw_results": raw_results,
            "tradeoffs": tradeoffs
        }

    def run_counterfactual_analysis(self, query: str, top_k: int = 4, strategy: str = "standard", threshold: float = 0.35) -> Dict[str, Any]:
        configs = self.generate_configurations(strategy, top_k, threshold)
        
        runs = []
        for cfg in configs:
            run_data = self.run_single_config(query, cfg)
            runs.append(run_data)
            
        orig_run = runs[0]
        counterfactual_runs = runs # includes original and alternatives
        
        changes_observed = []
        for run in runs:
            if run["name"] == orig_run["name"]:
                continue

            token_diff = run["input_tokens"] - orig_run["input_tokens"]
            token_pct = round((token_diff / orig_run["input_tokens"] * 100), 1) if orig_run["input_tokens"] > 0 else 0.0
            retained_diff = run["retained_count"] - orig_run["retained_count"]
            latency_diff = round(run["total_latency_ms"] - orig_run["total_latency_ms"], 1)
            groundedness_diff = round(run["groundedness_score"] - orig_run["groundedness_score"], 2)
            gr_change_str = f"{orig_run['grounding_status']} → {run['grounding_status']}" if orig_run["grounding_status"] != run["grounding_status"] else f"No change ({run['grounding_status']})"

            facts = [
                f"Context tokens: {orig_run['input_tokens']} → {run['input_tokens']} ({token_pct:+.1f}%)",
                f"Retained chunks: {orig_run['retained_count']} → {run['retained_count']} ({retained_diff:+d})",
                f"Total latency: {orig_run['total_latency_ms']:.1f}ms → {run['total_latency_ms']:.1f}ms ({latency_diff:+.1f}ms)",
                f"Grounding status: {gr_change_str}"
            ]

            # Deterministic explanation
            if run["strategy"] == "filtered" and run["removed_count"] > 0:
                explanation = f"Filtering removed {run['removed_count']} chunk(s), reducing context tokens by {abs(token_pct):.1f}% ({token_diff:+d} tokens), with grounding status {run['grounding_status']}."
            elif run["strategy"] == "reranked":
                explanation = f"Reranking reordered context with a latency change of {latency_diff:+.1f}ms. Groundedness score: {run['groundedness_score']*100:.0f}% ({run['grounding_status']})."
            elif run["top_k"] != orig_run["top_k"]:
                explanation = f"Changing Top-K from {orig_run['top_k']} to {run['top_k']} adjusted retained context from {orig_run['input_tokens']} to {run['input_tokens']} tokens ({token_pct:+.1f}%). Grounding status: {run['grounding_status']}."
            else:
                explanation = f"Executing strategy {run['strategy'].upper()} (K={run['top_k']}) retained {run['retained_count']} chunks with {run['input_tokens']} tokens and {run['total_latency_ms']:.1f}ms latency."

            changes_observed.append({
                "target_name": run["name"],
                "strategy": run["strategy"],
                "top_k": run["top_k"],
                "context_token_change": token_diff,
                "context_token_pct_change": token_pct,
                "retained_chunks_change": retained_diff,
                "removed_chunks_count": run["removed_count"],
                "latency_change_ms": latency_diff,
                "groundedness_change": groundedness_diff,
                "grounding_status_change": gr_change_str,
                "factual_differences": facts,
                "explanation": explanation
            })

        return {
            "query": query,
            "original_config": {
                "top_k": top_k,
                "threshold": threshold,
                "strategy": strategy
            },
            "original_run": orig_run,
            "counterfactual_runs": counterfactual_runs,
            "changes_observed": changes_observed
        }
