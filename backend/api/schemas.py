from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str

class DebugRequest(BaseModel):
    query: str
    top_k: int = 5
    strategy: str = "standard"
    threshold: float = 0.35

class RetrievalResultSchema(BaseModel):
    rank: int
    chunk_id: str
    source: str
    page: Optional[int] = 1
    distance: float
    similarity: float
    text: str
    relevance_label: str
    original_rank: Optional[int] = None
    reranked_rank: Optional[int] = None
    retrieval_score: Optional[float] = None
    rerank_score: Optional[float] = None
    retained: bool = True

class RetrievalConfigSchema(BaseModel):
    top_k: int = 5
    threshold: float = 0.35
    strategy: str = "standard"

class RetrievalResponse(BaseModel):
    query: str
    status: str
    best_score: float
    average_score: float
    worst_score: float
    candidates: int = 0
    retained: int = 0
    removed: int = 0
    results: List[RetrievalResultSchema]

class RerankingResultSchema(BaseModel):
    original_rank: int
    reranked_rank: int
    retrieval_score: float
    rerank_score: float
    chunk_id: str
    source: str
    text: str
    retained: bool = True

class RerankingSummarySchema(BaseModel):
    enabled: bool = False
    results: List[RerankingResultSchema] = []

class SupportingChunkSchema(BaseModel):
    chunk_id: str
    source: str
    score: float
    text_snippet: Optional[str] = None

class ClaimSchema(BaseModel):
    claim: str
    claim_text: str
    status: str = "UNSUPPORTED"
    supported: bool = False
    support_score: float = 0.0
    evidence_chunk_id: Optional[str] = None
    evidence_source: Optional[str] = None
    evidence_text: Optional[str] = None
    supporting_chunks: List[SupportingChunkSchema] = []

class GroundingResponse(BaseModel):
    answer: str
    status: str
    explanation: str
    total_claims: int = 0
    supported_claims_count: int = 0
    partially_supported_claims_count: int = 0
    unsupported_claims_count: int = 0
    groundedness_score: float = 0.0
    claims: List[ClaimSchema] = []
    supported_claims: List[ClaimSchema] = []
    unsupported_claims: List[ClaimSchema] = []

class EfficiencyResponse(BaseModel):
    estimated_input_tokens: int
    estimated_output_tokens: int
    total_estimated_tokens: int
    retrieval_latency_ms: float
    generation_latency_ms: float
    total_latency_ms: float
    context_reduction_percentage: float
    efficiency_status: str
    warnings: List[str]
    security_latency_ms: float = 0.0
    grounding_latency_ms: float = 0.0
    context_build_latency_ms: float = 0.0
    query_latency_ms: float = 0.0

class SecurityFindingSchema(BaseModel):
    category: str
    severity: str
    matched_text: str
    source: str
    chunk_id: str
    explanation: str

class SecurityChunkAnalysisSchema(BaseModel):
    chunk_id: str
    is_suspicious: bool
    risk_level: str
    matched_patterns: List[str]
    reason: str
    text_snippet: Optional[str] = None

class SecurityResponse(BaseModel):
    user_query_status: str = "SECURE"
    user_query_risk: str = "NONE"
    retrieved_context_status: str = "SECURE"
    retrieved_context_risk: str = "NONE"
    risk_level: str = "NONE"
    finding_count: int = 0
    categories_detected: List[str] = []
    findings: List[SecurityFindingSchema] = []
    retrieved_chunks_scanned: int = 0
    safe_chunks: int = 0
    affected_chunks: int = 0
    recommendation: str = ""
    status: str = "SECURE"
    suspicious_chunks_count: int = 0
    matched_patterns: List[str] = []
    explanation: str = ""
    chunk_details: List[SecurityChunkAnalysisSchema] = []

class RootCauseSchema(BaseModel):
    primary_issue: str
    secondary_issues: List[str] = []
    confidence: str = "MEDIUM"
    explanation: str
    evidence: List[str] = []
    affected_stage: str = "NONE"
    recommendation: str
    counterfactual_summary: Optional[str] = None

class DebugResponse(BaseModel):
    run_id: Optional[str] = None
    query: str
    answer: str
    retrieval_config: Optional[RetrievalConfigSchema] = None
    retrieval: RetrievalResponse
    reranking: Optional[RerankingSummarySchema] = None
    grounding: GroundingResponse
    efficiency: EfficiencyResponse
    security: SecurityResponse
    diagnosis: Dict[str, str]
    root_cause: Optional[RootCauseSchema] = None

class PipelineCompareData(BaseModel):
    answer: str
    selected_chunks: int
    grounding_status: str
    answer_relevance: float
    input_tokens: int
    total_tokens: int
    latency_ms: float

class CompareResponse(BaseModel):
    query: str
    basic: PipelineCompareData
    optimized: PipelineCompareData
    optimization: Dict[str, float]

class RetrievalConfigItem(BaseModel):
    top_k: int = 5
    strategy: str = "standard"
    threshold: float = 0.35

class RetrievalExperimentRequest(BaseModel):
    query: str
    configurations: List[RetrievalConfigItem]

class RetrievalExperimentConfigResult(BaseModel):
    strategy: str
    top_k: int
    threshold: float
    candidates: int
    retained: int
    removed: int
    input_tokens: int
    total_tokens: int
    retrieval_latency_ms: float
    generation_latency_ms: float
    total_latency_ms: float
    grounding_status: str
    answer: str
    diagnosis: str
    diagnosis_category: str
    chunks: List[RetrievalResultSchema]

class RetrievalExperimentResponse(BaseModel):
    query: str
    results: List[RetrievalExperimentConfigResult]

class CounterfactualRunSchema(BaseModel):
    name: str
    strategy: str
    top_k: int
    threshold: float
    candidates_count: int
    retained_count: int
    removed_count: int
    input_tokens: int
    output_tokens: int
    total_tokens: int
    retrieval_latency_ms: float
    generation_latency_ms: float
    total_latency_ms: float
    grounding_status: str
    groundedness_score: float
    total_claims: int = 0
    supported_claims_count: int = 0
    partially_supported_claims_count: int = 0
    unsupported_claims_count: int = 0
    diagnosis: str
    diagnosis_category: str
    answer: str
    chunks: List[RetrievalResultSchema]
    tradeoffs: List[str] = []

class CounterfactualChangeSchema(BaseModel):
    target_name: str
    strategy: str
    top_k: int
    context_token_change: int
    context_token_pct_change: float
    retained_chunks_change: int
    removed_chunks_count: int
    latency_change_ms: float
    groundedness_change: float
    grounding_status_change: str
    factual_differences: List[str]
    explanation: str

class CounterfactualResponse(BaseModel):
    query: str
    original_config: RetrievalConfigSchema
    original_run: CounterfactualRunSchema
    counterfactual_runs: List[CounterfactualRunSchema]
    changes_observed: List[CounterfactualChangeSchema]


