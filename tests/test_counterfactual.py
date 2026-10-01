import pytest
from fastapi.testclient import TestClient
from backend.api.app import app
from backend.rag.embeddings import EmbeddingService
from backend.rag.vector_store import VectorStore
from backend.rag.retrieval import Retriever
from backend.diagnostics.retrieval_diagnostics import DiagnosticsEngine
from backend.generation.context_builder import ContextBuilder
from backend.generation.generator import FallbackGenerator
from backend.diagnostics.grounding_diagnostics import GroundingDiagnosticsEngine
from backend.diagnostics.efficiency_diagnostics import EfficiencyDiagnosticsEngine
from backend.optimization.counterfactual import CounterfactualEngine

@pytest.fixture
def counterfactual_engine():
    embedding_service = EmbeddingService()
    vector_store = VectorStore()
    retriever = Retriever(embedding_service, vector_store)
    retrieval_diagnostics = DiagnosticsEngine()
    context_builder = ContextBuilder()
    generator = FallbackGenerator()
    grounding_diagnostics = GroundingDiagnosticsEngine(embedding_service)
    efficiency_diagnostics = EfficiencyDiagnosticsEngine()

    return CounterfactualEngine(
        retriever=retriever,
        retrieval_diagnostics=retrieval_diagnostics,
        context_builder=context_builder,
        generator=generator,
        grounding_diagnostics=grounding_diagnostics,
        efficiency_diagnostics=efficiency_diagnostics
    )

def test_counterfactual_engine_execution(counterfactual_engine):
    query = "What database is used for local storage in ChromaDB?"
    res = counterfactual_engine.run_counterfactual_analysis(
        query=query, top_k=4, strategy="standard", threshold=0.35
    )

    # Test B: Same query used for all configurations
    assert res["query"] == query

    # Test C: Multiple configurations executed (5 configurations)
    assert len(res["counterfactual_runs"]) == 5
    strategies_run = set(r["strategy"] for r in res["counterfactual_runs"])
    assert len(strategies_run) >= 2

    # Test D & E: Token/latency and grounding measurements included
    for r in res["counterfactual_runs"]:
        assert "input_tokens" in r
        assert "total_tokens" in r
        assert "total_latency_ms" in r
        assert "grounding_status" in r
        assert "groundedness_score" in r
        assert "chunks" in r or "raw_results" in r

    # Test F: Changes from original calculated correctly
    assert len(res["changes_observed"]) == 4 # 4 alternatives compared to original
    for ch in res["changes_observed"]:
        assert "context_token_change" in ch
        assert "context_token_pct_change" in ch
        assert "retained_chunks_change" in ch
        assert "latency_change_ms" in ch
        assert "factual_differences" in ch
        assert len(ch["factual_differences"]) >= 3

def test_counterfactual_endpoint():
    client = TestClient(app)
    req_payload = {
        "query": "What are the main benefits of retrieval-augmented generation?",
        "top_k": 4,
        "strategy": "standard",
        "threshold": 0.35
    }
    response = client.post("/api/debug/counterfactual", json=req_payload)
    # Test A: Counterfactual endpoint returns results
    assert response.status_code == 200
    data = response.json()
    assert data["query"] == req_payload["query"]
    assert "original_run" in data
    assert len(data["counterfactual_runs"]) == 5
    assert len(data["changes_observed"]) == 4

def test_counterfactual_empty_and_invalid_input():
    client = TestClient(app)
    # Test G: Empty query validation
    res_empty = client.post("/api/debug/counterfactual", json={"query": "  ", "top_k": 4, "strategy": "standard", "threshold": 0.35})
    assert res_empty.status_code == 400

    # Invalid top_k
    res_invalid_k = client.post("/api/debug/counterfactual", json={"query": "test", "top_k": 0, "strategy": "standard", "threshold": 0.35})
    assert res_invalid_k.status_code == 400
