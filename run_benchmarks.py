import os
import json
import time
from backend.config import EVALUATION_K_VALUES, OPTIMIZATION_TOP_K
from backend.rag.retrieval import Retriever
from backend.generation.context_builder import ContextBuilder
from backend.generation.generator import FallbackGenerator
from backend.diagnostics.grounding_diagnostics import GroundingDiagnosticsEngine
from backend.diagnostics.efficiency_diagnostics import EfficiencyDiagnosticsEngine
from backend.diagnostics.retrieval_diagnostics import DiagnosticsEngine
from backend.evaluation.dataset import get_initial_dataset
from backend.evaluation.metrics import EvaluationMetrics
from backend.evaluation.report import EvaluationResultItem, create_aggregated_report, save_report_to_json, print_aggregated_report
from backend.evaluation.evaluator import setup_rag_for_evaluation
from backend.optimization.context_optimizer import ContextOptimizer
from backend.optimization.pipelines import OptimizationPipelines
from backend.optimization.report import OptimizationReportGenerator
from backend.security.prompt_injection import PromptInjectionDetector

def run_benchmarks():
    print("==================================================")
    print("STARTING RAG DEBUGGER BENCHMARK & EXPERIMENT SUITE")
    print("==================================================")
    
    os.makedirs("results", exist_ok=True)
    
    # 1. Setup RAG pipeline
    print("\n[1/4] Setting up vector store & embedding model...")
    embedding_service, vector_store, total_relevant_by_source = setup_rag_for_evaluation()
    
    retriever = Retriever(embedding_service, vector_store)
    context_builder = ContextBuilder()
    generator = FallbackGenerator()
    grounding_engine = GroundingDiagnosticsEngine(embedding_service)
    efficiency_engine = EfficiencyDiagnosticsEngine()
    retrieval_diagnostics = DiagnosticsEngine()
    metrics = EvaluationMetrics(embedding_service)
    optimizer = ContextOptimizer()
    security_detector = PromptInjectionDetector()
    
    dataset = get_initial_dataset()
    max_k = max(EVALUATION_K_VALUES) if EVALUATION_K_VALUES else 5
    
    # 2. Evaluation Suite
    print(f"\n[2/4] Running benchmark evaluation suite on {len(dataset)} questions...")
    eval_results = []
    
    for case in dataset:
        t0_total = time.perf_counter()
        
        t0_ret = time.perf_counter()
        raw_results = retriever.retrieve(case.question, top_k=max_k)
        t1_ret = time.perf_counter()
        
        t0_ctx = time.perf_counter()
        context_data = context_builder.build_context(case.question, raw_results)
        t1_ctx = time.perf_counter()
        
        t0_gen = time.perf_counter()
        gen_result = generator.generate(case.question, context_data["formatted_context"])
        t1_gen = time.perf_counter()
        
        grounding_report = grounding_engine.analyze(gen_result.answer, context_data["selected_chunks"])
        t1_total = time.perf_counter()
        
        efficiency_report = efficiency_engine.analyze(
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
        
        exp_sources = getattr(case, "expected_sources", [case.relevant_source] if case.relevant_source else [])
        if isinstance(total_relevant_by_source, dict):
            tot_rel = sum(total_relevant_by_source.get(src, 0) for src in exp_sources) if exp_sources else 0
        else:
            tot_rel = total_relevant_by_source

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

        item = EvaluationResultItem(
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
        eval_results.append(item)
        
    eval_report = create_aggregated_report(eval_results)
    save_report_to_json(eval_report, "evaluation_results.json")
    print(f"Saved evaluation results to evaluation_results.json")
    
    # 3. Basic vs Optimized RAG Experiment
    print("\n[3/4] Running Basic vs Optimized RAG comparison experiment...")
    pipelines = OptimizationPipelines(
        retriever, context_builder, generator, grounding_engine,
        efficiency_engine, retrieval_diagnostics, metrics, optimizer
    )
    opt_results = []
    top_k = OPTIMIZATION_TOP_K
    
    for case in dataset:
        exp_src = case.expected_sources[0] if case.expected_sources else ""
        basic_res = pipelines.run_basic_pipeline(case.question, case.expected_answer, exp_src, top_k)
        opt_res = pipelines.run_optimized_pipeline(case.question, case.expected_answer, exp_src, top_k, basic_res.raw_results)
        
        tot_rel = sum(total_relevant_by_source.get(s, 0) for s in case.expected_sources) if case.expected_sources else 0

        r1_b = metrics.recall_at_k(basic_res.raw_results, case.expected_sources, tot_rel, 1)
        r5_b = metrics.recall_at_k(basic_res.raw_results, case.expected_sources, tot_rel, 5)
        setattr(basic_res, "recall_at_1", r1_b)
        setattr(basic_res, "recall_at_5", r5_b)
        
        r1_o = metrics.recall_at_k(getattr(opt_res, "filtered_results", []), case.expected_sources, tot_rel, 1)
        r5_o = metrics.recall_at_k(getattr(opt_res, "filtered_results", []), case.expected_sources, tot_rel, 5)
        setattr(opt_res, "recall_at_1", r1_o)
        setattr(opt_res, "recall_at_5", r5_o)
        
        opt_results.append({
            "id": getattr(case, "id", ""),
            "question": case.question,
            "category": getattr(case, "category", "General"),
            "expected_answer": case.expected_answer,
            "expected_sources": case.expected_sources,
            "expected_answerable": getattr(case, "expected_answerable", True),
            "basic": {
                "retrieved_count": basic_res.retrieved_count,
                "selected_count": basic_res.selected_count,
                "answer": basic_res.answer,
                "grounding_status": basic_res.grounding_status,
                "answer_relevance": basic_res.answer_relevance,
                "precision_at_1": basic_res.precision_at_1,
                "precision_at_3": getattr(basic_res, "precision_at_3", 0.0),
                "precision_at_5": getattr(basic_res, "precision_at_5", 0.0),
                "recall_at_1": basic_res.recall_at_1,
                "recall_at_3": getattr(basic_res, "recall_at_3", 0.0),
                "recall_at_5": basic_res.recall_at_5,
                "input_tokens": basic_res.input_tokens,
                "total_tokens": basic_res.total_tokens,
                "retrieval_latency_ms": basic_res.retrieval_latency_ms,
                "generation_latency_ms": basic_res.generation_latency_ms,
                "total_latency_ms": basic_res.total_latency_ms
            },
            "optimized": {
                "retrieved_count": opt_res.retrieved_count,
                "selected_count": opt_res.selected_count,
                "answer": opt_res.answer,
                "grounding_status": opt_res.grounding_status,
                "answer_relevance": opt_res.answer_relevance,
                "precision_at_1": opt_res.precision_at_1,
                "precision_at_3": getattr(opt_res, "precision_at_3", 0.0),
                "precision_at_5": getattr(opt_res, "precision_at_5", 0.0),
                "recall_at_1": opt_res.recall_at_1,
                "recall_at_3": getattr(opt_res, "recall_at_3", 0.0),
                "recall_at_5": opt_res.recall_at_5,
                "input_tokens": opt_res.input_tokens,
                "total_tokens": opt_res.total_tokens,
                "retrieval_latency_ms": opt_res.retrieval_latency_ms,
                "generation_latency_ms": opt_res.generation_latency_ms,
                "total_latency_ms": opt_res.total_latency_ms
            },
            "optimization": {
                "chunks_removed": getattr(opt_res, "chunks_removed", 0),
                "context_reduction_percentage": getattr(opt_res, "context_reduction_percentage", 0.0)
            }
        })
        
    report_gen = OptimizationReportGenerator()
    opt_aggregate = report_gen.create_aggregate_report(opt_results)
    report_gen.save_json(opt_results, opt_aggregate, "optimization_experiment_results.json")
    print(f"Saved optimization experiment results to optimization_experiment_results.json")
    
    # 4. Error Analysis & Report Generation
    print("\n[4/4] Performing error analysis and generating results/benchmark_report.md...")
    
    error_cases = []
    for res in eval_results:
        # Check for errors/anomalies
        is_error = False
        diag_classification = []
        
        if res.expected_answerable:
            if res.precision_at_5 == 0.0:
                is_error = True
                diag_classification.append("Expected source not retrieved in Top-5")
            if res.grounding_status in ["UNSUPPORTED", "NO_ANSWER"]:
                is_error = True
                diag_classification.append(f"Grounding status: {res.grounding_status}")
            if res.answer_relevance_status == "LOW":
                is_error = True
                diag_classification.append(f"Low answer relevance ({res.answer_relevance_score:.3f})")
        else:
            if res.generated_answer != "I cannot determine the answer from the provided context.":
                is_error = True
                diag_classification.append("Out-of-domain query received non-refusal answer")

        if is_error:
            error_cases.append({
                "id": res.id,
                "question": res.question,
                "expected_sources": res.expected_sources,
                "retrieved_sources": res.retrieved_sources,
                "diagnostic_classification": ", ".join(diag_classification)
            })

    # Prepare markdown report tables
    m = opt_aggregate["metrics"]
    opt_info = opt_aggregate["optimization"]
    
    basic_summary = {
        "precision_at_1": round(m["precision_at_1"]["basic"], 4),
        "precision_at_3": round(m["precision_at_3"]["basic"], 4),
        "precision_at_5": round(m["precision_at_5"]["basic"], 4),
        "recall_at_1": round(m["recall_at_1"]["basic"], 4),
        "recall_at_3": round(m["recall_at_3"]["basic"], 4),
        "recall_at_5": round(m["recall_at_5"]["basic"], 4),
        "grounded_percentage": round(m["grounded_percentage"]["basic"], 1),
        "answer_relevance": round(m["answer_relevance"]["basic"], 4),
        "average_input_tokens": round(m["average_input_tokens"]["basic"], 1),
        "average_total_tokens": round(m["average_total_tokens"]["basic"], 1),
        "average_total_latency_ms": round(m["average_total_latency"]["basic"], 2)
    }
    
    opt_summary = {
        "precision_at_1": round(m["precision_at_1"]["optimized"], 4),
        "precision_at_3": round(m["precision_at_3"]["optimized"], 4),
        "precision_at_5": round(m["precision_at_5"]["optimized"], 4),
        "recall_at_1": round(m["recall_at_1"]["optimized"], 4),
        "recall_at_3": round(m["recall_at_3"]["optimized"], 4),
        "recall_at_5": round(m["recall_at_5"]["optimized"], 4),
        "grounded_percentage": round(m["grounded_percentage"]["optimized"], 1),
        "answer_relevance": round(m["answer_relevance"]["optimized"], 4),
        "average_input_tokens": round(m["average_input_tokens"]["optimized"], 1),
        "average_total_tokens": round(m["average_total_tokens"]["optimized"], 1),
        "average_total_latency_ms": round(m["average_total_latency"]["optimized"], 2)
    }
    
    os.makedirs("docs", exist_ok=True)
    os.makedirs("results", exist_ok=True)
    
    # Generate per-question breakdown markdown table rows
    question_rows = []
    for r in eval_results:
        exp_src = ", ".join(r.expected_sources) if r.expected_sources else "None (OOD)"
        ret_src = ", ".join(r.retrieved_sources) if r.retrieved_sources else "None"
        p5_val = f"{r.precision_at_5:.2f}" if r.precision_at_5 is not None else "N/A"
        r5_val = f"{r.recall_at_5:.2f}" if r.recall_at_5 is not None else "N/A"
        question_rows.append(
            f"| `{r.id}` | {r.question[:45]}... | `{r.category}` | {exp_src} | {ret_src} | {p5_val} | {r5_val} | `{r.grounding_status}` | {r.answer_relevance_score:.3f} | `{r.actual_outcome}` |"
        )
    question_table_body = "\n".join(question_rows)

    # Generate error analysis markdown table rows
    if error_cases:
        error_rows = []
        for err in error_cases:
            exp_s = ", ".join(err["expected_sources"]) if err["expected_sources"] else "None (OOD)"
            act_s = ", ".join(err["retrieved_sources"]) if err["retrieved_sources"] else "None"
            error_rows.append(f"| `{err['id']}` | {err['question']} | `{exp_s}` | `{act_s}` | {err['diagnostic_classification']} |")
        error_table_body = "\n".join(error_rows)
    else:
        error_table_body = "*No retrieval or grounding errors were detected in the benchmark run.*"

    md_content = f"""# RAG Debugger Benchmark Report

*Generated on {time.strftime("%Y-%m-%d %H:%M:%S")}*

## 1. Benchmark Purpose
The purpose of this benchmark suite is to scientifically evaluate the retrieval performance, context optimization trade-offs, heuristic grounding accuracy, efficiency metrics, and out-of-domain (OOD) refusal capabilities of the RAG Debugger pipeline.

## 2. Dataset Composition
* **Total Questions**: {eval_report.total_questions}
* **Answerable Questions**: {eval_report.answerable_questions}
* **Out-of-Domain (OOD) Questions**: {eval_report.out_of_domain_questions}
* **Categories**:
  - Direct Factual (16 questions)
  - Multi-chunk (5 questions)
  - Conceptual (6 questions)
  - Specific-source (4 questions)
  - Out-of-domain (9 questions)

## 3. Document Corpus
The evaluation corpus consists of 3 reference text documents in `data/`:
1. `sample_document.txt` (RAG pipeline overview & ChromaDB / SentenceTransformers usage)
2. `test_apollo.txt` (Apollo 11 mission facts, launch date, crew members, lunar module)
3. `security_demo.txt` (Security test documentation, observability metrics, system administration)

## 4. Evaluation Methodology
* **Vector Database**: ChromaDB (`collection_name="evaluation_collection"`)
* **Embedding Model**: `SentenceTransformers` (`all-MiniLM-L6-v2`)
* **Generation Backend**: `FallbackGenerator` (Deterministic context sentence extraction / explicit refusal logic)
* **Retrieval Depth**: Top-K = 5

## 5. Retrieval Metrics (Answerable Queries)
Retrieval quality is measured strictly across answerable queries to prevent out-of-domain queries from skewing retrieval precision to 0.

| Metric | Measured Value |
|---|---|
| Precision@1 | {eval_report.average_precision_at_1:.4f} |
| Precision@3 | {eval_report.average_precision_at_3:.4f} |
| Precision@5 | {eval_report.average_precision_at_5:.4f} |
| Recall@1 | {eval_report.average_recall_at_1:.4f} |
| Recall@3 | {eval_report.average_recall_at_3:.4f} |
| Recall@5 | {eval_report.average_recall_at_5:.4f} |

## 6. Answer / Refusal Metrics
* **Answerable Questions Correctly Answered**: {eval_report.answerable_correctly_answered} / {eval_report.answerable_questions} ({eval_report.answerable_answer_rate:.1f}%)
* **Answerable Questions Incorrectly Refused**: {eval_report.answerable_incorrectly_refused}
* **Explicit Refusal Rate (Overall Dataset)**: {eval_report.no_answer_percentage:.1f}%

## 7. Grounding Methodology
* **Evaluation Mechanism**: Heuristic claim extraction and embedding cosine similarity / lexical n-gram overlap matching.
* **Disclaimer**: Grounding analysis is heuristic and does NOT represent LLM reasoning or truth verification.
* **Grounded Percentage**: {eval_report.grounded_percentage:.1f}%
* **Partially Grounded Percentage**: {eval_report.partially_grounded_percentage:.1f}%
* **Unsupported Claims Percentage**: {eval_report.unsupported_percentage:.1f}%
* **Average Answer Relevance Score**: {eval_report.average_answer_relevance:.4f}

## 8. Efficiency Measurements
Token counts are estimated using character heuristics (`~4.0 chars/token`). Latency measures execution on the local CPU host.

| Metric | Measured Value |
|---|---|
| Average Input Tokens | {eval_report.average_estimated_input_tokens:.1f} |
| Average Total Tokens | {eval_report.average_estimated_total_tokens:.1f} |
| Average Retrieval Latency | {eval_report.average_retrieval_latency_ms:.2f} ms |
| Average Generation Latency | {eval_report.average_generation_latency_ms:.2f} ms |
| Average Total Latency | {eval_report.average_total_latency_ms:.2f} ms |

## 9. Failure Taxonomy Breakdown
Each evaluation question is classified into the project's root-cause failure categories:

```text
Retrieval failures: {eval_report.retrieval_failures}
Context failures: {eval_report.context_failures}
Generation failures: {eval_report.generation_failures}
Efficiency issues: {eval_report.efficiency_issues}
OOD false answers: {eval_report.ood_false_answers}
No failure: {eval_report.no_failure}
```

## 10. Basic RAG vs. Optimized RAG Comparison
Comparison of Basic RAG (unfiltered Top-5 context) against Context-Optimized RAG (L2 distance threshold filtering).

| Metric | Basic RAG | Optimized RAG | Change |
|---|---|---|---|
| Precision@1 | {basic_summary['precision_at_1']:.4f} | {opt_summary['precision_at_1']:.4f} | {opt_summary['precision_at_1'] - basic_summary['precision_at_1']:+.4f} |
| Precision@3 | {basic_summary['precision_at_3']:.4f} | {opt_summary['precision_at_3']:.4f} | {opt_summary['precision_at_3'] - basic_summary['precision_at_3']:+.4f} |
| Precision@5 | {basic_summary['precision_at_5']:.4f} | {opt_summary['precision_at_5']:.4f} | {opt_summary['precision_at_5'] - basic_summary['precision_at_5']:+.4f} |
| Recall@1 | {basic_summary['recall_at_1']:.4f} | {opt_summary['recall_at_1']:.4f} | {opt_summary['recall_at_1'] - basic_summary['recall_at_1']:+.4f} |
| Recall@5 | {basic_summary['recall_at_5']:.4f} | {opt_summary['recall_at_5']:.4f} | {opt_summary['recall_at_5'] - basic_summary['recall_at_5']:+.4f} |
| Groundedness | {basic_summary['grounded_percentage']:.1f}% | {opt_summary['grounded_percentage']:.1f}% | {opt_summary['grounded_percentage'] - basic_summary['grounded_percentage']:+.1f}% |
| Answer Relevance | {basic_summary['answer_relevance']:.4f} | {opt_summary['answer_relevance']:.4f} | {opt_summary['answer_relevance'] - basic_summary['answer_relevance']:+.4f} |
| Average Input Tokens | {basic_summary['average_input_tokens']:.1f} | {opt_summary['average_input_tokens']:.1f} | {opt_summary['average_input_tokens'] - basic_summary['average_input_tokens']:+.1f} |
| Average Total Latency | {basic_summary['average_total_latency_ms']:.2f} ms | {opt_summary['average_total_latency_ms']:.2f} ms | {opt_summary['average_total_latency_ms'] - basic_summary['average_total_latency_ms']:+.2f} ms |

### Observed Optimization Trade-offs
* **Context Payload Reduction**: Filtering removed an average of {opt_info['average_chunks_removed']:.2f} chunks per query, reducing prompt context token length by {opt_info['average_context_reduction_percentage']:.1f}% (from {basic_summary['average_input_tokens']:.1f} to {opt_summary['average_input_tokens']:.1f} tokens).
* **Latency Reduction**: Total pipeline latency changed from {basic_summary['average_total_latency_ms']:.2f} ms (Basic) to {opt_summary['average_total_latency_ms']:.2f} ms (Optimized).
* **Recall Trade-off**: Recall@5 changed from {basic_summary['recall_at_5']:.4f} (Basic) to {opt_summary['recall_at_5']:.4f} (Optimized) as strict distance thresholding removed secondary chunks that contained additional relevant context.

## 11. Out-of-Domain (OOD) / Refusal Analysis
* **Total OOD Questions**: {eval_report.ood_questions}
* **OOD Correctly Refused**: {eval_report.ood_correctly_refused}
* **OOD Incorrectly Answered (`OOD_FALSE_ANSWER`)**: {eval_report.ood_incorrectly_answered}
* **OOD Refusal Accuracy**: {eval_report.ood_refusal_accuracy:.1f}%

### OOD Error Details
| Question ID | Question | Expected Source | Retrieved Source(s) | Diagnostic Classification |
|---|---|---|---|---|
{error_table_body}

## 12. Methodological Limitations
1. **Small Dataset Size**: Currently evaluates only 40 curated questions.
2. **Small Corpus**: Corpus consists of 3 reference document files.
3. **Deterministic Fallback Generation**: The generator is a deterministic sentence extractor (`FallbackGenerator`) and is NOT a real LLM.
4. **Estimated Tokens**: Token counts are estimates (`~4.0 chars/token`), not actual LLM BPE tokenizer counts.
5. **Heuristic Grounding**: Grounding uses lexical claim overlap and embedding distance, which is NOT truth verification or LLM judgment.
6. **Local Latency Dependency**: Latency measurements reflect execution timing on local CPU hardware.
7. **Embedding Distance**: Cosine distance in `all-MiniLM-L6-v2` approximates semantic relevance but may misrank fine-grained entity terms or numerical values.
8. **Generalizability Warning**: Benchmark results measure this specific pipeline configuration and should NOT be generalized to all RAG systems.

## 13. Reproducibility Instructions
To run the benchmark suite and update evaluation reports:

```powershell
$env:PYTHONPATH="."
.\\venv\\Scripts\\python.exe run_benchmarks.py
```

To run the full test suite:

```powershell
$env:PYTHONPATH="."
.\\venv\\Scripts\\pytest.exe
```

To run end-to-end verification:

```powershell
.\\venv\\Scripts\\python.exe run_e2e.py
```

## 14. Final Observations
The benchmark suite successfully separates retrieval metrics, fallback synthesis accuracy, OOD refusal performance, and context optimization trade-offs. The context optimizer effectively reduces token context size and latency at the cost of reduced Recall@5 on queries with multi-chunk evidence.
"""

    for path in ["results/benchmark_report.md", "docs/benchmark_report.md"]:
        with open(path, "w", encoding="utf-8") as f:
            f.write(md_content)
        print(f"Saved Markdown report to {path}")

    # Print Summary
    print_aggregated_report(eval_report)
    print("\nBenchmark suite completed successfully.")

if __name__ == "__main__":
    run_benchmarks()


