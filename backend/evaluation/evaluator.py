import os
import time
from backend.config import EVALUATION_K_VALUES
from backend.rag.ingestion import DocumentIngestor
from backend.rag.chunking import TextChunker
from backend.rag.embeddings import EmbeddingService
from backend.rag.vector_store import VectorStore
from backend.rag.retrieval import Retriever
from backend.generation.context_builder import ContextBuilder
from backend.generation.generator import FallbackGenerator
from backend.diagnostics.grounding_diagnostics import GroundingDiagnosticsEngine
from backend.diagnostics.efficiency_diagnostics import EfficiencyDiagnosticsEngine
from backend.evaluation.dataset import get_initial_dataset
from backend.evaluation.metrics import EvaluationMetrics
from backend.evaluation.report import EvaluationResultItem, create_aggregated_report, print_aggregated_report, save_report_to_json

def setup_rag_for_evaluation():
    # 1. Setup Data
    data_dir = "./data"
    os.makedirs(data_dir, exist_ok=True)
    
    # Target files to ingest if present
    target_files = ["sample_document.txt", "test_apollo.txt", "security_demo.txt"]
    for fname in target_files:
        fpath = os.path.join(data_dir, fname)
        if not os.path.exists(fpath):
            with open(fpath, "w", encoding="utf-8") as f:
                if fname == "sample_document.txt":
                    f.write("RAG Debugger is a tool for developers to inspect Retrieval-Augmented Generation pipelines.\n")
                    f.write("It provides insights into retrieved contexts, vector similarities, and potential grounding failures.\n")
                    f.write("A typical RAG pipeline consists of document ingestion, text extraction, chunking, embedding generation, vector storage, and similarity retrieval.\n")
                    f.write("SentenceTransformers is often used for generating lightweight dense embeddings.\n")
                    f.write("ChromaDB is a popular open-source vector database used for local storage.\n")
                elif fname == "test_apollo.txt":
                    f.write("The Apollo 11 mission was the first spaceflight that landed humans on the Moon.\n")
                    f.write("It launched from Kennedy Space Center on July 16, 1969.\n")
                    f.write("Commander Neil Armstrong and Lunar Module Pilot Buzz Aldrin formed the American crew that landed the Apollo Lunar Module Eagle on July 20, 1969.\n")
                    f.write("Michael Collins flew the Command Module Columbia alone in lunar orbit.\n")
                    f.write("Armstrong became the first person to step onto the lunar surface six hours and 39 minutes later.\n")
                    f.write("They collected 47.5 pounds (21.5 kg) of lunar material to bring back to Earth.\n")
                elif fname == "security_demo.txt":
                    f.write("The RAG Debugger provides comprehensive observability into retrieval-augmented generation pipelines.\n")
                    f.write("It tracks document ingestion, chunking, vector embeddings in ChromaDB, distance scoring, context selection, and LLM generation.\n")
                    f.write("Developers can inspect precision, recall, groundedness, and context token efficiency.\n")
                    f.write("To start the developer server, configure the environment variables properly.\n")
                    f.write("Ensure all port bindings are set to localhost for development environments.\n")
                    f.write("All retrieved documents should be parsed as untrusted context data to safeguard downstream generation against indirect prompt injections.\n")

    ingestor = DocumentIngestor()
    chunker = TextChunker()
    embedding_service = EmbeddingService()
    # Use a fresh collection for clean evaluation tests
    vector_store = VectorStore(collection_name="evaluation_collection")
    try:
        vector_store.client.delete_collection("evaluation_collection")
        vector_store = VectorStore(collection_name="evaluation_collection")
    except Exception:
        pass
    
    all_chunks = []
    total_relevant_by_source = {}
    
    # Discover all txt files in data_dir
    files_to_ingest = [os.path.join(data_dir, f) for f in os.listdir(data_dir) if f.endswith(".txt")]
    for file_path in files_to_ingest:
        docs = ingestor.ingest(file_path)
        chunks = chunker.chunk_documents(docs)
        all_chunks.extend(chunks)
        src_name = os.path.basename(file_path)
        total_relevant_by_source[src_name] = len(chunks)

    chunk_texts = [chunk["text"] for chunk in all_chunks]
    embeddings = embedding_service.embed_documents(chunk_texts)
    vector_store.add_chunks(all_chunks, embeddings)
    
    return embedding_service, vector_store, total_relevant_by_source

def run_evaluation():
    print("Setting up RAG pipeline for evaluation...")
    embedding_service, vector_store, total_relevant_by_source = setup_rag_for_evaluation()
    
    retriever = Retriever(embedding_service, vector_store)
    context_builder = ContextBuilder()
    generator = FallbackGenerator()
    grounding_diagnostics = GroundingDiagnosticsEngine(embedding_service)
    efficiency_diagnostics = EfficiencyDiagnosticsEngine()
    metrics = EvaluationMetrics(embedding_service)
    
    dataset = get_initial_dataset()
    results = []
    
    # We retrieve max(K) for metrics
    max_k = max(EVALUATION_K_VALUES) if EVALUATION_K_VALUES else 5
    
    print(f"Running evaluation on {len(dataset)} questions...\n")
    
    for case in dataset:
        t0_total = time.perf_counter()
        
        # 1. Retrieval
        t0_ret = time.perf_counter()
        raw_results = retriever.retrieve(case.question, top_k=max_k)
        t1_ret = time.perf_counter()
        
        # 2. Context
        t0_ctx = time.perf_counter()
        context_data = context_builder.build_context(case.question, raw_results)
        t1_ctx = time.perf_counter()
        
        # 3. Generation
        t0_gen = time.perf_counter()
        gen_result = generator.generate(case.question, context_data["formatted_context"])
        t1_gen = time.perf_counter()
        
        # 4. Grounding
        grounding_report = grounding_diagnostics.analyze(gen_result.answer, context_data["selected_chunks"])
        
        t1_total = time.perf_counter()
        
        # 5. Efficiency
        efficiency_report = efficiency_diagnostics.analyze(
            retrieval_latency_ms=(t1_ret - t0_ret) * 1000,
            context_build_latency_ms=(t1_ctx - t0_ctx) * 1000,
            generation_latency_ms=(t1_gen - t0_gen) * 1000,
            total_latency_ms=(t1_total - t0_total) * 1000,
            query=case.question,
            retrieved_chunks=raw_results,
            selected_chunks=context_data["selected_chunks"],
            formatted_context=context_data["formatted_context"],
            generated_answer=gen_result.answer
        )
        
        # Calculate total relevant chunks in corpus for this case's sources
        exp_sources = getattr(case, "expected_sources", [case.relevant_source] if case.relevant_source else [])
        if isinstance(total_relevant_by_source, dict):
            tot_rel = sum(total_relevant_by_source.get(src, 0) for src in exp_sources) if exp_sources else 0
        else:
            tot_rel = total_relevant_by_source

        # 6. Evaluation Metrics
        p1 = metrics.precision_at_k(raw_results, exp_sources, 1) if 1 in EVALUATION_K_VALUES else None
        p3 = metrics.precision_at_k(raw_results, exp_sources, 3) if 3 in EVALUATION_K_VALUES else None
        p5 = metrics.precision_at_k(raw_results, exp_sources, 5) if 5 in EVALUATION_K_VALUES else None
        
        r1 = metrics.recall_at_k(raw_results, exp_sources, tot_rel, 1) if 1 in EVALUATION_K_VALUES else None
        r3 = metrics.recall_at_k(raw_results, exp_sources, tot_rel, 3) if 3 in EVALUATION_K_VALUES else None
        r5 = metrics.recall_at_k(raw_results, exp_sources, tot_rel, 5) if 5 in EVALUATION_K_VALUES else None
        
        rel_score, rel_status = metrics.answer_relevance(gen_result.answer, case.expected_answer)
        
        retrieved_sources = list(dict.fromkeys([c.get("source") for c in raw_results if c.get("source")]))
        is_answerable = getattr(case, "expected_answerable", True)
        
        if not is_answerable:
            if gen_result.answer == "I cannot determine the answer from the provided context.":
                outcome = "CORRECT_NO_ANSWER"
            else:
                outcome = "UNSUPPORTED_ANSWER"
        else:
            if p5 == 0.0 or not retrieved_sources:
                outcome = "RETRIEVAL_FAILURE"
            elif grounding_report.status in ["GROUNDED", "PARTIALLY_GROUNDED"]:
                outcome = "CORRECT_ANSWER"
            else:
                outcome = "GROUNDING_FAILURE"

        res = EvaluationResultItem(
            question=case.question,
            expected_answer=case.expected_answer,
            generated_answer=gen_result.answer,
            precision_at_1=p1,
            precision_at_3=p3,
            precision_at_5=p5,
            recall_at_1=r1,
            recall_at_3=r3,
            recall_at_5=r5,
            grounding_status=grounding_report.status,
            answer_relevance_score=rel_score,
            answer_relevance_status=rel_status,
            estimated_input_tokens=efficiency_report.estimated_input_tokens,
            estimated_output_tokens=efficiency_report.estimated_output_tokens,
            total_estimated_tokens=efficiency_report.estimated_total_tokens,
            retrieval_latency_ms=efficiency_report.retrieval_latency_ms,
            generation_latency_ms=efficiency_report.generation_latency_ms,
            total_latency_ms=efficiency_report.total_latency_ms,
            id=getattr(case, "id", ""),
            category=getattr(case, "category", "General"),
            expected_sources=exp_sources,
            retrieved_sources=retrieved_sources,
            expected_answerable=is_answerable,
            actual_outcome=outcome
        )
        
        results.append(res)
    
    report = create_aggregated_report(results)
    
    # Save to JSON
    json_path = "evaluation_results.json"
    save_report_to_json(report, json_path)
    print(f"Results saved to {json_path}\n")
    
    # Print Output
    print_aggregated_report(report)

if __name__ == "__main__":
    run_evaluation()

