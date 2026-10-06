import json
from backend.evaluation.metrics import EvaluationMetrics
from backend.rag.embeddings import EmbeddingService
from backend.evaluation.report import EvaluationResultItem, create_aggregated_report

def test_precision_invariants():
    metrics = EvaluationMetrics(None)
    retrieved = [
        {"chunk_id": f"chunk_{i}", "source": "docA"} for i in range(10)
    ]
    
    for k in [1, 3, 5]:
        p = metrics.precision_at_k(retrieved, "docA", k)
        assert 0.0 <= p <= 1.0, f"Precision@{k} violated bound: {p}"
        
        # Test edge cases
        assert 0.0 <= metrics.precision_at_k([], "docA", k) <= 1.0
        assert 0.0 <= metrics.precision_at_k(retrieved, "", k) <= 1.0
        assert 0.0 <= metrics.precision_at_k(retrieved, "docA", 0) <= 1.0

def test_recall_invariants():
    metrics = EvaluationMetrics(None)
    # Retrieving 10 chunks from docA when only 2 total relevant chunks exist in corpus
    retrieved = [
        {"chunk_id": f"chunk_{i}", "source": "docA"} for i in range(10)
    ]
    
    for k in [1, 3, 5]:
        # Oversaturated case: retrieving more relevant chunks than total in corpus
        r = metrics.recall_at_k(retrieved, "docA", total_relevant_chunks_in_corpus=2, k=k)
        assert 0.0 <= r <= 1.0, f"Recall@{k} violated bound: {r}"
        
        # Test edge cases
        assert 0.0 <= metrics.recall_at_k([], "docA", 2, k) <= 1.0
        assert 0.0 <= metrics.recall_at_k(retrieved, "", 2, k) <= 1.0
        assert 0.0 <= metrics.recall_at_k(retrieved, "docA", 0, k) <= 1.0
        assert 0.0 <= metrics.recall_at_k(retrieved, "docA", 2, 0) <= 1.0

def test_precision_at_k():
    metrics = EvaluationMetrics(None)
    
    # 3 retrieved, 2 from expected source
    retrieved = [
        {"chunk_id": "1", "source": "docA"},
        {"chunk_id": "2", "source": "docB"},
        {"chunk_id": "3", "source": "docA"}
    ]
    
    p1 = metrics.precision_at_k(retrieved, "docA", 1)
    assert p1 == 1.0
    
    p3 = metrics.precision_at_k(retrieved, "docA", 3)
    assert p3 == 2.0 / 3.0
    
    # Zero retrieved
    assert metrics.precision_at_k([], "docA", 3) == 0.0
    
    # Zero K
    assert metrics.precision_at_k(retrieved, "docA", 0) == 0.0

def test_recall_at_k():
    metrics = EvaluationMetrics(None)
    
    retrieved = [
        {"chunk_id": "1", "source": "docA"},
        {"chunk_id": "2", "source": "docB"}
    ]
    total_relevant = 4
    
    # 1 out of 4
    r1 = metrics.recall_at_k(retrieved, "docA", total_relevant, 1)
    assert r1 == 0.25
    
    # 1 out of 4 even at k=3 because only 1 relevant retrieved
    r3 = metrics.recall_at_k(retrieved, "docA", total_relevant, 3)
    assert r3 == 0.25
    
    # Zero total relevant (edge case)
    assert metrics.recall_at_k(retrieved, "docA", 0, 3) == 0.0

def test_answer_relevance():
    metrics = EvaluationMetrics(EmbeddingService())
    
    gen = "ChromaDB is a database."
    exp = "ChromaDB is a vector database."
    
    score, status = metrics.answer_relevance(gen, exp)
    assert score > 0.0
    assert status in ["RELEVANT", "WEAK", "LOW"]

def test_aggregated_report():
    r1 = EvaluationResultItem("Q1", "E1", "G1", 1.0, 0.5, 0.5, 1.0, 1.0, 1.0, "GROUNDED", 0.9, "RELEVANT", 100, 10, 110, 50.0, 20.0, 70.0)
    r2 = EvaluationResultItem("Q2", "E2", "G2", 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, "UNSUPPORTED", 0.1, "LOW", 100, 10, 110, 50.0, 20.0, 70.0)
    
    report = create_aggregated_report([r1, r2])
    
    assert report.total_questions == 2
    assert report.average_precision_at_1 == 0.5
    assert report.grounded_percentage == 50.0
    assert report.unsupported_percentage == 50.0
    assert report.retrieval_failures == 1
