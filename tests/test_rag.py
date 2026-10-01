import pytest
from backend.rag.ingestion import DocumentIngestor
from backend.rag.chunking import TextChunker
from backend.rag.embeddings import EmbeddingService

def test_text_ingestion(tmp_path):
    # Create a temporary text file
    file_path = tmp_path / "test.txt"
    file_path.write_text("This is a test document.", encoding="utf-8")
    
    ingestor = DocumentIngestor()
    docs = ingestor.ingest(str(file_path))
    
    assert len(docs) == 1
    assert docs[0]["text"] == "This is a test document."
    assert docs[0]["source"] == "test.txt"
    assert docs[0]["page"] == 1

def test_empty_ingestion(tmp_path):
    file_path = tmp_path / "empty.txt"
    file_path.write_text("", encoding="utf-8")
    
    ingestor = DocumentIngestor()
    with pytest.raises(ValueError):
        ingestor.ingest(str(file_path))

def test_chunking():
    chunker = TextChunker(chunk_size=10, chunk_overlap=2)
    docs = [{"text": "Hello world testing chunking.", "source": "test.txt", "page": 1}]
    
    chunks = chunker.chunk_documents(docs)
    
    assert len(chunks) > 1
    assert chunks[0]["source"] == "test.txt"
    assert chunks[0]["page"] == 1
    assert "chunk_id" in chunks[0]
    
def test_embedding_generation():
    service = EmbeddingService()
    embeddings = service.embed_documents(["Test 1", "Test 2"])
    
    assert len(embeddings) == 2
    assert len(embeddings[0]) > 0
    
    query_emb = service.embed_query("Query")
    assert len(query_emb) == len(embeddings[0])

def test_diagnostics_engine_good():
    from backend.diagnostics.retrieval_diagnostics import DiagnosticsEngine
    engine = DiagnosticsEngine()
    
    # Simulate a relevant retrieval result
    raw_results = [{
        "rank": 1,
        "chunk_id": "c1",
        "text": "ChromaDB is a database",
        "source": "doc1.txt",
        "page": 1,
        "distance": 0.5  # High relevance (< 1.0)
    }]
    
    report = engine.analyze("What is ChromaDB?", top_k=1, raw_results=raw_results)
    
    assert report.query == "What is ChromaDB?"
    assert report.status == "GOOD"
    assert report.statistics["retrieved_count"] == 1
    assert report.statistics["high_relevance_count"] == 1
    assert len(report.results) == 1
    
    res = report.results[0]
    assert res.rank == 1
    assert res.chunk_id == "c1"
    assert res.relevance_label == "HIGH"
    assert res.similarity_score == 1.0 / (1.0 + 0.5)

def test_diagnostics_engine_weak():
    from backend.diagnostics.retrieval_diagnostics import DiagnosticsEngine
    engine = DiagnosticsEngine()
    
    # Simulate a weak retrieval result
    raw_results = [{
        "rank": 1,
        "chunk_id": "c2",
        "text": "Some other text",
        "source": "doc1.txt",
        "page": 1,
        "distance": 1.3  # Medium relevance (between 1.0 and 1.5)
    }]
    
    report = engine.analyze("Unrelated query", top_k=1, raw_results=raw_results)
    
    assert report.status == "WEAK"
    assert report.results[0].relevance_label == "MEDIUM"

def test_diagnostics_engine_failure():
    from backend.diagnostics.retrieval_diagnostics import DiagnosticsEngine
    engine = DiagnosticsEngine()
    
    # Simulate an empty or highly distant result
    raw_results = [{
        "rank": 1,
        "chunk_id": "c3",
        "text": "Far away text",
        "source": "doc1.txt",
        "page": 1,
        "distance": 2.5  # Low relevance (> 1.5)
    }]
    
    report = engine.analyze("Totally random", top_k=1, raw_results=raw_results)
    
    assert report.status == "LIKELY_RETRIEVAL_FAILURE"
    assert report.results[0].relevance_label == "LOW"

def test_diagnostics_empty():
    from backend.diagnostics.retrieval_diagnostics import DiagnosticsEngine
    engine = DiagnosticsEngine()
    
    report = engine.analyze("Empty", top_k=5, raw_results=[])
    
    assert report.status == "LIKELY_RETRIEVAL_FAILURE"
    assert report.statistics["retrieved_count"] == 0
    assert report.statistics["best_score"] == 0.0

