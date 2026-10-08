export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}

export interface RetrievalResult {
  rank: number;
  chunk_id: string;
  source: string;
  page?: number;
  distance: number;
  similarity: number;
  text: string;
  relevance_label: string;
  original_rank?: number;
  reranked_rank?: number;
  retrieval_score?: number;
  rerank_score?: number;
  retained?: boolean;
}

export interface RetrievalConfigSchema {
  top_k: number;
  threshold: number;
  strategy: string;
}

export interface RerankingResult {
  original_rank: number;
  reranked_rank: number;
  retrieval_score: number;
  rerank_score: number;
  chunk_id: string;
  source: string;
  text: string;
  retained?: boolean;
}

export interface RerankingSummary {
  enabled: boolean;
  results: RerankingResult[];
}

export interface RetrievalResponse {
  query: string;
  status: string;
  best_score: number;
  average_score: number;
  worst_score: number;
  strategy?: string;
  threshold?: number;
  candidates?: number;
  retained?: number;
  removed?: number;
  results: RetrievalResult[];
}

export interface SupportingChunkSchema {
  chunk_id: string;
  source: string;
  score: number;
  text_snippet?: string;
}

export interface ClaimSchema {
  claim: string;
  claim_text: string;
  status: 'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'UNSUPPORTED' | string;
  supported: boolean;
  support_score: number;
  evidence_chunk_id?: string;
  evidence_source?: string;
  evidence_text?: string;
  supporting_chunks?: SupportingChunkSchema[];
}

export interface GroundingResponse {
  answer: string;
  status: string;
  explanation: string;
  total_claims: number;
  supported_claims_count: number;
  partially_supported_claims_count: number;
  unsupported_claims_count: number;
  groundedness_score: number;
  claims?: ClaimSchema[];
  supported_claims: ClaimSchema[];
  unsupported_claims: ClaimSchema[];
}


export interface EfficiencyResponse {
  estimated_input_tokens: number;
  estimated_output_tokens: number;
  total_estimated_tokens: number;
  retrieval_latency_ms: number;
  generation_latency_ms: number;
  total_latency_ms: number;
  context_reduction_percentage: number;
  efficiency_status: string;
  warnings: string[];
  security_latency_ms?: number;
  grounding_latency_ms?: number;
  context_build_latency_ms?: number;
  query_latency_ms?: number;
}

export interface SecurityFinding {
  category: string;
  severity: string;
  matched_text: string;
  source: string;
  chunk_id: string;
  explanation: string;
}

export interface SecurityChunkAnalysis {
  chunk_id: string;
  is_suspicious: boolean;
  risk_level: string;
  matched_patterns: string[];
  reason: string;
  text_snippet?: string;
}

export interface SecurityResponse {
  risk_level: string;
  finding_count: number;
  categories_detected: string[];
  findings: SecurityFinding[];
  retrieved_chunks_scanned: number;
  safe_chunks: number;
  affected_chunks: number;
  recommendation: string;
  status: string;
  suspicious_chunks_count: number;
  matched_patterns: string[];
  explanation: string;
  chunk_details: SecurityChunkAnalysis[];
}

export interface RootCauseSchema {
  primary_issue: string;
  secondary_issues: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  explanation: string;
  evidence: string[];
  affected_stage: 'RETRIEVAL' | 'CONTEXT' | 'GENERATION' | 'EFFICIENCY' | 'NONE' | string;
  recommendation: string;
  counterfactual_summary?: string;
}

export interface DebugResponse {
  run_id?: string;
  query: string;
  answer: string;
  retrieval_config?: RetrievalConfigSchema;
  retrieval: RetrievalResponse;
  reranking?: RerankingSummary;
  grounding: GroundingResponse;
  efficiency: EfficiencyResponse;
  security?: SecurityResponse;
  diagnosis: Record<string, string>;
  root_cause?: RootCauseSchema;
}

export interface RunRetrievalSummary {
  top_k: number;
  chunks_retrieved: number;
  strategy?: string;
  threshold?: number;
  retained?: number;
}

export interface RunEfficiencySummary {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  latency_ms: number;
}

export interface RunSummary {
  run_id: string;
  timestamp: string;
  query: string;
  diagnosis: string;
  grounding_status: string;
  retrieval: RunRetrievalSummary;
  efficiency: RunEfficiencySummary;
}

export interface RunHistoryListResponse {
  total: number;
  limit: number;
  offset: number;
  runs: RunSummary[];
}

export interface RunDetailResponse {
  run_id: string;
  timestamp: string;
  query: string;
  generated_answer: string;
  retrieved_chunks: RetrievalResult[];
  chunk_ids: string[];
  source_documents: string[];
  similarity_values: number[];
  distance_values: number[];
  retrieval_configuration: Record<string, any>;
  top_k: number;
  strategy?: string;
  threshold?: number;
  candidates_count?: number;
  retained_count?: number;
  removed_count?: number;
  reranking?: RerankingSummary;
  grounding_result: {
    answer: string;
    status: string;
    explanation: string;
    supported_claims: ClaimSchema[];
    unsupported_claims: ClaimSchema[];
  };
  grounding_status: string;
  retrieval_status: string;
  efficiency_metrics: EfficiencyResponse;
  estimated_input_tokens: number;
  estimated_output_tokens: number;
  estimated_total_tokens: number;
  retrieval_latency_ms: number;
  generation_latency_ms: number;
  total_latency_ms: number;
  diagnosis: Record<string, string>;
  failure_category: string;
  security?: SecurityResponse;
}

export interface RetrievalExperimentConfigItem {
  top_k: number;
  strategy: string;
  threshold: number;
}

export interface RetrievalExperimentConfigResult {
  strategy: string;
  top_k: number;
  threshold: number;
  candidates: number;
  retained: number;
  removed: number;
  input_tokens: number;
  total_tokens: number;
  retrieval_latency_ms: number;
  generation_latency_ms: number;
  total_latency_ms: number;
  grounding_status: string;
  answer: string;
  diagnosis: string;
  diagnosis_category: string;
  chunks: RetrievalResult[];
}

export interface RetrievalExperimentResponse {
  query: string;
  results: RetrievalExperimentConfigResult[];
}

export interface PipelineCompareData {
  answer: string;
  selected_chunks: number;
  grounding_status: string;
  answer_relevance: number;
  input_tokens: number;
  total_tokens: number;
  latency_ms: number;
}

export interface CompareResponse {
  query: string;
  basic: PipelineCompareData;
  optimized: PipelineCompareData;
  optimization: Record<string, number>;
}

export interface EvaluationResponse {
  dataset_size: number;
  precision_at_1: number;
  precision_at_3: number;
  precision_at_5: number;
  recall_at_1: number;
  recall_at_3: number;
  recall_at_5: number;
  grounded_percentage: number;
  partially_grounded_percentage: number;
  unsupported_percentage: number;
  no_answer_percentage: number;
  answer_relevance: number;
  average_retrieval_latency_ms: number;
  average_generation_latency_ms: number;
  average_total_latency_ms: number;
  average_input_tokens: number;
  average_total_tokens: number;
}

export interface OptimizationExperimentResponse {
  dataset_size: number;
  basic: {
    precision_at_1: number;
    recall_at_5: number;
    grounded_percentage: number;
    answer_relevance: number;
    average_input_tokens: number;
    average_total_latency_ms: number;
  };
  optimized: {
    precision_at_1: number;
    recall_at_5: number;
    grounded_percentage: number;
    answer_relevance: number;
    average_input_tokens: number;
    average_total_latency_ms: number;
  };
  context_reduction: number;
  grounding_comparison: Record<string, number>;
}

export interface DocumentResponse {
  documents: {
    filename: string;
    document_id: string;
    chunk_count: number;
  }[];
}

export interface CounterfactualRun {
  name: string;
  strategy: string;
  top_k: number;
  threshold: number;
  candidates_count: number;
  retained_count: number;
  removed_count: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  retrieval_latency_ms: number;
  generation_latency_ms: number;
  total_latency_ms: number;
  grounding_status: string;
  groundedness_score: number;
  total_claims?: number;
  supported_claims_count?: number;
  partially_supported_claims_count?: number;
  unsupported_claims_count?: number;
  diagnosis: string;
  diagnosis_category: string;
  answer: string;
  chunks: RetrievalResult[];
  tradeoffs?: string[];
}

export interface CounterfactualChange {
  target_name: string;
  strategy: string;
  top_k: number;
  context_token_change: number;
  context_token_pct_change: number;
  retained_chunks_change: number;
  removed_chunks_count: number;
  latency_change_ms: number;
  groundedness_change: number;
  grounding_status_change: string;
  factual_differences: string[];
  explanation: string;
}

export interface CounterfactualResponse {
  query: string;
  original_config: RetrievalConfigSchema;
  original_run: CounterfactualRun;
  counterfactual_runs: CounterfactualRun[];
  changes_observed: CounterfactualChange[];
}

