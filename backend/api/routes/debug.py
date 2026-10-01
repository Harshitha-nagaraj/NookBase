import os
import time
from fastapi import APIRouter, HTTPException
from backend.api.schemas import (
    DebugRequest, DebugResponse, RetrievalResponse, GroundingResponse, EfficiencyResponse,
    CompareResponse, SecurityResponse, SecurityFindingSchema, SecurityChunkAnalysisSchema, RetrievalConfigSchema,
    RerankingSummarySchema, RerankingResultSchema, RetrievalExperimentRequest, RetrievalExperimentResponse,
    RetrievalExperimentConfigResult, RetrievalResultSchema, ClaimSchema, SupportingChunkSchema,
    CounterfactualRunSchema, CounterfactualChangeSchema, CounterfactualResponse, RootCauseSchema
)
from backend.optimization.counterfactual import CounterfactualEngine
from backend.diagnostics.root_cause import RootCauseEngine

def map_claim_support(c):
    return ClaimSchema(
        claim=getattr(c, "claim", c.claim_text),
        claim_text=c.claim_text,
        status=getattr(c, "status", "SUPPORTED" if c.supported else "UNSUPPORTED"),
        supported=c.supported,
        support_score=c.support_score,
        evidence_chunk_id=c.evidence_chunk_id,
        evidence_source=getattr(c, "evidence_source", None),
        evidence_text=getattr(c, "evidence_text", None),
        supporting_chunks=[
            SupportingChunkSchema(
                chunk_id=sc.chunk_id,
                source=sc.source,
                score=sc.score,
                text_snippet=sc.text_snippet
            ) for sc in getattr(c, "supporting_chunks", [])
        ]
    )

def map_grounding_report(grounding_report, answer: str) -> GroundingResponse:
    all_claims = getattr(grounding_report, "claims", []) or (grounding_report.supported_claims + grounding_report.unsupported_claims)
    return GroundingResponse(
        answer=answer,
        status=grounding_report.status,
        explanation=grounding_report.explanation,
        total_claims=getattr(grounding_report, "total_claims", len(all_claims)),
        supported_claims_count=getattr(grounding_report, "supported_claims_count", len(grounding_report.supported_claims)),
        partially_supported_claims_count=getattr(grounding_report, "partially_supported_claims_count", 0),
        unsupported_claims_count=getattr(grounding_report, "unsupported_claims_count", len(grounding_report.unsupported_claims)),
        groundedness_score=getattr(grounding_report, "groundedness_score", 0.0),
        claims=[map_claim_support(c) for c in all_claims],
        supported_claims=[map_claim_support(c) for c in grounding_report.supported_claims],
        unsupported_claims=[map_claim_support(c) for c in grounding_report.unsupported_claims]
    )

from backend.rag.ingestion import DocumentIngestor
from backend.rag.chunking import TextChunker
from backend.rag.embeddings import EmbeddingService
from backend.rag.vector_store import VectorStore
from backend.rag.retrieval import Retriever
from backend.diagnostics.retrieval_diagnostics import DiagnosticsEngine
from backend.generation.context_builder import ContextBuilder
from backend.generation.generator import FallbackGenerator
from backend.diagnostics.grounding_diagnostics import GroundingDiagnosticsEngine
from backend.diagnostics.efficiency_diagnostics import EfficiencyDiagnosticsEngine
from backend.optimization.context_optimizer import ContextOptimizer
from backend.optimization.pipelines import OptimizationPipelines
from backend.evaluation.metrics import EvaluationMetrics
from backend.security.prompt_injection import PromptInjectionDetector

from backend.history.service import RunHistoryService

router = APIRouter()

_embedding_service = None
_components = None
_history_service = None

def get_history_service():
    global _history_service
    if _history_service is None:
        _history_service = RunHistoryService()
    return _history_service

def get_components():
    global _components, _embedding_service
    if _components is None:
        _embedding_service = EmbeddingService()
        vector_store = VectorStore()
        retriever = Retriever(_embedding_service, vector_store)
        retrieval_diagnostics = DiagnosticsEngine()
        context_builder = ContextBuilder()
        generator = FallbackGenerator()
        grounding_diagnostics = GroundingDiagnosticsEngine(_embedding_service)
        efficiency_diagnostics = EfficiencyDiagnosticsEngine()
        metrics = EvaluationMetrics(_embedding_service)
        optimizer = ContextOptimizer()
        security_detector = PromptInjectionDetector()
        history_svc = get_history_service()
        
        pipelines = OptimizationPipelines(
            retriever, context_builder, generator, grounding_diagnostics,
            efficiency_diagnostics, retrieval_diagnostics, metrics, optimizer
        )

        counterfactual_engine = CounterfactualEngine(
            retriever, retrieval_diagnostics, context_builder, generator,
            grounding_diagnostics, efficiency_diagnostics, history_service=history_svc
        )
        
        root_cause_engine = RootCauseEngine()
        
        ensure_demo_data_ingested(vector_store, _embedding_service)

        _components = {
            "retriever": retriever,
            "retrieval_diagnostics": retrieval_diagnostics,
            "context_builder": context_builder,
            "generator": generator,
            "grounding_diagnostics": grounding_diagnostics,
            "efficiency_diagnostics": efficiency_diagnostics,
            "security_detector": security_detector,
            "pipelines": pipelines,
            "counterfactual_engine": counterfactual_engine,
            "root_cause_engine": root_cause_engine
        }
    return _components

def ensure_demo_data_ingested(vector_store, embedding_service):
    sec_file = os.path.join("./data", "security_demo.txt")
    if os.path.exists(sec_file):
        try:
            results = vector_store.collection.get(include=["metadatas"])
            metadatas = results.get("metadatas", []) or []
            sources = [m.get("source") for m in metadatas if m and "source" in m]
            if "security_demo.txt" not in sources:
                ingestor = DocumentIngestor()
                chunker = TextChunker()
                docs = ingestor.ingest(sec_file)
                chunks = chunker.chunk_documents(docs)
                texts = [c["text"] for c in chunks]
                embeddings = embedding_service.embed_documents(texts)
                vector_store.add_chunks(chunks, embeddings)
        except Exception:
            pass

def map_security_report(security_report: dict) -> SecurityResponse:
    return SecurityResponse(
        risk_level=security_report.get("risk_level", "NONE"),
        finding_count=security_report.get("finding_count", 0),
        categories_detected=security_report.get("categories_detected", []),
        findings=[
            SecurityFindingSchema(
                category=f.get("category", "UNKNOWN"),
                severity=f.get("severity", "LOW"),
                matched_text=f.get("matched_text", ""),
                source=f.get("source", "unknown"),
                chunk_id=f.get("chunk_id", "unknown"),
                explanation=f.get("explanation", "")
            ) for f in security_report.get("findings", [])
        ],
        retrieved_chunks_scanned=security_report.get("retrieved_chunks_scanned", 0),
        safe_chunks=security_report.get("safe_chunks", 0),
        affected_chunks=security_report.get("affected_chunks", 0),
        recommendation=security_report.get("recommendation", ""),
        status=security_report.get("status", "SECURE"),
        suspicious_chunks_count=security_report.get("suspicious_chunks_count", 0),
        matched_patterns=security_report.get("matched_patterns", []),
        explanation=security_report.get("explanation", ""),
        chunk_details=[
            SecurityChunkAnalysisSchema(
                chunk_id=cd.get("chunk_id", "unknown"),
                is_suspicious=cd.get("is_suspicious", False),
                risk_level=cd.get("risk_level", "NONE"),
                matched_patterns=cd.get("matched_patterns", []),
                reason=cd.get("reason", ""),
                text_snippet=cd.get("text_snippet")
            ) for cd in security_report.get("chunk_details", [])
        ]
    )


def map_retrieval_results(raw_results, diagnostic_results):
    res_list = []
    for item in raw_results:
        res_list.append(RetrievalResultSchema(
            rank=item.get("rank", 1),
            chunk_id=item.get("chunk_id", ""),
            source=item.get("source", "unknown"),
            page=item.get("page", 1),
            distance=item.get("distance", 0.0),
            similarity=item.get("similarity", 0.0),
            text=item.get("text", ""),
            relevance_label="HIGH" if item.get("similarity", 0) >= 0.6 else "MEDIUM" if item.get("similarity", 0) >= 0.4 else "LOW",
            original_rank=item.get("original_rank", item.get("rank", 1)),
            reranked_rank=item.get("reranked_rank", item.get("rank", 1)),
            retrieval_score=item.get("retrieval_score", item.get("similarity", 0.0)),
            rerank_score=item.get("rerank_score", item.get("similarity", 0.0)),
            retained=item.get("retained", True)
        ))
    return res_list

def validate_debug_request(req: DebugRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    if req.top_k < 1 or req.top_k > 20:
        raise HTTPException(status_code=400, detail="top_k must be >= 1 and <= 20")
    if req.threshold < 0.0 or req.threshold > 1.0:
        raise HTTPException(status_code=400, detail="threshold must be between 0.0 and 1.0")
    if req.strategy not in ["standard", "filtered", "reranked"]:
        raise HTTPException(status_code=400, detail="strategy must be one of 'standard', 'filtered', or 'reranked'")

@router.post("", response_model=DebugResponse)
async def debug_pipeline(req: DebugRequest):
    validate_debug_request(req)
        
    comps = get_components()
    
    try:
        t0_total = time.perf_counter()
        
        t0_ret = time.perf_counter()
        strategy_res = comps["retriever"].retrieve_with_strategy(
            req.query, top_k=req.top_k, strategy=req.strategy, threshold=req.threshold
        )
        t1_ret = time.perf_counter()
        raw_results = strategy_res["retained_results"]
        
        retrieval_report = comps["retrieval_diagnostics"].analyze(req.query, req.top_k, raw_results)
        
        # Run Security Diagnostics on retrieved chunks
        security_report = comps["security_detector"].analyze_retrieved_chunks(raw_results)
        
        t0_ctx = time.perf_counter()
        context_data = comps["context_builder"].build_context(req.query, raw_results)
        t1_ctx = time.perf_counter()
        
        t0_gen = time.perf_counter()
        gen_result = comps["generator"].generate(req.query, context_data["formatted_context"])
        t1_gen = time.perf_counter()
        
        grounding_report = comps["grounding_diagnostics"].analyze(gen_result.answer, context_data["selected_chunks"])
        t1_total = time.perf_counter()
        
        efficiency_report = comps["efficiency_diagnostics"].analyze(
            retrieval_latency_ms=(t1_ret - t0_ret)*1000,
            context_build_latency_ms=(t1_ctx - t0_ctx)*1000,
            generation_latency_ms=(t1_gen - t0_gen)*1000,
            total_latency_ms=(t1_total - t0_total)*1000,
            query=req.query,
            retrieved_chunks=raw_results,
            selected_chunks=context_data["selected_chunks"],
            formatted_context=context_data["formatted_context"],
            generated_answer=gen_result.answer
        )
        
        mapped_results = map_retrieval_results(raw_results, retrieval_report)
        
        retrieval_config = RetrievalConfigSchema(
            top_k=req.top_k,
            threshold=req.threshold,
            strategy=req.strategy
        )

        retrieval_res = RetrievalResponse(
            query=req.query,
            status=retrieval_report.status,
            best_score=retrieval_report.statistics["best_score"],
            average_score=retrieval_report.statistics["average_score"],
            worst_score=retrieval_report.statistics["worst_score"],
            candidates=strategy_res["candidates_count"],
            retained=strategy_res["retained_count"],
            removed=strategy_res["removed_count"],
            results=mapped_results
        )
        
        reranking_res = RerankingSummarySchema(
            enabled=strategy_res["reranking_enabled"],
            results=[
                RerankingResultSchema(
                    original_rank=r["original_rank"],
                    reranked_rank=r["reranked_rank"],
                    retrieval_score=r["retrieval_score"],
                    rerank_score=r["rerank_score"],
                    chunk_id=r["chunk_id"],
                    source=r["source"],
                    text=r["text"],
                    retained=r["retained"]
                ) for r in strategy_res["reranking_results"]
            ]
        )

        grounding_res = map_grounding_report(grounding_report, gen_result.answer)

        
        eff_res = EfficiencyResponse(
            estimated_input_tokens=efficiency_report.estimated_input_tokens,
            estimated_output_tokens=efficiency_report.estimated_output_tokens,
            total_estimated_tokens=efficiency_report.estimated_total_tokens,
            retrieval_latency_ms=efficiency_report.retrieval_latency_ms,
            generation_latency_ms=efficiency_report.generation_latency_ms,
            total_latency_ms=efficiency_report.total_latency_ms,
            context_reduction_percentage=efficiency_report.context_reduction_percent,
            efficiency_status=efficiency_report.efficiency_status,
            warnings=efficiency_report.warnings
        )
        
        security_res = map_security_report(security_report)

        root_cause_analysis = comps["root_cause_engine"].analyze(
            query=req.query,
            answer=gen_result.answer,
            retrieval_report=retrieval_report,
            grounding_report=grounding_report,
            efficiency_report=efficiency_report,
            raw_results=raw_results
        )

        root_cause_res = RootCauseSchema(
            primary_issue=root_cause_analysis.primary_issue,
            secondary_issues=root_cause_analysis.secondary_issues,
            confidence=root_cause_analysis.confidence,
            explanation=root_cause_analysis.explanation,
            evidence=root_cause_analysis.evidence,
            affected_stage=root_cause_analysis.affected_stage,
            recommendation=root_cause_analysis.recommendation,
            counterfactual_summary=root_cause_analysis.counterfactual_summary
        )

        history_svc = get_history_service()
        
        debug_dict = {
            "query": req.query,
            "answer": gen_result.answer,
            "retrieval_config": retrieval_config.model_dump(),
            "retrieval": retrieval_res.model_dump(),
            "reranking": reranking_res.model_dump(),
            "grounding": grounding_res.model_dump(),
            "efficiency": eff_res.model_dump(),
            "security": security_res.model_dump(),
            "root_cause": root_cause_res.model_dump(),
            "diagnosis": {
                "retrieval": retrieval_report.status,
                "grounding": grounding_report.status,
                "efficiency": efficiency_report.efficiency_status,
                "security": security_report["risk_level"]
            }
        }
        
        run_id = history_svc.save_debug_run(req.query, req.top_k, debug_dict, strategy=req.strategy, threshold=req.threshold)
        
        return DebugResponse(
            run_id=run_id,
            query=req.query,
            answer=gen_result.answer,
            retrieval_config=retrieval_config,
            retrieval=retrieval_res,
            reranking=reranking_res,
            grounding=grounding_res,
            efficiency=eff_res,
            security=security_res,
            diagnosis=debug_dict["diagnosis"],
            root_cause=root_cause_res
        )
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Internal pipeline error: {str(e)}")

@router.post("/retrieval", response_model=RetrievalResponse)
async def debug_retrieval(req: DebugRequest):
    validate_debug_request(req)
    comps = get_components()
    strategy_res = comps["retriever"].retrieve_with_strategy(
        req.query, top_k=req.top_k, strategy=req.strategy, threshold=req.threshold
    )
    raw_results = strategy_res["retained_results"]
    retrieval_report = comps["retrieval_diagnostics"].analyze(req.query, req.top_k, raw_results)
    
    return RetrievalResponse(
        query=req.query,
        status=retrieval_report.status,
        best_score=retrieval_report.statistics["best_score"],
        average_score=retrieval_report.statistics["average_score"],
        worst_score=retrieval_report.statistics["worst_score"],
        candidates=strategy_res["candidates_count"],
        retained=strategy_res["retained_count"],
        removed=strategy_res["removed_count"],
        results=map_retrieval_results(raw_results, retrieval_report)
    )

@router.post("/retrieval-experiment", response_model=RetrievalExperimentResponse)
async def run_retrieval_experiment(req: RetrievalExperimentRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    if not req.configurations:
        raise HTTPException(status_code=400, detail="Configurations list cannot be empty")
        
    comps = get_components()
    results = []

    for cfg in req.configurations:
        if cfg.top_k < 1 or cfg.top_k > 20:
            raise HTTPException(status_code=400, detail=f"Invalid top_k: {cfg.top_k}")
        if cfg.threshold < 0.0 or cfg.threshold > 1.0:
            raise HTTPException(status_code=400, detail=f"Invalid threshold: {cfg.threshold}")
        if cfg.strategy not in ["standard", "filtered", "reranked"]:
            raise HTTPException(status_code=400, detail=f"Invalid strategy: {cfg.strategy}")

        t0_total = time.perf_counter()
        t0_ret = time.perf_counter()
        strategy_res = comps["retriever"].retrieve_with_strategy(
            req.query, top_k=cfg.top_k, strategy=cfg.strategy, threshold=cfg.threshold
        )
        t1_ret = time.perf_counter()
        raw_results = strategy_res["retained_results"]
        
        retrieval_report = comps["retrieval_diagnostics"].analyze(req.query, cfg.top_k, raw_results)
        
        t0_ctx = time.perf_counter()
        context_data = comps["context_builder"].build_context(req.query, raw_results)
        t1_ctx = time.perf_counter()
        
        t0_gen = time.perf_counter()
        gen_result = comps["generator"].generate(req.query, context_data["formatted_context"])
        t1_gen = time.perf_counter()
        
        grounding_report = comps["grounding_diagnostics"].analyze(gen_result.answer, context_data["selected_chunks"])
        t1_total = time.perf_counter()

        efficiency_report = comps["efficiency_diagnostics"].analyze(
            retrieval_latency_ms=(t1_ret - t0_ret)*1000,
            context_build_latency_ms=(t1_ctx - t0_ctx)*1000,
            generation_latency_ms=(t1_gen - t0_gen)*1000,
            total_latency_ms=(t1_total - t0_total)*1000,
            query=req.query,
            retrieved_chunks=raw_results,
            selected_chunks=context_data["selected_chunks"],
            formatted_context=context_data["formatted_context"],
            generated_answer=gen_result.answer
        )

        history_svc = get_history_service()
        category = history_svc.determine_failure_category(
            retrieval_report.status,
            grounding_report.status,
            efficiency_report.efficiency_status,
            "LOW",
            strategy=cfg.strategy,
            removed_count=strategy_res["removed_count"],
            top_rank_changed=strategy_res["reranking_enabled"] and len(strategy_res["reranking_results"]) > 0 and strategy_res["reranking_results"][0]["original_rank"] != strategy_res["reranking_results"][0]["reranked_rank"]
        )

        results.append(RetrievalExperimentConfigResult(
            strategy=cfg.strategy,
            top_k=cfg.top_k,
            threshold=cfg.threshold,
            candidates=strategy_res["candidates_count"],
            retained=strategy_res["retained_count"],
            removed=strategy_res["removed_count"],
            input_tokens=efficiency_report.estimated_input_tokens,
            total_tokens=efficiency_report.estimated_total_tokens,
            retrieval_latency_ms=round(efficiency_report.retrieval_latency_ms, 2),
            generation_latency_ms=round(efficiency_report.generation_latency_ms, 2),
            total_latency_ms=round(efficiency_report.total_latency_ms, 2),
            grounding_status=grounding_report.status,
            answer=gen_result.answer,
            diagnosis=f"Strategy: {cfg.strategy.upper()} · Category: {category}",
            diagnosis_category=category,
            chunks=map_retrieval_results(raw_results, retrieval_report)
        ))

    return RetrievalExperimentResponse(query=req.query, results=results)

@router.post("/grounding", response_model=GroundingResponse)
async def debug_grounding(req: DebugRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    comps = get_components()
    strategy_res = comps["retriever"].retrieve_with_strategy(req.query, top_k=req.top_k, strategy=req.strategy, threshold=req.threshold)
    raw_results = strategy_res["retained_results"]
    context_data = comps["context_builder"].build_context(req.query, raw_results)
    gen_result = comps["generator"].generate(req.query, context_data["formatted_context"])
    grounding_report = comps["grounding_diagnostics"].analyze(gen_result.answer, context_data["selected_chunks"])
    
    return map_grounding_report(grounding_report, gen_result.answer)


@router.post("/efficiency", response_model=EfficiencyResponse)
async def debug_efficiency(req: DebugRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    comps = get_components()
    t0_total = time.perf_counter()
    t0_ret = time.perf_counter()
    strategy_res = comps["retriever"].retrieve_with_strategy(req.query, top_k=req.top_k, strategy=req.strategy, threshold=req.threshold)
    raw_results = strategy_res["retained_results"]
    t1_ret = time.perf_counter()
    
    t0_ctx = time.perf_counter()
    context_data = comps["context_builder"].build_context(req.query, raw_results)
    t1_ctx = time.perf_counter()
    
    t0_gen = time.perf_counter()
    gen_result = comps["generator"].generate(req.query, context_data["formatted_context"])
    t1_gen = time.perf_counter()
    
    t1_total = time.perf_counter()
    
    efficiency_report = comps["efficiency_diagnostics"].analyze(
        retrieval_latency_ms=(t1_ret - t0_ret)*1000,
        context_build_latency_ms=(t1_ctx - t0_ctx)*1000,
        generation_latency_ms=(t1_gen - t0_gen)*1000,
        total_latency_ms=(t1_total - t0_total)*1000,
        query=req.query,
        retrieved_chunks=raw_results,
        selected_chunks=context_data["selected_chunks"],
        formatted_context=context_data["formatted_context"],
        generated_answer=gen_result.answer
    )
    
    return EfficiencyResponse(
        estimated_input_tokens=efficiency_report.estimated_input_tokens,
        estimated_output_tokens=efficiency_report.estimated_output_tokens,
        total_estimated_tokens=efficiency_report.estimated_total_tokens,
        retrieval_latency_ms=efficiency_report.retrieval_latency_ms,
        generation_latency_ms=efficiency_report.generation_latency_ms,
        total_latency_ms=efficiency_report.total_latency_ms,
        context_reduction_percentage=efficiency_report.context_reduction_percent,
        efficiency_status=efficiency_report.efficiency_status,
        warnings=efficiency_report.warnings
    )

@router.post("/compare", response_model=CompareResponse)
async def debug_compare(req: DebugRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    comps = get_components()
    pipelines = comps["pipelines"]
    
    basic_res = pipelines.run_basic_pipeline(req.query, "", "", req.top_k)
    opt_res = pipelines.run_optimized_pipeline(req.query, "", "", req.top_k, basic_res.raw_results)
    
    return CompareResponse(
        query=req.query,
        basic={
            "answer": basic_res.answer,
            "selected_chunks": basic_res.selected_count,
            "grounding_status": basic_res.grounding_status,
            "answer_relevance": basic_res.answer_relevance,
            "input_tokens": basic_res.input_tokens,
            "total_tokens": basic_res.total_tokens,
            "latency_ms": basic_res.total_latency_ms
        },
        optimized={
            "answer": opt_res.answer,
            "selected_chunks": opt_res.selected_count,
            "grounding_status": opt_res.grounding_status,
            "answer_relevance": opt_res.answer_relevance,
            "input_tokens": opt_res.input_tokens,
            "total_tokens": opt_res.total_tokens,
            "latency_ms": opt_res.total_latency_ms
        },
        optimization={
            "chunks_removed": getattr(opt_res, "chunks_removed", 0),
            "context_reduction_percentage": getattr(opt_res, "context_reduction_percentage", 0.0)
        }
    )

@router.post("/security", response_model=SecurityResponse)
async def debug_security(req: DebugRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    comps = get_components()
    strategy_res = comps["retriever"].retrieve_with_strategy(req.query, top_k=req.top_k, strategy=req.strategy, threshold=req.threshold)
    raw_results = strategy_res["retained_results"]
    security_report = comps["security_detector"].analyze_retrieved_chunks(raw_results)
    
    return map_security_report(security_report)

@router.post("/counterfactual", response_model=CounterfactualResponse)
async def debug_counterfactual(req: DebugRequest):
    validate_debug_request(req)
    comps = get_components()
    engine: CounterfactualEngine = comps["counterfactual_engine"]
    
    analysis_res = engine.run_counterfactual_analysis(
        query=req.query,
        top_k=req.top_k,
        strategy=req.strategy,
        threshold=req.threshold
    )

    orig_config = RetrievalConfigSchema(
        top_k=req.top_k,
        threshold=req.threshold,
        strategy=req.strategy
    )

    formatted_runs = []
    for r in analysis_res["counterfactual_runs"]:
        formatted_runs.append(CounterfactualRunSchema(
            name=r["name"],
            strategy=r["strategy"],
            top_k=r["top_k"],
            threshold=r["threshold"],
            candidates_count=r["candidates_count"],
            retained_count=r["retained_count"],
            removed_count=r["removed_count"],
            input_tokens=r["input_tokens"],
            output_tokens=r["output_tokens"],
            total_tokens=r["total_tokens"],
            retrieval_latency_ms=r["retrieval_latency_ms"],
            generation_latency_ms=r["generation_latency_ms"],
            total_latency_ms=r["total_latency_ms"],
            grounding_status=r["grounding_status"],
            groundedness_score=r["groundedness_score"],
            total_claims=r["total_claims"],
            supported_claims_count=r["supported_claims_count"],
            partially_supported_claims_count=r["partially_supported_claims_count"],
            unsupported_claims_count=r["unsupported_claims_count"],
            diagnosis=r["diagnosis"],
            diagnosis_category=r["diagnosis_category"],
            answer=r["answer"],
            chunks=map_retrieval_results(r["raw_results"], None),
            tradeoffs=r.get("tradeoffs", [])
        ))

    formatted_changes = []
    for ch in analysis_res["changes_observed"]:
        formatted_changes.append(CounterfactualChangeSchema(
            target_name=ch["target_name"],
            strategy=ch["strategy"],
            top_k=ch["top_k"],
            context_token_change=ch["context_token_change"],
            context_token_pct_change=ch["context_token_pct_change"],
            retained_chunks_change=ch["retained_chunks_change"],
            removed_chunks_count=ch["removed_chunks_count"],
            latency_change_ms=ch["latency_change_ms"],
            groundedness_change=ch["groundedness_change"],
            grounding_status_change=ch["grounding_status_change"],
            factual_differences=ch["factual_differences"],
            explanation=ch["explanation"]
        ))

    return CounterfactualResponse(
        query=req.query,
        original_config=orig_config,
        original_run=formatted_runs[0],
        counterfactual_runs=formatted_runs,
        changes_observed=formatted_changes
    )



