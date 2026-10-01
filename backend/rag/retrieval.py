import numpy as np
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
        raw_results = self.vector_store.search(query_embedding, top_k=top_k)

        candidates_count = len(raw_results)
        
        # Calculate similarity score = 1 / (1 + distance) and rank
        processed_candidates = []
        for i, res in enumerate(raw_results):
            dist = res.get("distance", 0.0)
            sim = 1.0 / (1.0 + dist)
            item = dict(res)
            item["original_rank"] = i + 1
            item["rank"] = i + 1
            item["retrieval_score"] = round(sim, 4)
            item["similarity"] = round(sim, 4)
            item["reranked_rank"] = i + 1
            item["rerank_score"] = round(sim, 4)
            item["retained"] = True
            processed_candidates.append(item)

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
            
            # Update rank for retained results
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
            if not processed_candidates:
                return {
                    "candidates_count": 0,
                    "retained_count": 0,
                    "removed_count": 0,
                    "retained_results": [],
                    "all_candidates": [],
                    "reranking_enabled": True,
                    "reranking_results": []
                }

            # Embed candidate texts for fine-grained cosine similarity reranking
            chunk_texts = [item["text"] for item in processed_candidates]
            chunk_embeddings = self.embedding_service.embed_documents(chunk_texts)

            q_vec = np.array(query_embedding, dtype=float)
            q_norm = np.linalg.norm(q_vec)
            if q_norm > 0:
                q_vec = q_vec / q_norm

            query_words = set(w.lower() for w in query.split() if len(w) > 2)

            for idx, item in enumerate(processed_candidates):
                c_vec = np.array(chunk_embeddings[idx], dtype=float)
                c_norm = np.linalg.norm(c_vec)
                cos_sim = float(np.dot(q_vec, c_vec / c_norm)) if c_norm > 0 else 0.0

                # Compute keyword overlap score ratio
                text_words = set(w.lower() for w in item["text"].split())
                overlap = len(query_words.intersection(text_words)) / max(1, len(query_words)) if query_words else 0.0

                # Blend score: 75% fine-grained cosine similarity + 25% keyword overlap ratio
                rerank_score = round(float(0.75 * cos_sim + 0.25 * overlap), 4)
                item["rerank_score"] = rerank_score

            # Sort by rerank_score descending
            sorted_candidates = sorted(processed_candidates, key=lambda x: x["rerank_score"], reverse=True)

            reranking_details = []
            for new_idx, item in enumerate(sorted_candidates):
                item["reranked_rank"] = new_idx + 1
                item["rank"] = new_idx + 1
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
                "retained_count": len(sorted_candidates),
                "removed_count": 0,
                "retained_results": sorted_candidates,
                "all_candidates": sorted_candidates,
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


