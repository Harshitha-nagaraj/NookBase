from dataclasses import dataclass, field
from typing import List, Dict, Any
from backend.config import CHARS_PER_TOKEN, EXCESS_CONTEXT_THRESHOLD

@dataclass
class EfficiencyDiagnosticResult:
    retrieval_latency_ms: float
    context_build_latency_ms: float
    generation_latency_ms: float
    total_latency_ms: float
    
    retrieved_chunk_count: int
    selected_chunk_count: int
    context_characters: int
    average_chunk_characters: float
    largest_chunk_characters: int
    
    estimated_input_tokens: int
    estimated_output_tokens: int
    estimated_total_tokens: int
    
    context_reduction_percent: float
    efficiency_status: str
    warnings: List[str] = field(default_factory=list)

class EfficiencyDiagnosticsEngine:
    def __init__(self):
        self.chars_per_token = CHARS_PER_TOKEN
        self.excess_context_threshold = EXCESS_CONTEXT_THRESHOLD

    def _estimate_tokens(self, text: str) -> int:
        return int(len(text) / self.chars_per_token)

    def analyze(self, 
                retrieval_latency_ms: float,
                context_build_latency_ms: float,
                generation_latency_ms: float,
                total_latency_ms: float,
                query: str,
                retrieved_chunks: List[Dict[str, Any]],
                selected_chunks: List[Dict[str, Any]],
                formatted_context: str,
                generated_answer: str) -> EfficiencyDiagnosticResult:
        
        retrieved_count = len(retrieved_chunks)
        selected_count = len(selected_chunks)
        
        # Context character metrics
        context_characters = len(formatted_context)
        chunk_lengths = [len(c.get("text", "")) for c in selected_chunks]
        average_chunk_characters = (sum(chunk_lengths) / selected_count) if selected_count > 0 else 0.0
        largest_chunk_characters = max(chunk_lengths) if chunk_lengths else 0
        
        # Token estimation (Heuristic based on character count)
        input_text = query + "\n" + formatted_context
        estimated_input_tokens = self._estimate_tokens(input_text)
        estimated_output_tokens = self._estimate_tokens(generated_answer)
        estimated_total_tokens = estimated_input_tokens + estimated_output_tokens
        
        # Context reduction calculation
        context_reduction_percent = 0.0
        if retrieved_count > 0:
            context_reduction_percent = ((retrieved_count - selected_count) / retrieved_count) * 100.0

        # Efficiency status and warnings
        warnings = []
        if retrieved_count == 0:
            status = "NO_CONTEXT"
            warnings.append("NO_CONTEXT: No chunks were retrieved.")
        else:
            if selected_count > self.excess_context_threshold:
                warnings.append("EXCESS_CONTEXT_WARNING: High number of chunks selected.")
                status = "POTENTIALLY_INEFFICIENT"
            else:
                warnings.append("CONTEXT_SIZE_OK: Context size is within thresholds.")
                status = "GOOD"
                
            if context_reduction_percent > 80.0:
                warnings.append("HIGH_REDUCTION_WARNING: A large majority of retrieved chunks were discarded.")
                if status == "GOOD":
                    status = "MODERATE"

        return EfficiencyDiagnosticResult(
            retrieval_latency_ms=retrieval_latency_ms,
            context_build_latency_ms=context_build_latency_ms,
            generation_latency_ms=generation_latency_ms,
            total_latency_ms=total_latency_ms,
            retrieved_chunk_count=retrieved_count,
            selected_chunk_count=selected_count,
            context_characters=context_characters,
            average_chunk_characters=average_chunk_characters,
            largest_chunk_characters=largest_chunk_characters,
            estimated_input_tokens=estimated_input_tokens,
            estimated_output_tokens=estimated_output_tokens,
            estimated_total_tokens=estimated_total_tokens,
            context_reduction_percent=context_reduction_percent,
            efficiency_status=status,
            warnings=warnings
        )
