import os
import pytest
from unittest.mock import patch
from backend.rag.embeddings import EmbeddingService
from backend.rag.vector_store import VectorStore
from backend.rag.ingestion import DocumentIngestor
from backend.rag.chunking import TextChunker
from backend.api.routes.debug import ensure_demo_data_ingested, DEMO_FILES

@pytest.fixture
def embedding_service():
    return EmbeddingService()

def get_indexed_sources(vector_store):
    results = vector_store.collection.get(include=["metadatas"])
    metadatas = results.get("metadatas", []) or []
    return set(m.get("source") for m in metadatas if m and "source" in m)

def test_empty_collection_indexes_all_five_files(embedding_service):
    store = VectorStore(collection_name="test_empty_collection_ingest")
    # Ensure starting clean
    existing_ids = store.collection.get()["ids"]
    if existing_ids:
        store.collection.delete(ids=existing_ids)

    ensure_demo_data_ingested(store, embedding_service)
    sources = get_indexed_sources(store)
    
    for filename in DEMO_FILES:
        assert filename in sources

def test_only_security_demo_exists_indexes_remaining(embedding_service):
    store = VectorStore(collection_name="test_partial_collection_ingest")
    existing_ids = store.collection.get()["ids"]
    if existing_ids:
        store.collection.delete(ids=existing_ids)

    # Ingest only security_demo.txt first
    sec_file = os.path.join("./data", "security_demo.txt")
    from backend.rag.ingestion import DocumentIngestor
    from backend.rag.chunking import TextChunker
    ingestor = DocumentIngestor()
    chunker = TextChunker()
    docs = ingestor.ingest(sec_file)
    chunks = chunker.chunk_documents(docs)
    embeddings = embedding_service.embed_documents([c["text"] for c in chunks])
    store.add_chunks(chunks, embeddings)

    sources_before = get_indexed_sources(store)
    assert sources_before == {"security_demo.txt"}

    # Run bootstrapping
    ensure_demo_data_ingested(store, embedding_service)

    sources_after = get_indexed_sources(store)
    for filename in DEMO_FILES:
        assert filename in sources_after

def test_all_five_exist_nothing_duplicated(embedding_service):
    store = VectorStore(collection_name="test_dedup_collection_ingest")
    existing_ids = store.collection.get()["ids"]
    if existing_ids:
        store.collection.delete(ids=existing_ids)

    # Initial bootstrap
    ensure_demo_data_ingested(store, embedding_service)
    initial_count = len(store.collection.get()["ids"])

    # Second bootstrap
    ensure_demo_data_ingested(store, embedding_service)
    subsequent_count = len(store.collection.get()["ids"])

    assert initial_count == subsequent_count

def test_missing_document_recovered_on_next_bootstrap(embedding_service):
    store = VectorStore(collection_name="test_recovery_collection_ingest")
    existing_ids = store.collection.get()["ids"]
    if existing_ids:
        store.collection.delete(ids=existing_ids)

    # Initially ingest 4 files manually by skipping test_apollo.txt
    from backend.rag.ingestion import DocumentIngestor
    from backend.rag.chunking import TextChunker
    ingestor = DocumentIngestor()
    chunker = TextChunker()

    for filename in DEMO_FILES:
        if filename == "test_apollo.txt":
            continue
        file_path = os.path.join("./data", filename)
        docs = ingestor.ingest(file_path)
        chunks = chunker.chunk_documents(docs)
        embeddings = embedding_service.embed_documents([c["text"] for c in chunks])
        store.add_chunks(chunks, embeddings)

    sources_before = get_indexed_sources(store)
    assert "test_apollo.txt" not in sources_before

    # Run bootstrapping
    ensure_demo_data_ingested(store, embedding_service)

    sources_after = get_indexed_sources(store)
    assert "test_apollo.txt" in sources_after

def test_one_file_fails_application_continues(embedding_service):
    store = VectorStore(collection_name="test_fail_continue_ingest")
    existing_ids = store.collection.get()["ids"]
    if existing_ids:
        store.collection.delete(ids=existing_ids)

    original_ingest = DocumentIngestor.ingest

    def mock_ingest(self, file_path):
        if "quantum_test.txt" in file_path:
            raise RuntimeError("Simulated file ingest error")
        return original_ingest(self, file_path)

    with patch("backend.rag.ingestion.DocumentIngestor.ingest", side_effect=mock_ingest, autospec=True):
        # ensure_demo_data_ingested should catch the error for quantum_test.txt and continue with the rest
        ensure_demo_data_ingested(store, embedding_service)

    sources = get_indexed_sources(store)
    assert "quantum_test.txt" not in sources
    assert "sample_document.txt" in sources
    assert "security_demo.txt" in sources
    assert "test_apollo.txt" in sources
    assert "manual_test.txt.txt" in sources

def test_correct_source_metadata_preserved(embedding_service):
    store = VectorStore(collection_name="test_metadata_collection_ingest")
    existing_ids = store.collection.get()["ids"]
    if existing_ids:
        store.collection.delete(ids=existing_ids)

    ensure_demo_data_ingested(store, embedding_service)
    results = store.collection.get(include=["metadatas"])
    metadatas = results.get("metadatas", [])

    for meta in metadatas:
        assert "source" in meta
        assert meta["source"] in DEMO_FILES
        assert "page" in meta
        assert isinstance(meta["page"], int)
