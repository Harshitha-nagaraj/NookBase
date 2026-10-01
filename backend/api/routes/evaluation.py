import os
import json
from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.get("")
async def get_evaluation_results():
    """
    Returns the latest evaluation results from evaluation_results.json.
    """
    file_path = "evaluation_results.json"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Evaluation results not found. Run the evaluation first.")
        
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        return {
            "dataset_size": data.get("total_questions", 0),
            "answerable_questions": data.get("answerable_questions", 0),
            "out_of_domain_questions": data.get("out_of_domain_questions", 0),
            "precision_at_1": data.get("average_precision_at_1", 0),
            "precision_at_3": data.get("average_precision_at_3", 0),
            "precision_at_5": data.get("average_precision_at_5", 0),
            "recall_at_1": data.get("average_recall_at_1", 0),
            "recall_at_3": data.get("average_recall_at_3", 0),
            "recall_at_5": data.get("average_recall_at_5", 0),
            "grounded_percentage": data.get("grounded_percentage", 0),
            "partially_grounded_percentage": data.get("partially_grounded_percentage", 0),
            "unsupported_percentage": data.get("unsupported_percentage", 0),
            "no_answer_percentage": data.get("no_answer_percentage", 0),
            "answer_relevance": data.get("average_answer_relevance", 0),
            "average_retrieval_latency_ms": data.get("average_retrieval_latency_ms", 0),
            "average_generation_latency_ms": data.get("average_generation_latency_ms", 0),
            "average_total_latency_ms": data.get("average_total_latency_ms", 0),
            "average_input_tokens": data.get("average_estimated_input_tokens", 0),
            "average_total_tokens": data.get("average_estimated_total_tokens", 0),
            "ood_metrics": {
                "ood_questions": data.get("ood_questions", 0),
                "ood_correctly_refused": data.get("ood_correctly_refused", 0),
                "ood_incorrectly_answered": data.get("ood_incorrectly_answered", 0),
                "ood_refusal_accuracy": data.get("ood_refusal_accuracy", 0.0),
                "answerable_correctly_answered": data.get("answerable_correctly_answered", 0),
                "answerable_incorrectly_refused": data.get("answerable_incorrectly_refused", 0),
                "answerable_answer_rate": data.get("answerable_answer_rate", 0.0)
            },
            "failure_taxonomy": {
                "retrieval_failures": data.get("retrieval_failures", 0),
                "context_failures": data.get("context_failures", 0),
                "generation_failures": data.get("generation_failures", 0),
                "efficiency_issues": data.get("efficiency_issues", 0),
                "ood_false_answers": data.get("ood_false_answers", 0),
                "no_failure": data.get("no_failure", 0)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read evaluation results: {str(e)}")

