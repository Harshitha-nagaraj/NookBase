from dataclasses import dataclass, field
from typing import List, Dict, Any
from backend.config import DISTANCE_THRESHOLD_HIGH, DISTANCE_THRESHOLD_MEDIUM

@dataclass
class DiagnosticResultItem:
    rank: int
    chunk_id: str
    text: str
    source: str
    page: int
    distance: float
    similarity_score: float
    relevance_label: str

@dataclass
class RetrievalDiagnosticResult:
    query: str
    top_k: int
    status: str
    explanation: str
    statistics: Dict[str, float]
    results: List[DiagnosticResultItem] = field(default_factory=list)

class DiagnosticsEngine:
    def __init__(self):
        # Heuristic thresholds for L2 distance from config
        self.high_threshold = DISTANCE_THRESHOLD_HIGH
        self.medium_threshold = DISTANCE_THRESHOLD_MEDIUM

    def analyze(self, query: str, top_k: int, raw_results: List[Dict[str, Any]]) -> RetrievalDiagnosticResult:
        diagnostic_items = []
        
        for res in raw_results:
            distance = res.get("distance", 0.0)
            # Mathematical transformation: similarity_score = 1 / (1 + distance)
            # This normalizes L2 distance to a 0-1 range (higher is better). Not a probability.
            similarity_score = 1.0 / (1.0 + distance)
            
            relevance_label = self._classify_relevance(distance)
            
            item = DiagnosticResultItem(
                rank=res.get("rank", 0),
                chunk_id=res.get("chunk_id", ""),
                text=res.get("text", ""),
                source=res.get("source", ""),
                page=res.get("page", 1),
                distance=distance,
                similarity_score=similarity_score,
                relevance_label=relevance_label
            )
            diagnostic_items.append(item)

        stats = self._calculate_statistics(diagnostic_items)
        status = self._determine_overall_status(stats, diagnostic_items)
        explanation = self._generate_explanation(status)

        return RetrievalDiagnosticResult(
            query=query,
            top_k=top_k,
            status=status,
            explanation=explanation,
            statistics=stats,
            results=diagnostic_items
        )

    def _classify_relevance(self, distance: float) -> str:
        if distance <= self.high_threshold:
            return "HIGH"
        elif distance <= self.medium_threshold:
            return "MEDIUM"
        else:
            return "LOW"

    def _calculate_statistics(self, items: List[DiagnosticResultItem]) -> Dict[str, float]:
        count = len(items)
        high = sum(1 for i in items if i.relevance_label == "HIGH")
        medium = sum(1 for i in items if i.relevance_label == "MEDIUM")
        low = sum(1 for i in items if i.relevance_label == "LOW")

        scores = [i.similarity_score for i in items]
        best_score = max(scores) if scores else 0.0
        worst_score = min(scores) if scores else 0.0
        avg_score = (sum(scores) / count) if count > 0 else 0.0

        return {
            "retrieved_count": count,
            "high_relevance_count": high,
            "medium_relevance_count": medium,
            "low_relevance_count": low,
            "best_score": best_score,
            "average_score": avg_score,
            "worst_score": worst_score
        }

    def _determine_overall_status(self, stats: Dict[str, float], items: List[DiagnosticResultItem]) -> str:
        if stats["retrieved_count"] == 0:
            return "LIKELY_RETRIEVAL_FAILURE"
        
        # If there is at least one HIGH relevant result, it's generally GOOD
        if stats["high_relevance_count"] >= 1:
            return "GOOD"
            
        # If there are no HIGH but mostly MEDIUM, it's WEAK
        if stats["medium_relevance_count"] > 0:
            return "WEAK"
            
        # If everything is LOW, it's a likely failure
        return "LIKELY_RETRIEVAL_FAILURE"

    def _generate_explanation(self, status: str) -> str:
        if status == "GOOD":
            return "Retrieved context contains highly relevant chunks based on current heuristic distance thresholds."
        elif status == "WEAK":
            return "Retrieved chunks have limited relevance to the query. Consider improving chunking, embeddings, or retrieval parameters."
        elif status == "LIKELY_RETRIEVAL_FAILURE":
            return "No retrieved chunk meets the configured relevance threshold. The issue is likely in retrieval rather than generation, or the document does not contain the answer."
        return "Unknown status."

