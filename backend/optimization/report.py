import json
import time
from typing import List, Dict, Any
from backend.optimization.pipelines import PipelineResult

class OptimizationReportGenerator:
    def __init__(self):
        pass

    def create_aggregate_report(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        total = len(results)
        if total == 0:
            return {}

        def avg(key, system):
            valid = [r[system].get(key) for r in results if r[system].get(key) is not None]
            return sum(valid) / len(valid) if valid else 0.0

        def count_grounded(system):
            return sum(1 for r in results if r[system].get("grounding_status") == "GROUNDED")

        # Grounding comparison
        basic_only = 0
        opt_only = 0
        both = 0
        neither = 0

        retrieval_failures = 0
        no_answer_cases = 0
        opt_removed_chunks_cases = 0

        for r in results:
            b_grounded = r["basic"].get("grounding_status") == "GROUNDED"
            o_grounded = r["optimized"].get("grounding_status") == "GROUNDED"
            
            if b_grounded and o_grounded: both += 1
            elif b_grounded and not o_grounded: basic_only += 1
            elif o_grounded and not b_grounded: opt_only += 1
            else: neither += 1
            
            # Simple retrieval failure metric: basic p5 == 0 and not expected to reject
            expected_answer = r.get("expected_answer", "")
            if r["basic"].get("precision_at_5") == 0.0 and "cannot determine" not in expected_answer.lower():
                retrieval_failures += 1
                
            if r["basic"].get("grounding_status") == "NO_ANSWER":
                no_answer_cases += 1
                
            if r["optimization"].get("chunks_removed", 0) > 0:
                opt_removed_chunks_cases += 1

        avg_chunks_removed = sum(r["optimization"].get("chunks_removed", 0) for r in results) / total
        avg_context_reduction = sum(r["optimization"].get("context_reduction_percentage", 0.0) for r in results) / total

        aggregate = {
            "total_questions": total,
            "retrieval_failures": retrieval_failures,
            "no_answer_cases": no_answer_cases,
            "questions_with_chunks_removed": opt_removed_chunks_cases,
            "metrics": {
                "precision_at_1": {"basic": avg("precision_at_1", "basic"), "optimized": avg("precision_at_1", "optimized")},
                "precision_at_3": {"basic": avg("precision_at_3", "basic"), "optimized": avg("precision_at_3", "optimized")},
                "precision_at_5": {"basic": avg("precision_at_5", "basic"), "optimized": avg("precision_at_5", "optimized")},
                "recall_at_1": {"basic": avg("recall_at_1", "basic"), "optimized": avg("recall_at_1", "optimized")},
                "recall_at_3": {"basic": avg("recall_at_3", "basic"), "optimized": avg("recall_at_3", "optimized")},
                "recall_at_5": {"basic": avg("recall_at_5", "basic"), "optimized": avg("recall_at_5", "optimized")},
                "grounded_percentage": {"basic": (count_grounded("basic")/total)*100, "optimized": (count_grounded("optimized")/total)*100},
                "answer_relevance": {"basic": avg("answer_relevance", "basic"), "optimized": avg("answer_relevance", "optimized")},
                "average_input_tokens": {"basic": avg("input_tokens", "basic"), "optimized": avg("input_tokens", "optimized")},
                "average_total_tokens": {"basic": avg("total_tokens", "basic"), "optimized": avg("total_tokens", "optimized")},
                "average_retrieval_latency": {"basic": avg("retrieval_latency_ms", "basic"), "optimized": avg("retrieval_latency_ms", "optimized")},
                "average_generation_latency": {"basic": avg("generation_latency_ms", "basic"), "optimized": avg("generation_latency_ms", "optimized")},
                "average_total_latency": {"basic": avg("total_latency_ms", "basic"), "optimized": avg("total_latency_ms", "optimized")},
                "average_chunks_retained": {"basic": avg("selected_count", "basic"), "optimized": avg("selected_count", "optimized")}
            },
            "optimization": {
                "average_chunks_removed": avg_chunks_removed,
                "average_context_reduction_percentage": avg_context_reduction
            },
            "grounding_comparison": {
                "basic_only": basic_only,
                "optimized_only": opt_only,
                "both": both,
                "neither": neither
            }
        }
        return aggregate

    def format_cli_report(self, aggregate: Dict[str, Any]) -> str:
        m = aggregate["metrics"]
        opt = aggregate["optimization"]
        gc = aggregate["grounding_comparison"]
        
        report = []
        report.append("=" * 50)
        report.append("BASIC VS OPTIMIZED RAG EXPERIMENT")
        report.append("=" * 50)
        report.append(f"\nQuestions: {aggregate['total_questions']}\n")
        
        report.append("BASIC RAG")
        report.append(f"Precision@1: {m['precision_at_1']['basic']:.4f}")
        report.append(f"Recall@5: {m['recall_at_5']['basic']:.4f}")
        report.append(f"Grounded: {m['grounded_percentage']['basic']:.1f}%")
        report.append(f"Answer relevance: {m['answer_relevance']['basic']:.4f}")
        report.append(f"Avg input tokens: {m['average_input_tokens']['basic']:.1f}")
        report.append(f"Avg total tokens: {m['average_total_tokens']['basic']:.1f}")
        report.append(f"Avg latency: {m['average_total_latency']['basic']:.2f} ms\n")
        
        report.append("OPTIMIZED RAG")
        report.append(f"Precision@1: {m['precision_at_1']['optimized']:.4f}")
        report.append(f"Recall@5: {m['recall_at_5']['optimized']:.4f}")
        report.append(f"Grounded: {m['grounded_percentage']['optimized']:.1f}%")
        report.append(f"Answer relevance: {m['answer_relevance']['optimized']:.4f}")
        report.append(f"Avg input tokens: {m['average_input_tokens']['optimized']:.1f}")
        report.append(f"Avg total tokens: {m['average_total_tokens']['optimized']:.1f}")
        report.append(f"Avg latency: {m['average_total_latency']['optimized']:.2f} ms\n")
        
        report.append("CONTEXT OPTIMIZATION")
        report.append(f"Avg chunks removed: {opt['average_chunks_removed']:.2f}")
        report.append(f"Avg context reduction: {opt['average_context_reduction_percentage']:.1f}%\n")
        
        report.append("GROUNDING COMPARISON")
        report.append(f"Basic only: {gc['basic_only']}")
        report.append(f"Optimized only: {gc['optimized_only']}")
        report.append(f"Both: {gc['both']}")
        report.append(f"Neither: {gc['neither']}\n")
        
        report.append("=" * 50)
        
        return "\n".join(report)

    def save_json(self, results: List[Dict[str, Any]], aggregate: Dict[str, Any], filepath: str = "optimization_experiment_results.json"):
        import os
        from backend.config import OPTIMIZATION_DISTANCE_THRESHOLD, OPTIMIZATION_TOP_K
        
        data = {
            "experiment": "Basic vs Optimized RAG",
            "dataset_size": len(results),
            "configuration": {
                "optimization_distance_threshold": OPTIMIZATION_DISTANCE_THRESHOLD,
                "optimization_top_k": OPTIMIZATION_TOP_K
            },
            "per_question": results,
            "aggregate": aggregate
        }
        
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
