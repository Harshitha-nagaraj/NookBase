import time
from typing import Dict, Any, List
from backend.rag.retrieval import Retriever
from backend.generation.context_builder import ContextBuilder
from backend.generation.generator import FallbackGenerator
from backend.diagnostics.grounding_diagnostics import GroundingDiagnosticsEngine
from backend.diagnostics.efficiency_diagnostics import EfficiencyDiagnosticsEngine
from backend.diagnostics.retrieval_diagnostics import DiagnosticsEngine
from backend.evaluation.metrics import EvaluationMetrics
from backend.optimization.context_optimizer import ContextOptimizer

class PipelineResult:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

class OptimizationPipelines:
    def __init__(self, 
                 retriever: Retriever, 
                 context_builder: ContextBuilder,
                 generator: FallbackGenerator,
                 grounding_engine: GroundingDiagnosticsEngine,
                 efficiency_engine: EfficiencyDiagnosticsEngine,
                 retrieval_diagnostics: DiagnosticsEngine,
                 metrics: EvaluationMetrics,
                 optimizer: ContextOptimizer):
        
        self.retriever = retriever
        self.context_builder = context_builder
        self.generator = generator
        self.grounding_engine = grounding_engine
        self.efficiency_engine = efficiency_engine
        self.retrieval_diagnostics = retrieval_diagnostics
        self.metrics = metrics
        self.optimizer = optimizer

    def run_basic_pipeline(self, query: str, expected_answer: str, expected_source: str, top_k: int) -> PipelineResult:
        t0_total = time.perf_counter()
        
        # Retrieval
        t0_ret = time.perf_counter()
        raw_results = self.retriever.retrieve(query, top_k=top_k)
        t1_ret = time.perf_counter()
        
        # Context (All retrieved chunks)
        t0_ctx = time.perf_counter()
        context_data = self.context_builder.build_context(query, raw_results, max_chunks=top_k)
        t1_ctx = time.perf_counter()
        
        # Generation
        t0_gen = time.perf_counter()
        gen_result = self.generator.generate(query, context_data["formatted_context"])
        t1_gen = time.perf_counter()
        
        # Diagnostics
        grounding_report = self.grounding_engine.analyze(gen_result.answer, context_data["selected_chunks"])
        t1_total = time.perf_counter()
        
        efficiency_report = self.efficiency_engine.analyze(
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
        
        rel_score, _ = self.metrics.answer_relevance(gen_result.answer, expected_answer)
        
        return PipelineResult(
            retrieved_count=len(raw_results),
            selected_count=len(context_data["selected_chunks"]),
            answer=gen_result.answer,
            grounding_status=grounding_report.status,
            answer_relevance=rel_score,
            precision_at_1=self.metrics.precision_at_k(raw_results, expected_source, 1),
            precision_at_3=self.metrics.precision_at_k(raw_results, expected_source, 3),
            precision_at_5=self.metrics.precision_at_k(raw_results, expected_source, 5),
            input_tokens=efficiency_report.estimated_input_tokens,
            total_tokens=efficiency_report.estimated_total_tokens,
            retrieval_latency_ms=efficiency_report.retrieval_latency_ms,
            generation_latency_ms=efficiency_report.generation_latency_ms,
            total_latency_ms=efficiency_report.total_latency_ms,
            raw_results=raw_results
        )

    def run_optimized_pipeline(self, query: str, expected_answer: str, expected_source: str, top_k: int, raw_results: List[Dict[str, Any]]) -> PipelineResult:
        # We reuse the raw_results to ensure a fair test, but we could re-retrieve. The prompt says "retrieves the same top-K chunks"
        # We will simulate retrieval time just as 0 for fair comparison, or we can actually run it. 
        # Actually, let's run it again to get true latency comparison if we want, or just pass it in.
        # We will re-run retrieval for isolated latency measurement.
        t0_total = time.perf_counter()
        
        t0_ret = time.perf_counter()
        raw_results = self.retriever.retrieve(query, top_k=top_k)
        t1_ret = time.perf_counter()
        
        # Optimizer filtering
        t0_ctx = time.perf_counter()
        filtered_results = self.optimizer.optimize_context(raw_results)
        
        # Context
        context_data = self.context_builder.build_context(query, filtered_results, max_chunks=top_k)
        t1_ctx = time.perf_counter()
        
        # Generation
        t0_gen = time.perf_counter()
        gen_result = self.generator.generate(query, context_data["formatted_context"])
        t1_gen = time.perf_counter()
        
        # Diagnostics
        grounding_report = self.grounding_engine.analyze(gen_result.answer, context_data["selected_chunks"])
        t1_total = time.perf_counter()
        
        efficiency_report = self.efficiency_engine.analyze(
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
        
        rel_score, _ = self.metrics.answer_relevance(gen_result.answer, expected_answer)
        
        reduction_stats = self.optimizer.calculate_reduction(raw_results, context_data["selected_chunks"])
        
        return PipelineResult(
            retrieved_count=len(raw_results),
            selected_count=len(context_data["selected_chunks"]),
            answer=gen_result.answer,
            grounding_status=grounding_report.status,
            answer_relevance=rel_score,
            precision_at_1=self.metrics.precision_at_k(raw_results, expected_source, 1),
            precision_at_3=self.metrics.precision_at_k(raw_results, expected_source, 3),
            precision_at_5=self.metrics.precision_at_k(raw_results, expected_source, 5),
            input_tokens=efficiency_report.estimated_input_tokens,
            total_tokens=efficiency_report.estimated_total_tokens,
            retrieval_latency_ms=efficiency_report.retrieval_latency_ms,
            generation_latency_ms=efficiency_report.generation_latency_ms,
            total_latency_ms=efficiency_report.total_latency_ms,
            chunks_removed=reduction_stats["chunks_removed"],
            context_reduction_percentage=reduction_stats["context_reduction_percentage"],
            filtered_results=filtered_results
        )
