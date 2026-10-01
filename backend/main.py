import os
import time
from backend.rag.ingestion import DocumentIngestor
from backend.rag.chunking import TextChunker
from backend.rag.embeddings import EmbeddingService
from backend.rag.vector_store import VectorStore
from backend.rag.retrieval import Retriever
from backend.diagnostics.retrieval_diagnostics import DiagnosticsEngine, RetrievalDiagnosticResult
from backend.generation.context_builder import ContextBuilder
from backend.generation.generator import FallbackGenerator
from backend.diagnostics.grounding_diagnostics import GroundingDiagnosticsEngine, GroundingDiagnosticResult
from backend.diagnostics.efficiency_diagnostics import EfficiencyDiagnosticsEngine, EfficiencyDiagnosticResult

def print_full_debug_report(query: str, retrieval_report: RetrievalDiagnosticResult, answer: str, model_name: str, grounding_report: GroundingDiagnosticResult, efficiency_report: EfficiencyDiagnosticResult):
    print("=" * 50)
    print("RAG DEBUGGER")
    print("=" * 12)
    print(f"\nQUERY:\n{query}")
    
    print("\n" + "-" * 3)
    print("## RETRIEVAL\n")
    print(f"Status: {retrieval_report.status}\n")
    print(f"Retrieved chunks: {int(retrieval_report.statistics['retrieved_count'])}")
    print(f"Best score: {retrieval_report.statistics['best_score']:.4f}")
    
    print("\n" + "-" * 3)
    print("## GENERATED ANSWER\n")
    print(f"{answer}\n")
    print(f"Generation mode:\n{model_name}")
    
    print("\n" + "-" * 3)
    print("## GROUNDING\n")
    print(f"Status: {grounding_report.status}\n")
    print(f"Explanation:\n{grounding_report.explanation}\n")
    
    all_claims = grounding_report.supported_claims + grounding_report.unsupported_claims
    for i, claim in enumerate(all_claims):
        print(f"CLAIM {i+1}:")
        print(f"{claim.claim_text}\n")
        print("Supported:")
        print("YES" if claim.supported else "NO")
        print("\nEvidence:")
        if claim.supported and claim.evidence_chunk_id:
            print(f"Chunk {claim.evidence_chunk_id}")
        else:
            print("None")
        if claim.supported:
            print(f"\nSupport score:\n{claim.support_score:.4f}")
        print()
    
    print("-" * 3)
    print("## EFFICIENCY DIAGNOSTICS\n")
    print("### LATENCY")
    print(f"Retrieval:           {efficiency_report.retrieval_latency_ms:.2f} ms")
    print(f"Context building:    {efficiency_report.context_build_latency_ms:.2f} ms")
    print(f"Generation:          {efficiency_report.generation_latency_ms:.2f} ms")
    print(f"Total pipeline:      {efficiency_report.total_latency_ms:.2f} ms\n")
    
    print("### CONTEXT")
    print(f"Retrieved chunks:    {efficiency_report.retrieved_chunk_count}")
    print(f"Selected chunks:     {efficiency_report.selected_chunk_count}")
    print(f"Context characters:  {efficiency_report.context_characters}")
    print(f"Average chunk size:  {efficiency_report.average_chunk_characters:.1f}")
    print(f"Largest chunk:       {efficiency_report.largest_chunk_characters}\n")
    
    print("### TOKENS (ESTIMATED)")
    print(f"Input tokens:        {efficiency_report.estimated_input_tokens}")
    print(f"Output tokens:       {efficiency_report.estimated_output_tokens}")
    print(f"Total tokens:        {efficiency_report.estimated_total_tokens}\n")
    
    print("### CONTEXT EFFICIENCY")
    print(f"Context reduction:   {efficiency_report.context_reduction_percent:.1f}%")
    print(f"Status:              {efficiency_report.efficiency_status}\n")
    
    print("Warnings:")
    for w in efficiency_report.warnings:
        print(w)

    print("\n" + "-" * 3)
    print("## FINAL DIAGNOSIS\n")
    print(f"Retrieval: {retrieval_report.status}")
    print(f"Generation: {model_name}")
    print(f"Grounding: {grounding_report.status}")
    print(f"Efficiency: {efficiency_report.efficiency_status}")
    print("\n" + "-" * 50)

def main():
    print("--- RAG DEBUG PIPELINE ---")
    
    # 1. Setup Data
    data_dir = "./data"
    os.makedirs(data_dir, exist_ok=True)
    sample_doc_path = os.path.join(data_dir, "sample_document.txt")
    
    if not os.path.exists(sample_doc_path):
        print(f"Creating sample document at {sample_doc_path}...")
        with open(sample_doc_path, "w", encoding="utf-8") as f:
            f.write("RAG Debugger is a tool for developers to inspect Retrieval-Augmented Generation pipelines.\n")
            f.write("It provides insights into retrieved contexts, vector similarities, and potential grounding failures.\n")
            f.write("A typical RAG pipeline consists of document ingestion, text extraction, chunking, embedding generation, vector storage, and similarity retrieval.\n")
            f.write("SentenceTransformers is often used for generating lightweight dense embeddings.\n")
            f.write("ChromaDB is a popular open-source vector database used for local storage.\n")
    
    # Initialize components
    print("Initializing components...")
    ingestor = DocumentIngestor()
    chunker = TextChunker()
    embedding_service = EmbeddingService()
    vector_store = VectorStore()
    retriever = Retriever(embedding_service, vector_store)
    retrieval_diagnostics = DiagnosticsEngine()
    context_builder = ContextBuilder()
    generator = FallbackGenerator()
    grounding_diagnostics = GroundingDiagnosticsEngine(embedding_service)
    efficiency_diagnostics = EfficiencyDiagnosticsEngine()

    # 2. Ingestion
    print(f"Ingesting document: {sample_doc_path}")
    documents = ingestor.ingest(sample_doc_path)
    
    # 3. Chunking
    chunks = chunker.chunk_documents(documents)

    # 4. Embeddings
    chunk_texts = [chunk["text"] for chunk in chunks]
    embeddings = embedding_service.embed_documents(chunk_texts)

    # 5. Vector Storage
    vector_store.add_chunks(chunks, embeddings)
    
    def run_pipeline(query: str):
        print(f"\nRunning pipeline for query: '{query}'...")
        top_k = 3
        
        t0_total = time.perf_counter()
        
        # Retrieve
        t0_ret = time.perf_counter()
        raw_results = retriever.retrieve(query, top_k=top_k)
        t1_ret = time.perf_counter()
        retrieval_report = retrieval_diagnostics.analyze(query, top_k, raw_results)
        
        # Context
        t0_ctx = time.perf_counter()
        context_data = context_builder.build_context(query, raw_results)
        t1_ctx = time.perf_counter()
        
        # Generate
        t0_gen = time.perf_counter()
        gen_result = generator.generate(query, context_data["formatted_context"])
        t1_gen = time.perf_counter()
        
        # Grounding
        # We pass the selected chunks from context_data
        grounding_report = grounding_diagnostics.analyze(gen_result.answer, context_data["selected_chunks"])
        
        t1_total = time.perf_counter()
        
        # Efficiency
        efficiency_report = efficiency_diagnostics.analyze(
            retrieval_latency_ms=(t1_ret - t0_ret) * 1000,
            context_build_latency_ms=(t1_ctx - t0_ctx) * 1000,
            generation_latency_ms=(t1_gen - t0_gen) * 1000,
            total_latency_ms=(t1_total - t0_total) * 1000,
            query=query,
            retrieved_chunks=raw_results,
            selected_chunks=context_data["selected_chunks"],
            formatted_context=context_data["formatted_context"],
            generated_answer=gen_result.answer
        )
        
        # Report
        print_full_debug_report(query, retrieval_report, gen_result.answer, gen_result.model_name, grounding_report, efficiency_report)

    # 6. Test Scenarios
    run_pipeline("What database is used for local storage?")
    run_pipeline("What is quantum computing?")
    run_pipeline("Test unsupported claim about local storage.")

if __name__ == "__main__":
    main()

