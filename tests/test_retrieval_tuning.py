import pytest
from fastapi.testclient import TestClient
from backend.api.app import app
from backend.rag.embeddings import EmbeddingService
from backend.rag.vector_store import VectorStore
from backend.rag.retrieval import Retriever

client = TestClient(app)

def test_invalid_top_k_validation():
    res = client.post("/api/debug", json={"query": "test query", "top_k": 0})
    assert res.status_code == 400
    assert "top_k must be >=" in res.json()["detail"]

    res_large = client.post("/api/debug", json={"query": "test query", "top_k": 25})
    assert res_large.status_code == 400
    assert "top_k must be >=" in res_large.json()["detail"]

def test_invalid_threshold_validation():
    res_neg = client.post("/api/debug", json={"query": "test query", "top_k": 5, "threshold": -0.1})
    assert res_neg.status_code == 400
    assert "threshold must be between 0.0 and 1.0" in res_neg.json()["detail"]

    res_high = client.post("/api/debug", json={"query": "test query", "top_k": 5, "threshold": 1.5})
    assert res_high.status_code == 400
    assert "threshold must be between 0.0 and 1.0" in res_high.json()["detail"]

def test_invalid_strategy_validation():
    res = client.post("/api/debug", json={"query": "test query", "top_k": 5, "strategy": "invalid_mode"})
    assert res.status_code == 400
    assert "strategy must be one of" in res.json()["detail"]

def test_retriever_top_k_limit():
    embedding_service = EmbeddingService()
    vector_store = VectorStore()
    retriever = Retriever(embedding_service, vector_store)
    
    res_top3 = retriever.retrieve_with_strategy("storage", top_k=3, strategy="standard")
    assert res_top3["candidates_count"] <= 3
    assert res_top3["retained_count"] <= 3

def test_filtered_retrieval_strategy():
    res = client.post("/api/debug", json={
        "query": "What database is used for local storage?",
        "top_k": 5,
        "strategy": "filtered",
        "threshold": 0.35
    })
    assert res.status_code == 200
    data = res.json()
    assert "retrieval_config" in data
    assert data["retrieval_config"]["strategy"] == "filtered"
    assert "candidates" in data["retrieval"]
    assert "retained" in data["retrieval"]
    assert "removed" in data["retrieval"]
    assert data["retrieval"]["retained"] <= data["retrieval"]["candidates"]

def test_reranked_retrieval_strategy():
    res = client.post("/api/debug", json={
        "query": "What database is used for local storage?",
        "top_k": 5,
        "strategy": "reranked"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["retrieval_config"]["strategy"] == "reranked"
    assert data["reranking"]["enabled"] is True
    assert len(data["reranking"]["results"]) > 0
    for r in data["reranking"]["results"]:
        assert "original_rank" in r
        assert "reranked_rank" in r
        assert "retrieval_score" in r
        assert "rerank_score" in r

def test_retrieval_experiment_endpoint():
    exp_payload = {
        "query": "What database is used for local storage?",
        "configurations": [
            {"top_k": 5, "strategy": "standard"},
            {"top_k": 5, "strategy": "filtered", "threshold": 0.35},
            {"top_k": 5, "strategy": "reranked"}
        ]
    }
    res = client.post("/api/debug/retrieval-experiment", json=exp_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["query"] == "What database is used for local storage?"
    assert len(data["results"]) == 3
    strategies = [r["strategy"] for r in data["results"]]
    assert "standard" in strategies
    assert "filtered" in strategies
    assert "reranked" in strategies

def test_history_persistence_of_retrieval_config():
    # 1. Run debug query with reranked strategy
    res = client.post("/api/debug", json={
        "query": "How is context compression performed?",
        "top_k": 4,
        "strategy": "reranked"
    })
    assert res.status_code == 200
    run_id = res.json()["run_id"]

    # 2. Retrieve run from history
    detail_res = client.get(f"/api/runs/{run_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["run_id"] == run_id
    assert detail["strategy"] == "reranked"
    assert detail["top_k"] == 4
    assert detail["reranking"] is not None
    assert detail["reranking"]["enabled"] is True
