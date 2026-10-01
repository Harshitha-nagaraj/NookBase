from typing import List, Dict, Any, Tuple
import numpy as np
from backend.rag.embeddings import EmbeddingService
from backend.config import ANSWER_RELEVANCE_DISTANCE_THRESHOLD

class EvaluationMetrics:
    def __init__(self, embedding_service: EmbeddingService):
        self.embedding_service = embedding_service
        self.answer_relevance_threshold = ANSWER_RELEVANCE_DISTANCE_THRESHOLD

    def precision_at_k(self, retrieved_chunks: List[Dict[str, Any]], expected_source: Any, k: int) -> float:
        """
        Precision@K = (number of relevant retrieved chunks among top K) / K
        """
        if k <= 0:
            return 0.0
        
        sources = [expected_source] if isinstance(expected_source, str) else (expected_source or [])
        sources = [s for s in sources if s]
        
        if not sources:
            return 0.0

        top_k = retrieved_chunks[:k]
        seen_ids = set()
        relevant_count = 0
        for chunk in top_k:
            chunk_id = chunk.get("chunk_id")
            if chunk_id not in seen_ids:
                seen_ids.add(chunk_id)
                if chunk.get("source") in sources:
                    relevant_count += 1
                    
        return relevant_count / k

    def recall_at_k(self, retrieved_chunks: List[Dict[str, Any]], expected_source: Any, total_relevant_chunks_in_corpus: int, k: int) -> float:
        """
        Recall@K = (number of relevant retrieved chunks among top K) / (total number of relevant chunks)
        """
        sources = [expected_source] if isinstance(expected_source, str) else (expected_source or [])
        sources = [s for s in sources if s]

        if not sources:
            return 1.0

        if total_relevant_chunks_in_corpus <= 0:
            return 1.0
            
        if k <= 0:
            return 0.0
            
        top_k = retrieved_chunks[:k]
        seen_ids = set()
        relevant_count = 0
        for chunk in top_k:
            chunk_id = chunk.get("chunk_id")
            if chunk_id not in seen_ids:
                seen_ids.add(chunk_id)
                if chunk.get("source") in sources:
                    relevant_count += 1
                    
        return relevant_count / total_relevant_chunks_in_corpus

    def answer_relevance(self, generated_answer: str, expected_answer: str) -> Tuple[float, str]:
        """
        Evaluates answer relevance using local embedding similarity.
        This is an approximate semantic metric, NOT a human-quality judge.
        Returns: (relevance_score, status)
        """
        if not generated_answer or not expected_answer:
            return 0.0, "LOW"

        gen_emb = np.array(self.embedding_service.embed_query(generated_answer))
        exp_emb = np.array(self.embedding_service.embed_query(expected_answer))
        
        dist = np.linalg.norm(gen_emb - exp_emb)
        score = 1.0 / (1.0 + dist)
        
        if dist <= self.answer_relevance_threshold:
            status = "RELEVANT"
        elif dist <= self.answer_relevance_threshold * 1.5:
            status = "WEAK"
        else:
            status = "LOW"
            
        return score, status
