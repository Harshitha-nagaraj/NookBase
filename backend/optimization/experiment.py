import time
from backend.rag.ingestion import DocumentIngestor
from backend.rag.chunking import TextChunker
from backend.rag.embeddings import EmbeddingService
from backend.rag.vector_store import VectorStore
from backend.rag.retrieval import Retriever
from backend.generation.context_builder import ContextBuilder
from backend.generation.generator import FallbackGenerator
from backend.diagnostics.grounding_diagnostics import GroundingDiagnosticsEngine
from backend.diagnostics.efficiency_diagnostics import EfficiencyDiagnosticsEngine
from backend.diagnostics.retrieval_diagnostics import DiagnosticsEngine
from backend.evaluation.dataset import get_initial_dataset
from backend.evaluation.metrics import EvaluationMetrics
from backend.optimization.context_optimizer import ContextOptimizer
from backend.optimization.pipelines import OptimizationPipelines
from backend.optimization.report import OptimizationReportGenerator
from backend.config import OPTIMIZATION_TOP_K
from backend.evaluation.evaluator import setup_rag_for_evaluation

def result_to_dict(res) -> dict:
    return {
        "retrieved_count": getattr(res, "retrieved_count", None),
        "selected_count": getattr(res, "selected_count", None),
        "answer": getattr(res, "answer", None),
        "grounding_status": getattr(res, "grounding_status", None),
        "answer_relevance": getattr(res, "answer_relevance", None),
        "precision_at_1": getattr(res, "precision_at_1", None),
        "precision_at_3": getattr(res, "precision_at_3", None),
        "precision_at_5": getattr(res, "precision_at_5", None),
        "recall_at_1": getattr(res, "recall_at_1", None),
        "recall_at_3": getattr(res, "recall_at_3", None),
        "recall_at_5": getattr(res, "recall_at_5", None),
        "input_tokens": getattr(res, "input_tokens", None),
        "total_tokens": getattr(res, "total_tokens", None),
        "retrieval_latency_ms": getattr(res, "retrieval_latency_ms", None),
        "generation_latency_ms": getattr(res, "generation_latency_ms", None),
        "total_latency_ms": getattr(res, "total_latency_ms", None)
    }

def run_experiment():
    print("Setting up RAG pipeline for optimization experiment...")
    embedding_service, vector_store, total_relevant = setup_rag_for_evaluation()
    
    retriever = Retriever(embedding_service, vector_store)
    context_builder = ContextBuilder()
    generator = FallbackGenerator()
    grounding_engine = GroundingDiagnosticsEngine(embedding_service)
    efficiency_engine = EfficiencyDiagnosticsEngine()
    retrieval_diagnostics = DiagnosticsEngine()
    metrics = EvaluationMetrics(embedding_service)
    optimizer = ContextOptimizer()
    
    pipelines = OptimizationPipelines(
        retriever, context_builder, generator, grounding_engine,
        efficiency_engine, retrieval_diagnostics, metrics, optimizer
    )
    
    dataset = get_initial_dataset()
    top_k = OPTIMIZATION_TOP_K
    
    results = []
    
    for case in dataset:
        print(f"Running question: {case.question}")
        basic_res = pipelines.run_basic_pipeline(case.question, case.expected_answer, case.relevant_source, top_k)
        opt_res = pipelines.run_optimized_pipeline(case.question, case.expected_answer, case.relevant_source, top_k, basic_res.raw_results)
        
        # Override recall with actual total_relevant
        # We must recompute it because pipelines used precision_at_k internally which is fine, 
        # but for recall we need total_relevant. 
        # Actually it's easier to compute it here and inject it.
        def inject_recall(res_obj, results_list):
            r1 = metrics.recall_at_k(results_list, case.relevant_source, total_relevant, 1)
            r3 = metrics.recall_at_k(results_list, case.relevant_source, total_relevant, 3)
            r5 = metrics.recall_at_k(results_list, case.relevant_source, total_relevant, 5)
            setattr(res_obj, "recall_at_1", r1)
            setattr(res_obj, "recall_at_3", r3)
            setattr(res_obj, "recall_at_5", r5)
            
        inject_recall(basic_res, basic_res.raw_results)
        inject_recall(opt_res, getattr(opt_res, "filtered_results", []))

        item = {
            "question": case.question,
            "expected_answer": case.expected_answer,
            "basic": result_to_dict(basic_res),
            "optimized": result_to_dict(opt_res),
            "optimization": {
                "chunks_removed": getattr(opt_res, "chunks_removed", 0),
                "context_reduction_percentage": getattr(opt_res, "context_reduction_percentage", 0.0)
            }
        }
        results.append(item)
        
    report_gen = OptimizationReportGenerator()
    aggregate = report_gen.create_aggregate_report(results)
    
    print("\n" + report_gen.format_cli_report(aggregate))
    
    json_path = "optimization_experiment_results.json"
    report_gen.save_json(results, aggregate, json_path)
    print(f"\nResults saved to {json_path}")

if __name__ == "__main__":
    run_experiment()
