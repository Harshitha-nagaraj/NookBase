from typing import List, Dict, Any
from backend.config import OPTIMIZATION_DISTANCE_THRESHOLD

class ContextOptimizer:
    def __init__(self, threshold: float = OPTIMIZATION_DISTANCE_THRESHOLD):
        self.threshold = threshold

    def optimize_context(self, retrieved_chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Filters chunks based on distance threshold.
        Returns a list of retained chunks.
        """
        retained = []
        for chunk in retrieved_chunks:
            # Assumes distance is provided (e.g. from ChromaDB). If not present, we keep it to be safe.
            dist = chunk.get("distance")
            if dist is None or dist <= self.threshold:
                retained.append(chunk)
        return retained

    def calculate_reduction(self, original_chunks: List[Dict[str, Any]], optimized_chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculates context reduction statistics.
        """
        orig_count = len(original_chunks)
        opt_count = len(optimized_chunks)
        
        orig_chars = sum(len(c.get("text", "")) for c in original_chunks)
        opt_chars = sum(len(c.get("text", "")) for c in optimized_chunks)
        
        removed_count = orig_count - opt_count
        
        if orig_chars > 0:
            reduction_pct = ((orig_chars - opt_chars) / orig_chars) * 100.0
        elif orig_count > 0:
            # Fallback to chunk count if characters are somehow empty
            reduction_pct = ((orig_count - opt_count) / orig_count) * 100.0
        else:
            reduction_pct = 0.0
            
        return {
            "chunks_removed": removed_count,
            "chunks_retained": opt_count,
            "context_reduction_percentage": reduction_pct
        }
