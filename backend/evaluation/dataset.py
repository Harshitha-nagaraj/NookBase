import os
import json
from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class EvaluationCase:
    question: str
    expected_answer: str
    relevant_source: str = ""
    acceptable_answer_keywords: List[str] = field(default_factory=list)
    relevant_chunk_texts: List[str] = field(default_factory=list)
    id: str = ""
    category: str = "General"
    expected_sources: List[str] = field(default_factory=list)
    expected_chunks: List[str] = field(default_factory=list)
    relevant_terms: List[str] = field(default_factory=list)
    expected_answerable: bool = True

    def __post_init__(self):
        # Sync backward compatibility fields with new schema if provided
        if self.expected_sources and not self.relevant_source:
            self.relevant_source = self.expected_sources[0]
        elif self.relevant_source and not self.expected_sources:
            self.expected_sources = [self.relevant_source]

        if self.relevant_terms and not self.acceptable_answer_keywords:
            self.acceptable_answer_keywords = self.relevant_terms
        elif self.acceptable_answer_keywords and not self.relevant_terms:
            self.relevant_terms = self.acceptable_answer_keywords

        if self.expected_chunks and not self.relevant_chunk_texts:
            self.relevant_chunk_texts = self.expected_chunks
        elif self.relevant_chunk_texts and not self.expected_chunks:
            self.expected_chunks = self.relevant_chunk_texts

        # Out of domain logic check
        if not self.expected_sources and self.expected_answer == "I cannot determine the answer from the provided context.":
            self.expected_answerable = False

def load_evaluation_dataset(filepath: str = "data/evaluation_dataset.json") -> List[EvaluationCase]:
    """
    Loads evaluation dataset from a JSON file.
    Raises ValueError if dataset file is empty or invalid.
    """
    if not os.path.exists(filepath):
        return get_fallback_dataset()
        
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    if not isinstance(data, list) or len(data) == 0:
        raise ValueError(f"Evaluation dataset at {filepath} is empty or invalid.")
        
    cases = []
    for idx, item in enumerate(data):
        case_id = item.get("id", f"q{idx+1:03d}")
        question = item.get("question", "")
        expected_answer = item.get("expected_answer", "")
        expected_sources = item.get("expected_sources", [])
        expected_chunks = item.get("expected_chunks", [])
        relevant_terms = item.get("relevant_terms", [])
        category = item.get("category", "General")
        expected_answerable = item.get("expected_answerable", bool(expected_sources))

        if not question:
            raise ValueError(f"Question at index {idx} (id: {case_id}) is empty.")
            
        case = EvaluationCase(
            id=case_id,
            question=question,
            category=category,
            expected_sources=expected_sources,
            expected_chunks=expected_chunks,
            expected_answer=expected_answer,
            relevant_terms=relevant_terms,
            expected_answerable=expected_answerable,
            relevant_source=expected_sources[0] if expected_sources else "",
            acceptable_answer_keywords=relevant_terms,
            relevant_chunk_texts=expected_chunks
        )
        cases.append(case)
        
    return cases

def get_initial_dataset() -> List[EvaluationCase]:
    """
    Returns the evaluation dataset (loads data/evaluation_dataset.json if available).
    """
    dataset_path = "data/evaluation_dataset.json"
    if os.path.exists(dataset_path):
        return load_evaluation_dataset(dataset_path)
    return get_fallback_dataset()

def get_fallback_dataset() -> List[EvaluationCase]:
    """
    Returns initial sample dataset of 10 questions for legacy testing.
    """
    return [
        EvaluationCase(
            id="q001",
            question="What is RAG Debugger?",
            expected_answer="RAG Debugger is a tool for developers to inspect Retrieval-Augmented Generation pipelines.",
            relevant_source="sample_document.txt",
            acceptable_answer_keywords=["tool", "inspect", "pipelines"],
            relevant_chunk_texts=["RAG Debugger is a tool for developers to inspect Retrieval-Augmented Generation pipelines."]
        ),
        EvaluationCase(
            id="q002",
            question="What does RAG Debugger provide insights into?",
            expected_answer="It provides insights into retrieved contexts, vector similarities, and potential grounding failures.",
            relevant_source="sample_document.txt",
            acceptable_answer_keywords=["insights", "contexts", "vector similarities", "grounding failures"],
            relevant_chunk_texts=["It provides insights into retrieved contexts, vector similarities, and potential grounding failures."]
        ),
        EvaluationCase(
            id="q003",
            question="What does a typical RAG pipeline consist of?",
            expected_answer="A typical RAG pipeline consists of document ingestion, text extraction, chunking, embedding generation, vector storage, and similarity retrieval.",
            relevant_source="sample_document.txt",
            acceptable_answer_keywords=["ingestion", "extraction", "chunking", "storage", "retrieval"],
            relevant_chunk_texts=["A typical RAG pipeline consists of document ingestion, text extraction, chunking, embedding generation, vector storage, and similarity retrieval."]
        ),
        EvaluationCase(
            id="q004",
            question="What is SentenceTransformers used for?",
            expected_answer="SentenceTransformers is often used for generating lightweight dense embeddings.",
            relevant_source="sample_document.txt",
            acceptable_answer_keywords=["generating", "lightweight", "dense", "embeddings"],
            relevant_chunk_texts=["SentenceTransformers is often used for generating lightweight dense embeddings."]
        ),
        EvaluationCase(
            id="q005",
            question="What database is used for local storage?",
            expected_answer="ChromaDB is a popular open-source vector database used for local storage.",
            relevant_source="sample_document.txt",
            acceptable_answer_keywords=["ChromaDB", "local storage"],
            relevant_chunk_texts=["ChromaDB is a popular open-source vector database used for local storage."]
        ),
        EvaluationCase(
            id="q006",
            question="Is ChromaDB open-source?",
            expected_answer="Yes, ChromaDB is a popular open-source vector database.",
            relevant_source="sample_document.txt",
            acceptable_answer_keywords=["ChromaDB", "open-source"],
            relevant_chunk_texts=["ChromaDB is a popular open-source vector database used for local storage."]
        ),
        EvaluationCase(
            id="q007",
            question="What is quantum computing?",
            expected_answer="I cannot determine the answer from the provided context.",
            relevant_source="",
            acceptable_answer_keywords=["cannot determine"],
            relevant_chunk_texts=[],
            expected_answerable=False
        ),
        EvaluationCase(
            id="q008",
            question="Who wrote the RAG Debugger?",
            expected_answer="I cannot determine the answer from the provided context.",
            relevant_source="",
            acceptable_answer_keywords=["cannot determine"],
            relevant_chunk_texts=[],
            expected_answerable=False
        ),
        EvaluationCase(
            id="q009",
            question="What is the capital of France?",
            expected_answer="I cannot determine the answer from the provided context.",
            relevant_source="",
            acceptable_answer_keywords=["cannot determine"],
            relevant_chunk_texts=[],
            expected_answerable=False
        ),
        EvaluationCase(
            id="q010",
            question="Test unsupported claim about local storage.",
            expected_answer="ChromaDB is used for local storage. It was created in 2019.",
            relevant_source="sample_document.txt",
            acceptable_answer_keywords=["ChromaDB", "local storage"],
            relevant_chunk_texts=["ChromaDB is a popular open-source vector database used for local storage."]
        )
    ]

