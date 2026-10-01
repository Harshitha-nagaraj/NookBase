from backend.generation.context_builder import ContextBuilder
from backend.generation.generator import FallbackGenerator
from backend.diagnostics.grounding_diagnostics import GroundingDiagnosticsEngine
from backend.rag.embeddings import EmbeddingService

def test_context_builder():
    builder = ContextBuilder()
    raw_results = [
        {"source": "test.txt", "page": 1, "chunk_id": "c1", "text": "Content 1"}
    ]
    
    ctx = builder.build_context("query", raw_results)
    assert "[Source 1]" in ctx["formatted_context"]
    assert "Content 1" in ctx["formatted_context"]
    assert len(ctx["selected_chunks"]) == 1

def test_generation_fallback():
    generator = FallbackGenerator()
    res = generator.generate("What database is used for local storage?", "Context mentions ChromaDB is a popular open-source vector database used for local storage")
    assert "ChromaDB" in res.answer
    assert res.model_name == "fallback_mock_generator"
    
    res2 = generator.generate("What is quantum computing?", "Random context")
    assert "cannot determine" in res2.answer.lower()

def test_grounding_diagnostics():
    # We need an embedding service for grounding diagnostics
    embedding_service = EmbeddingService()
    engine = GroundingDiagnosticsEngine(embedding_service)
    
    context_chunks = [
        {"chunk_id": "c1", "source": "db_doc.txt", "text": "ChromaDB is a popular open-source vector database used for local storage."}
    ]
    
    # 1. Fully grounded
    res_grounded = engine.analyze("ChromaDB is a popular open-source vector database used for local storage.", context_chunks)
    assert res_grounded.status == "GROUNDED"
    assert len(res_grounded.supported_claims) > 0
    
    # 2. Unsupported
    res_unsupported = engine.analyze("This database was manufactured in ancient Egypt during 1200 BC.", context_chunks)
    assert res_unsupported.status in ["UNSUPPORTED", "PARTIALLY_GROUNDED"]
    
    # 3. No Answer
    res_no_answer = engine.analyze("I cannot determine the answer from the provided context.", context_chunks)
    assert res_no_answer.status == "NO_ANSWER"

def test_grounding_scenarios_a_to_f():
    embedding_service = EmbeddingService()
    engine = GroundingDiagnosticsEngine(embedding_service)

    context_chunks = [
        {"chunk_id": "c1", "source": "vector_db.txt", "text": "ChromaDB is an open-source vector database designed for local developer storage."}
    ]

    # Scenario A: Fully supported answer
    res_a = engine.analyze("ChromaDB is an open-source vector database designed for local developer storage.", context_chunks)
    assert res_a.status == "GROUNDED"
    assert res_a.total_claims >= 1
    assert res_a.claims[0].status == "SUPPORTED"
    assert res_a.claims[0].supported is True

    # Scenario B: Partially supported answer
    partially_supported_answer = "ChromaDB is an open-source vector database designed for local developer storage. The solar system contains eight major planets revolving around the sun."
    res_b = engine.analyze(partially_supported_answer, context_chunks)
    assert res_b.status == "PARTIALLY_GROUNDED"
    statuses = [c.status for c in res_b.claims]
    assert "SUPPORTED" in statuses or "PARTIALLY_SUPPORTED" in statuses
    assert "UNSUPPORTED" in statuses


    # Scenario C: Unsupported answer
    res_c = engine.analyze("Superconductors operate at room temperature with zero internal electrical resistance.", context_chunks)
    assert res_c.status == "UNSUPPORTED"
    assert res_c.claims[0].status == "UNSUPPORTED"
    assert res_c.claims[0].supported is False

    # Scenario D: Empty answer
    res_d = engine.analyze("", context_chunks)
    assert res_d.status == "NO_ANSWER"
    assert res_d.total_claims == 0

    # Scenario E: No retrieved chunks
    res_e = engine.analyze("ChromaDB is a vector database.", [])
    assert res_e.status == "NO_ANSWER"

    # Scenario F: Claim-to-chunk supporting evidence is returned
    res_f = engine.analyze("ChromaDB is an open-source vector database designed for local developer storage.", context_chunks)
    assert len(res_f.claims[0].supporting_chunks) > 0
    supp_chunk = res_f.claims[0].supporting_chunks[0]
    assert supp_chunk.chunk_id == "c1"
    assert supp_chunk.source == "vector_db.txt"
    assert supp_chunk.score > 0.5
    assert "ChromaDB" in supp_chunk.text_snippet

