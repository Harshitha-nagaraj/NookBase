# RAG Debugger Benchmark Report

*Generated on 2026-10-01 11:36:13*

## 1. Benchmark Purpose
The purpose of this benchmark suite is to scientifically evaluate the retrieval performance, context optimization trade-offs, heuristic grounding accuracy, efficiency metrics, and out-of-domain (OOD) refusal capabilities of the RAG Debugger pipeline.

## 2. Dataset Composition
* **Total Questions**: 40
* **Answerable Questions**: 31
* **Out-of-Domain (OOD) Questions**: 9
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
| Precision@1 | 0.9032 |
| Precision@3 | 0.7312 |
| Precision@5 | 0.5548 |
| Recall@1 | 0.3360 |
| Recall@3 | 0.7823 |
| Recall@5 | 0.9274 |

## 6. Answer / Refusal Metrics
* **Answerable Questions Correctly Answered**: 31 / 31 (100.0%)
* **Answerable Questions Incorrectly Refused**: 0
* **Explicit Refusal Rate (Overall Dataset)**: 15.0%

## 7. Grounding Methodology
* **Evaluation Mechanism**: Heuristic claim extraction and embedding cosine similarity / lexical n-gram overlap matching.
* **Disclaimer**: Grounding analysis is heuristic and does NOT represent LLM reasoning or truth verification.
* **Grounded Percentage**: 85.0%
* **Partially Grounded Percentage**: 0.0%
* **Unsupported Claims Percentage**: 0.0%
* **Average Answer Relevance Score**: 0.7318

## 8. Efficiency Measurements
Token counts are estimated using character heuristics (`~4.0 chars/token`). Latency measures execution on the local CPU host.

| Metric | Measured Value |
|---|---|
| Average Input Tokens | 594.5 |
| Average Total Tokens | 621.6 |
| Average Retrieval Latency | 18.96 ms |
| Average Generation Latency | 0.22 ms |
| Average Total Latency | 121.08 ms |

## 9. Failure Taxonomy Breakdown
Each evaluation question is classified into the project's root-cause failure categories:

```text
Retrieval failures: 0
Context failures: 0
Generation failures: 0
Efficiency issues: 0
OOD false answers: 3
No failure: 37
```

## 10. Basic RAG vs. Optimized RAG Comparison
Comparison of Basic RAG (unfiltered Top-5 context) against Context-Optimized RAG (L2 distance threshold filtering).

| Metric | Basic RAG | Optimized RAG | Change |
|---|---|---|---|
| Precision@1 | 0.6750 | 0.6750 | +0.0000 |
| Precision@3 | 0.5250 | 0.5250 | +0.0000 |
| Precision@5 | 0.3800 | 0.3800 | +0.0000 |
| Recall@1 | 0.4854 | 0.4854 | +0.0000 |
| Recall@5 | 0.9437 | 0.7875 | -0.1562 |
| Groundedness | 85.0% | 85.0% | +0.0% |
| Answer Relevance | 0.7318 | 0.7318 | +0.0000 |
| Average Input Tokens | 594.5 | 249.3 | -345.2 |
| Average Total Latency | 102.07 ms | 76.52 ms | -25.55 ms |

### Observed Optimization Trade-offs
* **Context Payload Reduction**: Filtering removed an average of 3.08 chunks per query, reducing prompt context token length by 59.8% (from 594.5 to 249.3 tokens).
* **Latency Reduction**: Total pipeline latency changed from 102.07 ms (Basic) to 76.52 ms (Optimized).
* **Recall Trade-off**: Recall@5 changed from 0.9437 (Basic) to 0.7875 (Optimized) as strict distance thresholding removed secondary chunks that contained additional relevant context.

## 11. Out-of-Domain (OOD) / Refusal Analysis
* **Total OOD Questions**: 9
* **OOD Correctly Refused**: 6
* **OOD Incorrectly Answered (`OOD_FALSE_ANSWER`)**: 3
* **OOD Refusal Accuracy**: 66.7%

### OOD Error Details
| Question ID | Question | Expected Source | Retrieved Source(s) | Diagnostic Classification |
|---|---|---|---|---|
| `q032` | What is quantum computing? | `None (OOD)` | `quantum_test.txt, sample_document.txt, security_demo.txt` | Out-of-domain query received non-refusal answer |
| `q034` | Who wrote the RAG Debugger codebase? | `None (OOD)` | `security_demo.txt, sample_document.txt, quantum_test.txt` | Out-of-domain query received non-refusal answer |
| `q035` | When was the James Webb Space Telescope launched? | `None (OOD)` | `test_apollo.txt, security_demo.txt, quantum_test.txt` | Out-of-domain query received non-refusal answer |

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
.\venv\Scripts\python.exe run_benchmarks.py
```

To run the full test suite:

```powershell
$env:PYTHONPATH="."
.\venv\Scripts\pytest.exe
```

To run end-to-end verification:

```powershell
.\venv\Scripts\python.exe run_e2e.py
```

## 14. Final Observations
The benchmark suite successfully separates retrieval metrics, fallback synthesis accuracy, OOD refusal performance, and context optimization trade-offs. The context optimizer effectively reduces token context size and latency at the cost of reduced Recall@5 on queries with multi-chunk evidence.
