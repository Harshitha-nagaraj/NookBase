import re
from dataclasses import dataclass
from typing import Dict, Any, List

@dataclass
class GenerationResult:
    answer: str
    model_name: str
    input_context: str
    generation_metadata: Dict[str, Any]

class FallbackGenerator:
    """
    A deterministic fallback mock generator used for debugging and testing when a local
    LLM is not available or too heavy. Extracts matching context sentences or returns
    an explicit refusal when evidence is lacking.
    """
    def __init__(self):
        self.model_name = "fallback_mock_generator"
        self.generation_mode = "fallback"

    def generate(self, query: str, context: str) -> GenerationResult:
        lower_query = query.lower()
        
        # Test case override for grounding diagnostics tests
        if "test unsupported claim" in lower_query:
            return GenerationResult(
                answer="ChromaDB is used for local storage. It was created in 2019.",
                model_name=self.model_name,
                input_context=context,
                generation_metadata={"mode": self.generation_mode, "prompt": "Mock prompt"}
            )

        answer = "I cannot determine the answer from the provided context."

        if context and context.strip():
            # Filter metadata lines from formatted context
            lines = context.split("\n")
            content_lines = []
            for line in lines:
                line_str = line.strip()
                if not line_str:
                    continue
                if line_str.startswith("[Source") or line_str.startswith("Document:") or line_str.startswith("Page:") or line_str.startswith("Chunk ID:"):
                    continue
                content_lines.append(line_str)
                
            raw_text = " ".join(content_lines)
            
            # Split raw text into sentences
            sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', raw_text) if s.strip()]
            
            # Extract query terms
            stop_words = {
                "what", "where", "when", "who", "whom", "which", "whose", "why", "how",
                "is", "are", "was", "were", "be", "been", "being", "do", "does", "did",
                "a", "an", "the", "and", "or", "but", "if", "in", "on", "at", "to", "for",
                "with", "about", "against", "between", "into", "through", "during", "before",
                "after", "above", "below", "from", "up", "down", "of", "off", "over", "under",
                "again", "further", "then", "once", "here", "there", "all", "any", "both",
                "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not",
                "only", "own", "same", "so", "than", "too", "very", "can", "will", "just",
                "should", "now"
            }
            
            query_words = re.findall(r'\b[a-zA-Z0-9_-]+\b', lower_query)
            key_terms = [w for w in query_words if w not in stop_words and len(w) > 1]
            
            if key_terms:
                best_sentence = None
                max_score = 0
                
                for s in sentences:
                    s_lower = s.lower()
                    score = sum(1 for term in key_terms if term in s_lower)
                    if score > max_score:
                        max_score = score
                        best_sentence = s
                        
                # Required minimum matches: at least 1 term if query has 1-2 key terms, or at least 2 if query has more
                min_required = 1 if len(key_terms) <= 2 else 2
                if best_sentence and max_score >= min_required:
                    answer = best_sentence

        return GenerationResult(
            answer=answer,
            model_name=self.model_name,
            input_context=context,
            generation_metadata={"mode": self.generation_mode, "prompt": "Mock prompt"}
        )

