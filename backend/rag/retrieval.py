import numpy as np
import re
from typing import List, Dict, Any
from backend.rag.embeddings import EmbeddingService
from backend.rag.vector_store import VectorStore

class Retriever:
    def __init__(self, embedding_service: EmbeddingService, vector_store: VectorStore):
        self.embedding_service = embedding_service
        self.vector_store = vector_store

    def retrieve(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Retrieves the top_k most relevant chunks for a given query.
        Returns a structured list of results for backward compatibility.
        """
        res = self.retrieve_with_strategy(query, top_k=top_k, strategy="standard")
        return res["retained_results"]

    def retrieve_with_strategy(
        self,
        query: str,
        top_k: int = 5,
        strategy: str = "standard",
        threshold: float = 0.35
    ) -> Dict[str, Any]:
        """
        Retrieves candidates, applies strategy (standard, filtered, reranked),
        and returns structured result breakdown.
        """
        query_embedding = self.embedding_service.embed_query(query)
        
        # Retrieve a larger candidate set for better lexical recall
        fetch_k = max(top_k, 10)
        raw_results = self.vector_store.search(query_embedding, top_k=fetch_k)

        # Basic query term extraction for lexical scoring
        query_lower = query.lower()
        query_words = set(re.findall(r'\b[a-z0-9_]+\b', query_lower))
        stop_words = {"what", "is", "are", "the", "a", "an", "of", "in", "to", "for", "with", "on", "and", "or", "which", "how", "who", "where", "when", "why", "do", "does", "did", "can"}
        key_terms = query_words - stop_words

        processed_candidates = []
        for i, res in enumerate(raw_results):
            dist = res.get("distance", 0.0)
            sim = 1.0 / (1.0 + dist)
            item = dict(res)
            item["original_rank"] = i + 1
            item["retrieval_score"] = round(sim, 4)
            item["similarity"] = round(sim, 4)
            item["retained"] = True
            
            text_lower = item.get("text", "").lower()
            lexical_score = 0.0
            if key_terms:
                term_matches = sum(1 for term in key_terms if term in text_lower)
                lexical_score = term_matches / max(1, len(key_terms))
                
            # Lightweight semantic + lexical blend
            # E.g. purely semantic vectors might retrieve "RAG Debugger architecture" for "What is RAG?"
            # We boost chunks that have high query word overlap.
            item["hybrid_score"] = sim + (lexical_score * 0.3)
            processed_candidates.append(item)

        # Rerank based on hybrid score
        processed_candidates.sort(key=lambda x: x["hybrid_score"], reverse=True)
        
        # Truncate back to top_k after ranking
        processed_candidates = processed_candidates[:top_k]
        
        # Normalize fields for downstream
        for i, item in enumerate(processed_candidates):
            item["rank"] = i + 1
            item["reranked_rank"] = i + 1
            item["rerank_score"] = round(item["hybrid_score"], 4)
            
        candidates_count = len(processed_candidates)

        if strategy == "filtered":
            retained_results = []
            removed_results = []
            for item in processed_candidates:
                if item["similarity"] >= threshold:
                    item["retained"] = True
                    retained_results.append(item)
                else:
                    item["retained"] = False
                    removed_results.append(item)
            
            for idx, item in enumerate(retained_results):
                item["rank"] = idx + 1
                item["reranked_rank"] = idx + 1

            return {
                "candidates_count": candidates_count,
                "retained_count": len(retained_results),
                "removed_count": len(removed_results),
                "retained_results": retained_results,
                "all_candidates": processed_candidates,
                "reranking_enabled": False,
                "reranking_results": []
            }

        elif strategy == "reranked":
            # Just return the hybrid sorted list directly as reranked
            reranking_details = []
            for item in processed_candidates:
                reranking_details.append({
                    "original_rank": item["original_rank"],
                    "reranked_rank": item["reranked_rank"],
                    "retrieval_score": item["retrieval_score"],
                    "rerank_score": item["rerank_score"],
                    "chunk_id": item["chunk_id"],
                    "source": item["source"],
                    "text": item["text"],
                    "retained": True
                })

            return {
                "candidates_count": candidates_count,
                "retained_count": candidates_count,
                "removed_count": 0,
                "retained_results": processed_candidates,
                "all_candidates": processed_candidates,
                "reranking_enabled": True,
                "reranking_results": reranking_details
            }

        else: # Standard strategy
            return {
                "candidates_count": candidates_count,
                "retained_count": candidates_count,
                "removed_count": 0,
                "retained_results": processed_candidates,
                "all_candidates": processed_candidates,
                "reranking_enabled": False,
                "reranking_results": []
            }


