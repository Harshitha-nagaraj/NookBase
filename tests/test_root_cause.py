import pytest
from types import SimpleNamespace
from backend.diagnostics.root_cause import RootCauseEngine, RootCauseResult

def test_root_cause_strong_retrieval_grounded_answer():
    engine = RootCauseEngine()
    retrieval_report = SimpleNamespace(
        status="STRONG",
        statistics={"best_score": 0.85, "average_score": 0.75, "worst_score": 0.65}
    )
    grounding_report = SimpleNamespace(
        status="GROUNDED",
        groundedness_score=1.0,
        total_claims=2,
        supported_claims_count=2,
        partially_supported_claims_count=0,
        unsupported_claims_count=0
    )
    efficiency_report = SimpleNamespace(
        efficiency_status="GOOD",
        total_latency_ms=150.0,
        estimated_input_tokens=300,
        selected_chunk_count=3
    )
    raw_results = [{"chunk_id": "c1", "similarity": 0.85}, {"chunk_id": "c2", "similarity": 0.75}]
    
    result = engine.analyze(
        query="What is RAG?",
        answer="RAG stands for Retrieval-Augmented Generation.",
        retrieval_report=retrieval_report,
        grounding_report=grounding_report,
        efficiency_report=efficiency_report,
        raw_results=raw_results
    )
    
    assert result.primary_issue == "NO_FAILURE"
    assert result.affected_stage == "NONE"
    assert result.confidence in ["HIGH", "MEDIUM"]
    assert "No major failure" in result.recommendation

def test_root_cause_weak_retrieval_no_answer():
    engine = RootCauseEngine()
    retrieval_report = SimpleNamespace(
        status="WEAK",
        statistics={"best_score": 0.25, "average_score": 0.20, "worst_score": 0.15}
    )
    grounding_report = SimpleNamespace(
        status="NO_ANSWER",
        groundedness_score=0.0,
        total_claims=0,
        supported_claims_count=0,
        partially_supported_claims_count=0,
        unsupported_claims_count=0
    )
    efficiency_report = SimpleNamespace(
        efficiency_status="GOOD",
        total_latency_ms=100.0,
        estimated_input_tokens=100,
        selected_chunk_count=1
    )
    raw_results = [{"chunk_id": "c1", "similarity": 0.25}]

    result = engine.analyze(
        query="Unknown topic",
        answer="I cannot answer based on retrieved context.",
        retrieval_report=retrieval_report,
        grounding_report=grounding_report,
        efficiency_report=efficiency_report,
        raw_results=raw_results
    )

    assert result.primary_issue == "RETRIEVAL_FAILURE"
    assert result.affected_stage == "RETRIEVAL"
    assert "Retrieval is the primary failure point" in result.explanation

def test_root_cause_good_retrieval_unsupported_answer():
    engine = RootCauseEngine()
    retrieval_report = SimpleNamespace(
        status="STRONG",
        statistics={"best_score": 0.70, "average_score": 0.65, "worst_score": 0.60}
    )
    grounding_report = SimpleNamespace(
        status="UNSUPPORTED",
        groundedness_score=0.0,
        total_claims=2,
        supported_claims_count=0,
        partially_supported_claims_count=0,
        unsupported_claims_count=2
    )
    efficiency_report = SimpleNamespace(
        efficiency_status="GOOD",
        total_latency_ms=200.0,
        estimated_input_tokens=400,
        selected_chunk_count=2
    )
    raw_results = [{"chunk_id": "c1", "similarity": 0.70}]

    result = engine.analyze(
        query="Explain quantum computing",
        answer="Quantum computers use magic crystals.",
        retrieval_report=retrieval_report,
        grounding_report=grounding_report,
        efficiency_report=efficiency_report,
        raw_results=raw_results
    )

    assert result.primary_issue == "CONTEXT_FAILURE"
    assert result.affected_stage == "CONTEXT"
    assert "Context selection is the primary failure point" in result.explanation

def test_root_cause_retrieval_context_acceptable_generation_failure():
    engine = RootCauseEngine()
    retrieval_report = SimpleNamespace(
        status="STRONG",
        statistics={"best_score": 0.80, "average_score": 0.75, "worst_score": 0.70}
    )
    grounding_report = SimpleNamespace(
        status="NO_ANSWER",
        groundedness_score=0.0,
        total_claims=0,
        supported_claims_count=0,
        partially_supported_claims_count=0,
        unsupported_claims_count=0
    )
    efficiency_report = SimpleNamespace(
        efficiency_status="GOOD",
        total_latency_ms=180.0,
        estimated_input_tokens=350,
        selected_chunk_count=2
    )
    raw_results = [{"chunk_id": "c1", "similarity": 0.80}]

    result = engine.analyze(
        query="What is python?",
        answer="",
        retrieval_report=retrieval_report,
        grounding_report=grounding_report,
        efficiency_report=efficiency_report,
        raw_results=raw_results
    )

    assert result.primary_issue == "GENERATION_FAILURE"
    assert result.affected_stage == "GENERATION"
    assert "Generation is the primary failure point" in result.explanation

def test_root_cause_good_quality_excessive_latency_context():
    engine = RootCauseEngine()
    retrieval_report = SimpleNamespace(
        status="STRONG",
        statistics={"best_score": 0.85, "average_score": 0.80, "worst_score": 0.75}
    )
    grounding_report = SimpleNamespace(
        status="GROUNDED",
        groundedness_score=1.0,
        total_claims=2,
        supported_claims_count=2,
        partially_supported_claims_count=0,
        unsupported_claims_count=0
    )
    efficiency_report = SimpleNamespace(
        efficiency_status="POTENTIALLY_INEFFICIENT",
        total_latency_ms=2500.0,
        estimated_input_tokens=2200,
        selected_chunk_count=10
    )
    raw_results = [{"chunk_id": f"c{i}", "similarity": 0.80} for i in range(10)]

    result = engine.analyze(
        query="Tell me about AI",
        answer="AI is artificial intelligence.",
        retrieval_report=retrieval_report,
        grounding_report=grounding_report,
        efficiency_report=efficiency_report,
        raw_results=raw_results
    )

    assert result.primary_issue == "EFFICIENCY_ISSUE"
    assert result.affected_stage == "EFFICIENCY"
    assert "Efficiency is the primary issue" in result.explanation

def test_root_cause_multiple_simultaneous_issues():
    engine = RootCauseEngine()
    retrieval_report = SimpleNamespace(
        status="WEAK",
        statistics={"best_score": 0.20, "average_score": 0.15, "worst_score": 0.10}
    )
    grounding_report = SimpleNamespace(
        status="UNSUPPORTED",
        groundedness_score=0.0,
        total_claims=2,
        supported_claims_count=0,
        partially_supported_claims_count=0,
        unsupported_claims_count=2
    )
    efficiency_report = SimpleNamespace(
        efficiency_status="POTENTIALLY_INEFFICIENT",
        total_latency_ms=1800.0,
        estimated_input_tokens=1600,
        selected_chunk_count=5
    )
    raw_results = [{"chunk_id": "c1", "similarity": 0.20}]

    result = engine.analyze(
        query="Obscure query",
        answer="Fabricated answer",
        retrieval_report=retrieval_report,
        grounding_report=grounding_report,
        efficiency_report=efficiency_report,
        raw_results=raw_results
    )

    assert result.primary_issue == "RETRIEVAL_FAILURE"
    assert "EFFICIENCY_ISSUE" in result.secondary_issues
    assert "UNSUPPORTED_CLAIMS" in result.secondary_issues

def test_root_cause_counterfactual_integration():
    engine = RootCauseEngine()
    retrieval_report = SimpleNamespace(
        status="WEAK",
        statistics={"best_score": 0.30, "average_score": 0.25, "worst_score": 0.20}
    )
    grounding_report = SimpleNamespace(
        status="UNSUPPORTED",
        groundedness_score=0.0,
        total_claims=1,
        supported_claims_count=0,
        partially_supported_claims_count=0,
        unsupported_claims_count=1
    )
    efficiency_report = SimpleNamespace(
        efficiency_status="GOOD",
        total_latency_ms=200.0,
        estimated_input_tokens=300,
        selected_chunk_count=2
    )
    raw_results = [{"chunk_id": "c1", "similarity": 0.30}]

    counterfactual_res = {
        "counterfactual_runs": [
            {"name": "Original", "grounding_status": "UNSUPPORTED"},
            {"name": "Reranked", "grounding_status": "GROUNDED"},
            {"name": "Filtered", "grounding_status": "UNSUPPORTED"},
        ]
    }

    result = engine.analyze(
        query="Test query",
        answer="Test answer",
        retrieval_report=retrieval_report,
        grounding_report=grounding_report,
        efficiency_report=efficiency_report,
        raw_results=raw_results,
        counterfactual_res=counterfactual_res
    )

    assert result.counterfactual_summary is not None
    assert "Reranked strategy changed the grounding outcome from UNSUPPORTED to GROUNDED" in result.counterfactual_summary

def test_root_cause_no_counterfactual_results_still_works():
    engine = RootCauseEngine()
    retrieval_report = SimpleNamespace(
        status="STRONG",
        statistics={"best_score": 0.80, "average_score": 0.75, "worst_score": 0.70}
    )
    grounding_report = SimpleNamespace(
        status="GROUNDED",
        groundedness_score=1.0,
        total_claims=1,
        supported_claims_count=1,
        partially_supported_claims_count=0,
        unsupported_claims_count=0
    )
    efficiency_report = SimpleNamespace(
        efficiency_status="GOOD",
        total_latency_ms=120.0,
        estimated_input_tokens=250,
        selected_chunk_count=2
    )

    result = engine.analyze(
        query="Test query",
        answer="Test answer",
        retrieval_report=retrieval_report,
        grounding_report=grounding_report,
        efficiency_report=efficiency_report,
        raw_results=[{"chunk_id": "c1", "similarity": 0.80}],
        counterfactual_res=None
    )

    assert result.primary_issue == "NO_FAILURE"
    assert result.counterfactual_summary is None

def test_root_cause_empty_missing_diagnostics_no_crash():
    engine = RootCauseEngine()
    result = engine.analyze(
        query="",
        answer="",
        retrieval_report=None,
        grounding_report=None,
        efficiency_report=None,
        raw_results=[]
    )

    assert isinstance(result, RootCauseResult)
    assert result.primary_issue in ["RETRIEVAL_FAILURE", "GENERATION_FAILURE", "NO_FAILURE"]
