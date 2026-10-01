# RAG Debugger — Technical Interview Guide

This guide provides technical explanations for 20 common architecture, evaluation, and security questions about the **RAG Debugger** project.

---

### 1. Why did you build a RAG debugger?
**Answer**: Most RAG applications operate as black boxes. When an LLM produces a wrong answer, developers struggle to determine whether the vector retriever failed, the context window was flooded with noise, the LLM hallucinated, or an untrusted document injected malicious instructions. I built RAG Debugger to make every stage of the RAG pipeline observable, measurable, and testable.

### 2. What problem does it solve?
**Answer**: It solves the problem of silent, opaque failures in RAG systems. It provides real-time retrieval scoring, claim-level grounding diagnostics, latency/token efficiency analysis, Basic vs Optimized context experiments, and prompt-injection security detection in a single developer dashboard.

### 3. How does RAG work in your project?
**Answer**: 
1. **Ingestion**: Text and PDF files are ingested and chunked using sliding windows with configurable size and overlap.
2. **Embedding**: `all-MiniLM-L6-v2` generates 384-dimensional dense vector embeddings.
3. **Storage & Retrieval**: ChromaDB stores vectors and performs L2 nearest-neighbor search for user queries.
4. **Security & Context**: Chunks are scanned for prompt injections and formatted into structured context blocks.
5. **Generation & Grounding**: A generator produces an answer, and a grounding engine verifies whether extracted claims are supported by context embeddings.

### 4. Why use embeddings?
**Answer**: Embeddings capture deep semantic meaning rather than exact keyword matches. Words like "database" and "vector store" or "speed" and "latency" map close to each other in 384-dimensional vector space, allowing vector retrieval to find relevant context even when different vocabulary is used.

### 5. Why use ChromaDB?
**Answer**: ChromaDB is a lightweight, developer-friendly vector database that runs embedded in Python. It supports local persistence, metadata filtering, and fast Euclidean/Cosine distance indexing without requiring expensive external cloud infrastructure.

### 6. What does similarity/distance mean?
**Answer**: ChromaDB returns raw Euclidean L2 distance between query and document vectors. Lower distance means higher semantic similarity. To make distance easy to interpret for developers, I normalize it into a 0.0 to 1.0 similarity score:
$$\text{Similarity} = \frac{1}{1 + \text{Distance}}$$

### 7. How do you identify retrieval failure?
**Answer**: The retrieval diagnostics engine evaluates L2 distance thresholds:
- Chunks with distance $\le 1.0$ are classified as `HIGH` relevance.
- Chunks with distance $1.0 < d \le 1.5$ are `MEDIUM`.
- Chunks with distance $> 1.5$ are `LOW`.
If all retrieved chunks are `LOW` relevance or distance exceeds thresholds, the system flags an explicit `LIKELY_RETRIEVAL_FAILURE` warning.

### 8. How do you identify grounding failure?
**Answer**: The grounding engine splits the generated answer into discrete sentences/claims. It embeds each claim and calculates its minimum L2 distance against all context chunks. If a claim's distance exceeds `1.25`, it is marked as `UNSUPPORTED`. If unsupported claims exist, the answer is flagged as `PARTIALLY_GROUNDED` or `UNSUPPORTED`.

### 9. How do you estimate token usage?
**Answer**: To keep the debugger lightweight without requiring API keys or heavy BPE tokenizer models, tokens are estimated using a standard character heuristic (`4.0 characters per token`):
$$\text{Tokens} = \frac{\text{Character Length}}{4.0}$$
This provides a reliable order-of-magnitude estimate for monitoring context window expansion.

### 10. What is the difference between Basic and Optimized RAG?
**Answer**: 
- **Basic RAG**: Retrieves top-K chunks and passes **all** retrieved chunks directly to the LLM.
- **Optimized RAG**: Filters out low-relevance chunks using a strict L2 distance threshold (`1.2`) before building the context string.

### 11. Why did optimization potentially reduce recall?
**Answer**: In our controlled experiment, distance-based filtering reduced context token size by **38.1%**, but **Recall@5 dropped from 0.7000 to 0.4500**. This occurred because some secondary chunks contained valid ground-truth evidence despite having slightly higher distance scores. Filtering removed those chunks, demonstrating the real-world trade-off between context token reduction and retrieval recall.

### 12. How did you evaluate the system?
**Answer**: I built an automated evaluation framework (`backend/evaluation/evaluator.py`) that runs a 10-question benchmark dataset containing both in-domain queries and out-of-domain rejection queries. It measures Precision@K, Recall@K, Groundedness %, Answer Relevance, Token Consumption, and Latency.

### 13. What is Precision@K?
**Answer**: Precision@K measures the proportion of top-K retrieved chunks that are actually relevant to the ground truth source document:
$$\text{Precision@K} = \frac{\text{Relevant Chunks in Top K}}{K}$$
In our baseline, Precision@1 was **0.7000**.

### 14. What is Recall@K?
**Answer**: Recall@K measures the proportion of all total ground-truth relevant chunks that were successfully retrieved in the top K:
$$\text{Recall@K} = \frac{\text{Relevant Chunks in Top K}}{\text{Total Relevant Chunks in Dataset}}$$
In our baseline, Recall@5 was **0.7000**.

### 15. How did you test prompt injection?
**Answer**: I created a deterministic security suite (`backend/security/prompt_injection.py`) and test cases (`tests/test_security.py`). The detector scans retrieved chunk text for malicious patterns like `"ignore all previous instructions"`, `"reveal system prompt"`, and `"you are now administrator"`, scoring chunks into `LOW`, `MEDIUM`, or `HIGH` risk levels.

### 16. Why should retrieved documents be considered untrusted?
**Answer**: In RAG, retrieved documents come from external data sources (uploaded PDFs, web scrapes, user files). If an attacker embeds prompt-injection text inside a document, an un-shielded LLM might execute those instructions instead of answering the user's question. Treating retrieved text strictly as data parameters prevents indirect prompt injection.

### 17. What are the limitations of your grounding detector?
**Answer**: The grounding detector uses sentence boundary splitting and embedding distance proximity. It is a heuristic tool, not a formal logical verifier. It can yield false positives if a claim uses different wording that happens to be semantically close, or false negatives on complex multi-hop reasoning claims.

### 18. Why is the current generator not equivalent to a production LLM?
**Answer**: To allow the project to run deterministically on an 8 GB RAM laptop without paid API keys, the generator uses `FallbackGenerator` (which performs direct context sentence matching and explicit refusal logic). The architecture uses a decoupled provider interface so production LLMs (e.g. OpenAI GPT-4, Ollama) can be swapped in without changing the diagnostic engines.

### 19. How would you improve this system in production?
**Answer**:
1. Add a **Cross-Encoder Reranker** (e.g., `bge-reranker-large`) after vector retrieval.
2. Integrate **BPE tokenizers** (`tiktoken`) for exact token counting.
3. Use an **LLM-as-a-judge** (e.g., GPT-4 or Claude) for nuanced grounding evaluation.
4. Train an **ML-based classifier** for prompt-injection detection alongside regular expressions.
5. Offload document parsing to asynchronous worker queues (Celery / Redis).

### 20. What did you personally implement?
**Answer**: I implemented the entire end-to-end stack: document ingestion and chunking, ChromaDB vector retrieval, the retrieval diagnostics engine, claim-based grounding diagnostics, efficiency tracking, evaluation metrics (Precision@K/Recall@K), the Basic vs Optimized experimental framework, prompt-injection security detection, FastAPI REST routes, 37 unit/integration tests, and the React observability dashboard.
