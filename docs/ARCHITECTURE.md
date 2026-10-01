# RAG Debugger — System Architecture

This document details the internal architecture, dataflow, and design decisions of the **RAG Debugger** platform.

```text
                               +-----------------------------+
                               |     Document Ingestion      |
                               | (PDF / TXT -> Raw Text)     |
                               +--------------+--------------+
                                              |
                                              v
                               +-----------------------------+
                               |       Text Chunking         |
                               |  (Sliding Window / Overlap) |
                               +--------------+--------------+
                                              |
                                              v
                               +-----------------------------+
                               |    Embedding Generation     |
                               |  (all-MiniLM-L6-v2, 384d)   |
                               +--------------+--------------+
                                              |
                                              v
                               +-----------------------------+
                               |       Vector Storage        |
                               |     (ChromaDB Collection)   |
                               +--------------+--------------+
                                              |
                                              v
                               +-----------------------------+
                               |      Vector Retrieval       |
                               |  (Top-K Similarity Query)   |
                               +--------------+--------------+
                                              |
                                              v
                               +-----------------------------+
                               |    Retrieval Diagnostics    |
                               |  (L2 Distance & Relevance)  |
                               +--------------+--------------+
                                              |
                                              v
                               +-----------------------------+
                               |    Security Diagnostics     |
                               | (Prompt Injection Scanner)  |
                               +--------------+--------------+
                                              |
                                              v
                               +-----------------------------+
                               |   Context Builder / Filter  |
                               |  (Basic vs Optimized Context) |
                               +--------------+--------------+
                                              |
                                              v
                               +-----------------------------+
                               |      Generation Layer       |
                               |    (Fallback Generator)     |
                               +--------------+--------------+
                                              |
                                              v
                               +-----------------------------+
                               |    Grounding Diagnostics    |
                               | (Claim Embedding Distance)  |
                               +--------------+--------------+
                                              |
                                              v
                               +-----------------------------+
                               |    Efficiency Analysis      |
                               | (Latency & Token Estimate)  |
                               +--------------+--------------+
                                              |
                                              v
                               +-----------------------------+
                               |   FastAPI REST API Adapter  |
                               |    (JSON Response Schemas)  |
                               +--------------+--------------+
                                              |
                                              v
                               +-----------------------------+
                               | React DevTools Dashboard    |
                               |   (Vite + TS + Tailwind)    |
                               +-----------------------------+
```

---

## Layer 1 — Ingestion & Document Processing

**Modules**: [`backend/rag/ingestion.py`](../backend/rag/ingestion.py), [`backend/rag/chunking.py`](../backend/rag/chunking.py)

- **Text Extraction**: Processes `.txt` files directly using UTF-8 decoding and `.pdf` files using `pypdf.PdfReader` to extract page-by-page text.
- **Chunking Strategy**: Employs a sliding-window text chunker configured by environment parameters:
  - `CHUNK_SIZE`: Target character length per chunk (default: 500 characters).
  - `CHUNK_OVERLAP`: Overlapping character count between consecutive chunks (default: 50 characters) to preserve contextual continuity across chunk boundaries.
- **Metadata Tagging**: Each chunk is decorated with metadata including `source` filename, `page` number, and a deterministic `chunk_id` (`{filename}_chunk_{idx}`).

---

## Layer 2 — Embeddings

**Module**: [`backend/rag/embeddings.py`](../backend/rag/embeddings.py)

- **Model**: `sentence-transformers/all-MiniLM-L6-v2`.
- **Properties**: Dense 384-dimensional vector embeddings optimized for sentence-level semantic search.
- **Execution**: Runs locally on CPU/GPU. Embeddings are generated in batches for both document chunks during ingestion and user queries during retrieval.

---

## Layer 3 — Vector Store

**Module**: [`backend/rag/vector_store.py`](../backend/rag/vector_store.py)

- **Database**: ChromaDB (`chromadb.PersistentClient` / `EphemeralClient`).
- **Storage**: Persists vectors, document texts, and metadata dictionary attributes into a local ChromaDB collection (`rag_collection`).
- **Retrieval Engine**: Performs top-K nearest-neighbor search using Euclidean L2 distance space.

---

## Layer 4 — Retrieval Diagnostics

**Module**: [`backend/diagnostics/retrieval_diagnostics.py`](../backend/diagnostics/retrieval_diagnostics.py)

- **Distance Interpretation**: Converts raw L2 distance into a normalized similarity score:
  $$\text{Similarity} = \frac{1}{1 + \text{Distance}}$$
- **Relevance Thresholding**: Classifies retrieved chunks into relevance buckets:
  - `HIGH`: Distance $\le 1.0$ (Strong semantic match)
  - `MEDIUM`: $1.0 < \text{Distance} \le 1.5$ (Moderate semantic match)
  - `LOW`: Distance $> 1.5$ (Weak / unrelated match)
- **Pipeline Retrieval Status**:
  - `GOOD`: At least 1 `HIGH` relevance chunk retrieved.
  - `WEAK`: Only `MEDIUM` relevance chunks retrieved.
  - `LIKELY_RETRIEVAL_FAILURE`: All chunks are `LOW` relevance or zero results returned.

---

## Layer 5 — Context Construction & Optimization

**Modules**: [`backend/generation/context_builder.py`](../backend/generation/context_builder.py), [`backend/optimization/context_optimizer.py`](../backend/optimization/context_optimizer.py)

- **Basic Context Builder**: Concatenates top-K retrieved chunks with explicit metadata framing (`[Source: filename, Page: X, Chunk: Y]`) into a prompt-ready string.
- **Context Optimizer**: Evaluates retrieved chunks against an L2 distance threshold (`OPTIMIZATION_DISTANCE_THRESHOLD = 1.2`). Filters out noisy or low-relevance chunks to reduce context size and mitigate "lost in the middle" attention degradation.

---

## Layer 6 — Generation Abstraction

**Modules**: [`backend/generation/generator.py`](../backend/generation/generator.py)

> [!IMPORTANT]
> **Honest Architecture Note**: To allow the repository to run deterministically on a standard 8 GB RAM developer laptop without paid API keys or heavy GPU models, the primary generation backend uses `FallbackGenerator`. 

- **Fallback Generator**: Extracts direct sentence matches from the supplied context string. If no relevant sentence matches the query keywords, it explicitly returns: `"I cannot determine the answer from the provided context."`
- **Design Pattern**: Implements an abstract `BaseGenerator` class interface so that external LLMs (e.g. OpenAI, Ollama, Llamacpp) can be plugged in by swapping the provider class.

---

## Layer 7 — Grounding Diagnostics

**Module**: [`backend/diagnostics/grounding_diagnostics.py`](../backend/diagnostics/grounding_diagnostics.py)

- **Claim Segmentation**: Splits generated answers into discrete claim sentences using punctuation boundaries.
- **Evidence Verification**: Embeds each claim sentence and computes the minimum L2 distance against all selected context chunks using `all-MiniLM-L6-v2`.
- **Classification**:
  - A claim is `SUPPORTED` if its distance to nearest chunk $\le 1.25$.
  - Otherwise, it is flagged as `UNSUPPORTED`.
- **Overall Status**:
  - `GROUNDED`: 100% of claims are supported.
  - `PARTIALLY_GROUNDED`: Some claims are supported, others unsupported.
  - `UNSUPPORTED`: 0% of claims are supported.
  - `NO_ANSWER`: Answer is an explicit refusal.

---

## Layer 8 — Efficiency Diagnostics

**Module**: [`backend/diagnostics/efficiency_diagnostics.py`](../backend/diagnostics/efficiency_diagnostics.py)

- **Latency Tracking**: High-resolution wall-clock timing (`time.perf_counter`) captures exact millisecond latencies for Retrieval, Context Assembly, Generation, and Total Pipeline execution.
- **Token Estimation**: Approximates token consumption using character heuristics (`CHARS_PER_TOKEN = 4.0`):
  $$\text{Input Tokens} = \frac{\text{Query Length} + \text{Formatted Context Length}}{4.0}$$
  $$\text{Output Tokens} = \frac{\text{Generated Answer Length}}{4.0}$$

---

## Layer 9 — Security Diagnostics

**Module**: [`backend/security/prompt_injection.py`](../backend/security/prompt_injection.py)

- **Untrusted Context Paradigm**: Treats all text returned from vector search as untrusted data rather than trusted instructions.
- **Pattern Matching Engine**: Scans chunk body text against regular expression rules for:
  - Instruction Overrides (`ignore all previous instructions`)
  - Prompt Exfiltration (`reveal system prompt`)
  - Role Hijacking (`you are now administrator`)
  - Header Impersonation (`IMPORTANT SYSTEM MESSAGE:`)
- **Risk Scoring**: Evaluates chunks into `LOW`, `MEDIUM`, or `HIGH` risk levels, outputting structured flags without executing embedded commands.

---

## Layer 10 — API Adapter & Developer Dashboard

**Modules**: [`backend/api/`](../backend/api/), [`frontend/src/`](../frontend/src/)

- **FastAPI Layer**: Exposes lightweight REST endpoints (`/api/debug`, `/api/debug/security`, `/api/documents/upload`, `/api/debug/compare`). Acts as an orchestration adapter converting backend dataclasses into Pydantic JSON schemas.
- **React Frontend**: Built with React 18, Vite, TypeScript, and Tailwind CSS. Provides real-time pipeline status, interactive retrieval inspection, claim evidence mapping, efficiency gauges, and Basic vs Optimized comparative dashboards.
