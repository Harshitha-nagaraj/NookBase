import re
import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from backend.rag.embeddings import EmbeddingService
from backend.config import GROUNDING_DISTANCE_THRESHOLD

# Grounding is a heuristic based on semantic similarity between claims and retrieved context.
# It is not a factual truth verifier.

@dataclass
class SupportingChunk:
    chunk_id: str
    source: str
    score: float
    text_snippet: Optional[str] = None

@dataclass
class ClaimSupport:
    claim_text: str
    supported: bool
    status: str = "UNSUPPORTED" # SUPPORTED | PARTIALLY_SUPPORTED | UNSUPPORTED
    support_score: float = 0.0
    evidence_chunk_id: Optional[str] = None
    evidence_source: Optional[str] = None
    evidence_text: Optional[str] = None
    supporting_chunks: List[SupportingChunk] = field(default_factory=list)

    @property
    def claim(self) -> str:
        return self.claim_text

@dataclass
class GroundingDiagnosticResult:
    answer: str
    status: str # GROUNDED | PARTIALLY_GROUNDED | UNSUPPORTED | NO_ANSWER
    explanation: str
    total_claims: int = 0
    supported_claims_count: int = 0
    partially_supported_claims_count: int = 0
    unsupported_claims_count: int = 0
    groundedness_score: float = 0.0
    claims: List[ClaimSupport] = field(default_factory=list)
    supported_claims: List[ClaimSupport] = field(default_factory=list)
    unsupported_claims: List[ClaimSupport] = field(default_factory=list)

class GroundingDiagnosticsEngine:
    """
    Evaluates grounding of generated answers against retrieved context.
    
    NOTE: Grounding is a heuristic based on semantic similarity between claims
    and retrieved context. It is not a factual truth verifier.
    """
    def __init__(self, embedding_service: EmbeddingService):
        self.embedding_service = embedding_service
        self.distance_threshold = GROUNDING_DISTANCE_THRESHOLD

    def analyze(self, answer: str, context_chunks: List[Dict[str, Any]]) -> GroundingDiagnosticResult:
        if not answer or not answer.strip():
            return GroundingDiagnosticResult(
                answer="",
                status="NO_ANSWER",
                explanation="The generated answer is empty.",
                total_claims=0,
                groundedness_score=0.0
            )

        if "cannot determine the answer" in answer.lower():
            return GroundingDiagnosticResult(
                answer=answer,
                status="NO_ANSWER",
                explanation="The generator explicitly indicated that the context does not contain enough information.",
                total_claims=0,
                groundedness_score=0.0
            )

        claims = self._extract_claims(answer)
        if not claims:
            return GroundingDiagnosticResult(
                answer=answer,
                status="NO_ANSWER",
                explanation="No meaningful factual claims could be extracted from the answer.",
                total_claims=0,
                groundedness_score=0.0
            )

        all_claim_supports: List[ClaimSupport] = []
        supported_claims: List[ClaimSupport] = []
        unsupported_claims: List[ClaimSupport] = []

        supported_count = 0
        partially_supported_count = 0
        unsupported_count = 0

        for claim in claims:
            support = self._check_claim_support(claim, context_chunks)
            all_claim_supports.append(support)
            if support.status == "SUPPORTED":
                supported_count += 1
                supported_claims.append(support)
            elif support.status == "PARTIALLY_SUPPORTED":
                partially_supported_count += 1
                supported_claims.append(support)
            else:
                unsupported_count += 1
                unsupported_claims.append(support)

        total_claims = len(claims)
        groundedness_score = round(
            (supported_count + 0.5 * partially_supported_count) / total_claims, 2
        ) if total_claims > 0 else 0.0

        status = self._determine_overall_status(
            total_claims, supported_count, partially_supported_count, unsupported_count, context_chunks
        )
        explanation = self._generate_explanation(
            status, total_claims, supported_count, partially_supported_count, unsupported_count, groundedness_score
        )

        return GroundingDiagnosticResult(
            answer=answer,
            status=status,
            explanation=explanation,
            total_claims=total_claims,
            supported_claims_count=supported_count,
            partially_supported_claims_count=partially_supported_count,
            unsupported_claims_count=unsupported_count,
            groundedness_score=groundedness_score,
            claims=all_claim_supports,
            supported_claims=supported_claims,
            unsupported_claims=unsupported_claims
        )

    def _extract_claims(self, text: str) -> List[str]:
        """
        Deterministic claim extraction splitting text into meaningful factual statements.
        Ignores bullet points, empty text, and trivial fragments.
        """
        cleaned_text = re.sub(r'^\s*[-*•\d+\.]+\s*', '', text, flags=re.MULTILINE)
        raw_parts = re.split(r'[\.\!\?\;\n]+', cleaned_text)
        
        claims = []
        for part in raw_parts:
            s = part.strip()
            # Clean leading/trailing punctuation or bullet artifacts
            s = re.sub(r'^[^\w]+|[^\w]+$', '', s).strip()
            if not s:
                continue
            # Must have at least 5 chars and 2 words
            words = s.split()
            if len(s) >= 5 and len(words) >= 2:
                claims.append(s)

        # Fallback if text has content but sentence splitting produced no claims
        if not claims and text.strip():
            clean_fallback = text.strip()
            if len(clean_fallback) >= 3:
                claims.append(clean_fallback)

        return claims

    def _check_claim_support(self, claim: str, context_chunks: List[Dict[str, Any]]) -> ClaimSupport:
        """
        Check if a claim is supported by retrieved context using embedding similarity.
        """
        if not context_chunks:
            return ClaimSupport(
                claim_text=claim,
                supported=False,
                status="UNSUPPORTED",
                support_score=0.0,
                supporting_chunks=[]
            )

        try:
            claim_embedding = self.embedding_service.embed_query(claim)
            chunk_texts = [c.get("text", "") for c in context_chunks]
            chunk_embeddings = self.embedding_service.embed_documents(chunk_texts)

            scored_chunks = []
            for chunk, emb in zip(context_chunks, chunk_embeddings):
                dist = float(np.linalg.norm(np.array(claim_embedding) - np.array(emb)))
                # Normalized similarity score between 0 and 1
                support_score = float(1.0 / (1.0 + dist))
                scored_chunks.append({
                    "chunk": chunk,
                    "dist": dist,
                    "score": support_score
                })

            scored_chunks.sort(key=lambda x: x["dist"])

            best = scored_chunks[0] if scored_chunks else None
            if not best:
                return ClaimSupport(claim_text=claim, supported=False, status="UNSUPPORTED", support_score=0.0)

            best_dist = best["dist"]
            best_score = round(best["score"], 4)
            best_chunk = best["chunk"]

            # Define thresholds
            # dist <= 1.0 -> SUPPORTED (strong match)
            # 1.0 < dist <= threshold (1.2) -> PARTIALLY_SUPPORTED (moderate match)
            # dist > threshold -> UNSUPPORTED (weak/no match)
            if best_dist <= 1.0:
                claim_status = "SUPPORTED"
                is_supported = True
            elif best_dist <= self.distance_threshold:
                claim_status = "PARTIALLY_SUPPORTED"
                is_supported = True
            else:
                claim_status = "UNSUPPORTED"
                is_supported = False

            supporting_chunks_list = []
            if is_supported:
                for item in scored_chunks:
                    if item["dist"] <= self.distance_threshold:
                        ch = item["chunk"]
                        snippet = ch.get("text", "")
                        if len(snippet) > 150:
                            snippet = snippet[:147] + "..."
                        supporting_chunks_list.append(SupportingChunk(
                            chunk_id=ch.get("chunk_id", ""),
                            source=ch.get("source", "unknown"),
                            score=round(item["score"], 4),
                            text_snippet=snippet
                        ))

            return ClaimSupport(
                claim_text=claim,
                supported=is_supported,
                status=claim_status,
                support_score=best_score,
                evidence_chunk_id=best_chunk.get("chunk_id") if is_supported else None,
                evidence_source=best_chunk.get("source") if is_supported else None,
                evidence_text=best_chunk.get("text") if is_supported else None,
                supporting_chunks=supporting_chunks_list
            )
        except Exception:
            # Embedding or processing error fallback
            return ClaimSupport(
                claim_text=claim,
                supported=False,
                status="UNSUPPORTED",
                support_score=0.0,
                supporting_chunks=[]
            )

    def _determine_overall_status(
        self, total: int, supported: int, partial: int, unsupported: int, chunks: List[Dict[str, Any]]
    ) -> str:
        if total == 0 or not chunks:
            return "NO_ANSWER"
        if unsupported == 0:
            return "GROUNDED"
        elif supported > 0 or partial > 0:
            return "PARTIALLY_GROUNDED"
        else:
            return "UNSUPPORTED"

    def _generate_explanation(
        self, status: str, total: int, supported: int, partial: int, unsupported: int, score: float
    ) -> str:
        pct = int(score * 100)
        if status == "GROUNDED":
            return f"All {total} extracted claims are supported by the retrieved context ({pct}% heuristic groundedness)."
        elif status == "PARTIALLY_GROUNDED":
            return f"Partial grounding ({pct}%): {supported} supported, {partial} partially supported, and {unsupported} unsupported claims out of {total} total claims."
        elif status == "UNSUPPORTED":
            return f"None of the {total} claims have sufficient semantic evidence in the retrieved context (0% groundedness)."
        return "Context does not provide sufficient evidence or answer is empty."

