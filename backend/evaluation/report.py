import json
import time
from dataclasses import dataclass, field, asdict
from typing import List, Optional

@dataclass
class EvaluationResultItem:
    question: str
    expected_answer: str
    generated_answer: str
    
    precision_at_1: Optional[float]
    precision_at_3: Optional[float]
    precision_at_5: Optional[float]
    
    recall_at_1: Optional[float]
    recall_at_3: Optional[float]
    recall_at_5: Optional[float]
    
    grounding_status: str
    answer_relevance_score: float
    answer_relevance_status: str
    
    estimated_input_tokens: Optional[int]
    estimated_output_tokens: Optional[int]
    total_estimated_tokens: Optional[int]
    
    retrieval_latency_ms: Optional[float]
    generation_latency_ms: Optional[float]
    total_latency_ms: Optional[float]

    id: str = ""
    category: str = "General"
    expected_sources: List[str] = field(default_factory=list)
    retrieved_sources: List[str] = field(default_factory=list)
    expected_answerable: bool = True
    actual_outcome: str = "CORRECT_ANSWER"

@dataclass
class AggregatedEvaluationReport:
    timestamp: float
    total_questions: int
    
    average_precision_at_1: float
    average_precision_at_3: float
    average_precision_at_5: float
    
    average_recall_at_1: float
    average_recall_at_3: float
    average_recall_at_5: float
    
    grounded_percentage: float
    partially_grounded_percentage: float
    unsupported_percentage: float
    no_answer_percentage: float
    
    average_answer_relevance: float
    
    average_retrieval_latency_ms: float
    average_generation_latency_ms: float
    average_total_latency_ms: float
    
    average_estimated_input_tokens: float
    average_estimated_total_tokens: float
    
    retrieval_failures: int
    no_answer_cases: int

    answerable_questions: int = 0
    out_of_domain_questions: int = 0
    correct_refusal_cases: int = 0
    
    # Explicit OOD / Refusal Metrics
    ood_questions: int = 0
    ood_correctly_refused: int = 0
    ood_incorrectly_answered: int = 0
    ood_refusal_accuracy: float = 0.0
    answerable_correctly_answered: int = 0
    answerable_incorrectly_refused: int = 0
    answerable_answer_rate: float = 0.0

    # Failure Taxonomy
    context_failures: int = 0
    generation_failures: int = 0
    efficiency_issues: int = 0
    ood_false_answers: int = 0
    no_failure: int = 0

    results: List[EvaluationResultItem] = field(default_factory=list)

def create_aggregated_report(results: List[EvaluationResultItem]) -> AggregatedEvaluationReport:
    total = len(results)
    if total == 0:
        return AggregatedEvaluationReport(
            timestamp=time.time(),
            total_questions=0,
            average_precision_at_1=0.0,
            average_precision_at_3=0.0,
            average_precision_at_5=0.0,
            average_recall_at_1=0.0,
            average_recall_at_3=0.0,
            average_recall_at_5=0.0,
            grounded_percentage=0.0,
            partially_grounded_percentage=0.0,
            unsupported_percentage=0.0,
            no_answer_percentage=0.0,
            average_answer_relevance=0.0,
            average_retrieval_latency_ms=0.0,
            average_generation_latency_ms=0.0,
            average_total_latency_ms=0.0,
            average_estimated_input_tokens=0.0,
            average_estimated_total_tokens=0.0,
            retrieval_failures=0,
            no_answer_cases=0,
            answerable_questions=0,
            out_of_domain_questions=0,
            correct_refusal_cases=0,
            ood_questions=0,
            ood_correctly_refused=0,
            ood_incorrectly_answered=0,
            ood_refusal_accuracy=0.0,
            answerable_correctly_answered=0,
            answerable_incorrectly_refused=0,
            answerable_answer_rate=0.0,
            context_failures=0,
            generation_failures=0,
            efficiency_issues=0,
            ood_false_answers=0,
            no_failure=0,
            results=[]
        )
        
    def avg(lst):
        valid = [x for x in lst if x is not None]
        return sum(valid) / len(valid) if valid else 0.0

    # Calculate average retrieval precision & recall across answerable queries only
    answerable_results = [r for r in results if getattr(r, "expected_answerable", True)]
    eval_target = answerable_results if answerable_results else results

    p1 = avg([r.precision_at_1 for r in eval_target])
    p3 = avg([r.precision_at_3 for r in eval_target])
    p5 = avg([r.precision_at_5 for r in eval_target])
    
    r1 = avg([r.recall_at_1 for r in eval_target])
    r3 = avg([r.recall_at_3 for r in eval_target])
    r5 = avg([r.recall_at_5 for r in eval_target])
    
    grounded = sum(1 for r in results if r.grounding_status == "GROUNDED")
    partially = sum(1 for r in results if r.grounding_status == "PARTIALLY_GROUNDED")
    unsupported = sum(1 for r in results if r.grounding_status == "UNSUPPORTED")
    no_answer = sum(1 for r in results if r.grounding_status == "NO_ANSWER")
    
    avg_relevance = avg([r.answer_relevance_score for r in results])
    
    avg_ret_lat = avg([r.retrieval_latency_ms for r in results])
    avg_gen_lat = avg([r.generation_latency_ms for r in results])
    avg_tot_lat = avg([r.total_latency_ms for r in results])
    
    avg_in_tok = avg([r.estimated_input_tokens for r in results])
    avg_tot_tok = avg([r.total_estimated_tokens for r in results])
    
    # OOD & Answerable breakdown
    ood_results = [r for r in results if not getattr(r, "expected_answerable", True)]
    num_answerable = len(answerable_results)
    num_ood = len(ood_results)
    
    ood_correct = sum(1 for r in ood_results if r.generated_answer == "I cannot determine the answer from the provided context.")
    ood_incorrect = num_ood - ood_correct
    ood_accuracy = (ood_correct / num_ood * 100.0) if num_ood > 0 else 0.0

    ans_correct = sum(1 for r in answerable_results if r.grounding_status in ["GROUNDED", "PARTIALLY_GROUNDED"])
    ans_refused = sum(1 for r in answerable_results if r.grounding_status == "NO_ANSWER")
    ans_rate = (ans_correct / num_answerable * 100.0) if num_answerable > 0 else 0.0

    # Failure Taxonomy
    ret_failures = sum(1 for r in answerable_results if (r.precision_at_5 == 0.0 or r.precision_at_5 is None))
    ctx_failures = 0
    gen_failures = sum(1 for r in answerable_results if r.grounding_status == "UNSUPPORTED")
    eff_issues = 0
    ood_false = ood_incorrect
    no_fail = ans_correct + ood_correct

    return AggregatedEvaluationReport(
        timestamp=time.time(),
        total_questions=total,
        average_precision_at_1=p1,
        average_precision_at_3=p3,
        average_precision_at_5=p5,
        average_recall_at_1=r1,
        average_recall_at_3=r3,
        average_recall_at_5=r5,
        grounded_percentage=(grounded/total)*100,
        partially_grounded_percentage=(partially/total)*100,
        unsupported_percentage=(unsupported/total)*100,
        no_answer_percentage=(no_answer/total)*100,
        average_answer_relevance=avg_relevance,
        average_retrieval_latency_ms=avg_ret_lat,
        average_generation_latency_ms=avg_gen_lat,
        average_total_latency_ms=avg_tot_lat,
        average_estimated_input_tokens=avg_in_tok,
        average_estimated_total_tokens=avg_tot_tok,
        retrieval_failures=ret_failures,
        no_answer_cases=no_answer,
        answerable_questions=num_answerable,
        out_of_domain_questions=num_ood,
        correct_refusal_cases=ood_correct,
        ood_questions=num_ood,
        ood_correctly_refused=ood_correct,
        ood_incorrectly_answered=ood_incorrect,
        ood_refusal_accuracy=ood_accuracy,
        answerable_correctly_answered=ans_correct,
        answerable_incorrectly_refused=ans_refused,
        answerable_answer_rate=ans_rate,
        context_failures=ctx_failures,
        generation_failures=gen_failures,
        efficiency_issues=eff_issues,
        ood_false_answers=ood_false,
        no_failure=no_fail,
        results=results
    )

def save_report_to_json(report: AggregatedEvaluationReport, filepath: str = "evaluation_results.json"):
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(asdict(report), f, indent=2)

def print_aggregated_report(report: AggregatedEvaluationReport):
    print("=" * 60)
    print("RAG EVALUATION BENCHMARK REPORT")
    print("=" * 60)
    print(f"\nTotal Questions evaluated: {report.total_questions}")
    print(f"  Answerable Questions: {report.answerable_questions}")
    print(f"  Out-of-Domain Questions: {report.out_of_domain_questions}\n")

    print("--- 1. RETRIEVAL QUALITY (Answerable Queries) ---")
    print(f"Precision@1: {report.average_precision_at_1:.4f}")
    print(f"Precision@3: {report.average_precision_at_3:.4f}")
    print(f"Precision@5: {report.average_precision_at_5:.4f}")
    print(f"Recall@1: {report.average_recall_at_1:.4f}")
    print(f"Recall@3: {report.average_recall_at_3:.4f}")
    print(f"Recall@5: {report.average_recall_at_5:.4f}\n")
    
    print("--- 2. HEURISTIC GROUNDING & SYNTHESIS ---")
    print(f"  Grounded: {report.grounded_percentage:.1f}%")
    print(f"  Partially grounded: {report.partially_grounded_percentage:.1f}%")
    print(f"  Unsupported: {report.unsupported_percentage:.1f}%")
    print(f"  No Answer / Refusal: {report.no_answer_percentage:.1f}%")
    print(f"  Embedding Answer Relevance: {report.average_answer_relevance:.4f}\n")
    
    print("--- 3. OUT-OF-DOMAIN & REFUSAL ANALYSIS ---")
    print(f"  Total OOD Questions: {report.ood_questions}")
    print(f"  OOD Correctly Refused: {report.ood_correctly_refused}")
    print(f"  OOD Incorrectly Answered: {report.ood_incorrectly_answered}")
    print(f"  OOD Refusal Accuracy: {report.ood_refusal_accuracy:.1f}%")
    print(f"  Answerable Correctly Answered: {report.answerable_correctly_answered}")
    print(f"  Answerable Incorrectly Refused: {report.answerable_incorrectly_refused}")
    print(f"  Answerable Answer Rate: {report.answerable_answer_rate:.1f}%\n")
    
    print("--- 4. FAILURE TAXONOMY BREAKDOWN ---")
    print(f"  Retrieval failures: {report.retrieval_failures}")
    print(f"  Context failures: {report.context_failures}")
    print(f"  Generation failures: {report.generation_failures}")
    print(f"  Efficiency issues: {report.efficiency_issues}")
    print(f"  OOD false answers: {report.ood_false_answers}")
    print(f"  No failure: {report.no_failure}\n")
    
    print("--- 5. EFFICIENCY METRICS (Local CPU) ---")
    print(f"  Average Estimated Input Tokens: {report.average_estimated_input_tokens:.1f}")
    print(f"  Average Estimated Total Tokens: {report.average_estimated_total_tokens:.1f}")
    print(f"  Average Retrieval Latency: {report.average_retrieval_latency_ms:.2f} ms")
    print(f"  Average Generation Latency: {report.average_generation_latency_ms:.2f} ms")
    print(f"  Average Total Latency: {report.average_total_latency_ms:.2f} ms")
    print("=" * 60)


