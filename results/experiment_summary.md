# RAG Debugger Experiment & Benchmark Summary

*Generated on 2026-09-23 12:35:53*

## 1. Retrieval Metrics
* **Dataset Size**: 10 benchmark queries
* **Precision@1**: 0.7000
* **Precision@3**: 0.4667
* **Precision@5**: 0.2800
* **Recall@1**: 0.3500
* **Recall@3**: 0.7000
* **Recall@5**: 0.7000

## 2. Grounding & Relevance Metrics
* **Grounded Answers**: 10.0%
* **Partially Grounded**: 10.0%
* **Unsupported Claims**: 0.0%
* **Explicit No-Answer Cases**: 80.0%
* **Answer Relevance Score**: 0.7087

## 3. Pipeline Efficiency
* **Average Input Tokens**: 200.8
* **Average Output Tokens**: 14.4
* **Average Total Tokens**: 215.2
* **Average Retrieval Latency**: 19.41 ms
* **Average Generation Latency**: 0.02 ms
* **Average Total Latency**: 35.43 ms

## 4. Basic RAG vs Optimized RAG
| Metric | Basic RAG | Optimized RAG | Delta |
|---|---|---|---|
| Precision@1 | 0.7000 | 0.7000 | 0.0000 |
| Recall@5 | 0.7000 | 0.4500 | -0.2500 |
| Groundedness | 10.0% | 10.0% | 0.0% |
| Answer Relevance | 0.7087 | 0.7087 | 0.0000 |
| Avg Input Tokens | 200.8 | 124.3 | -38.1% |
| Avg Total Latency | 40.98 ms | 32.14 ms | -8.84 ms |

### Measured Optimization Trade-off
Context optimization filtered out low-relevance chunks using L2 distance thresholding, reducing context token count by ~38.1% (from 200.8 to 124.3 tokens) and overall latency by ~5.09 ms. However, filtering reduced Recall@5 from 0.7000 to 0.4500 because some relevant context resided in secondary chunks that fell below the strict distance threshold.

## 5. Security Validation
* **Detector**: Deterministic Regex Pattern Matcher
* **Prompt Injection Test Cases**: 4
* **High-Risk Detections**: 3
* **Benign Cases Verified**: 1
* **Determinism Verified**: True

## 6. System Verification & Build Status
* **Pytest Test Suite**: 37 passed (100%)
* **Frontend Build**: SUCCESS (0 TypeScript errors)
