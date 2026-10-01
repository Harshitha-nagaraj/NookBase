from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class RunRetrievalSummary(BaseModel):
    top_k: int
    chunks_retrieved: int
    strategy: str = "standard"
    threshold: float = 0.35
    retained: int = 0

class RunEfficiencySummary(BaseModel):
    input_tokens: int
    output_tokens: int
    total_tokens: int
    latency_ms: float

class RunSummaryResponse(BaseModel):
    run_id: str
    timestamp: str
    query: str
    diagnosis: str
    grounding_status: str
    retrieval: RunRetrievalSummary
    efficiency: RunEfficiencySummary

class RunHistoryListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    runs: List[RunSummaryResponse]

class RunDetailResponse(BaseModel):
    run_id: str
    timestamp: str
    query: str
    generated_answer: str
    retrieved_chunks: List[Dict[str, Any]] = Field(default_factory=list)
    chunk_ids: List[str] = Field(default_factory=list)
    source_documents: List[str] = Field(default_factory=list)
    similarity_values: List[float] = Field(default_factory=list)
    distance_values: List[float] = Field(default_factory=list)
    retrieval_configuration: Dict[str, Any] = Field(default_factory=dict)
    top_k: int
    strategy: str = "standard"
    threshold: float = 0.35
    candidates_count: int = 0
    retained_count: int = 0
    removed_count: int = 0
    reranking: Optional[Dict[str, Any]] = None
    grounding_result: Dict[str, Any] = Field(default_factory=dict)
    grounding_status: str
    retrieval_status: str
    efficiency_metrics: Dict[str, Any] = Field(default_factory=dict)
    estimated_input_tokens: int
    estimated_output_tokens: int
    estimated_total_tokens: int
    retrieval_latency_ms: float
    generation_latency_ms: float
    total_latency_ms: float
    diagnosis: Dict[str, str] = Field(default_factory=dict)
    failure_category: str
    security: Optional[Dict[str, Any]] = None

