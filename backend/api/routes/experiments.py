import os
import json
from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.get("/optimization")
async def get_optimization_experiment_results():
    """
    Returns the latest optimization experiment results from optimization_experiment_results.json.
    """
    file_path = "optimization_experiment_results.json"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Optimization experiment results not found. Run the experiment first.")
        
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        agg = data.get("aggregate", {})
        
        return {
            "dataset_size": data.get("dataset_size", 0),
            "basic": {
                "precision_at_1": agg.get("metrics", {}).get("precision_at_1", {}).get("basic", 0),
                "recall_at_5": agg.get("metrics", {}).get("recall_at_5", {}).get("basic", 0),
                "grounded_percentage": agg.get("metrics", {}).get("grounded_percentage", {}).get("basic", 0),
                "answer_relevance": agg.get("metrics", {}).get("answer_relevance", {}).get("basic", 0),
                "average_input_tokens": agg.get("metrics", {}).get("average_input_tokens", {}).get("basic", 0),
                "average_total_latency_ms": agg.get("metrics", {}).get("average_total_latency", {}).get("basic", 0)
            },
            "optimized": {
                "precision_at_1": agg.get("metrics", {}).get("precision_at_1", {}).get("optimized", 0),
                "recall_at_5": agg.get("metrics", {}).get("recall_at_5", {}).get("optimized", 0),
                "grounded_percentage": agg.get("metrics", {}).get("grounded_percentage", {}).get("optimized", 0),
                "answer_relevance": agg.get("metrics", {}).get("answer_relevance", {}).get("optimized", 0),
                "average_input_tokens": agg.get("metrics", {}).get("average_input_tokens", {}).get("optimized", 0),
                "average_total_latency_ms": agg.get("metrics", {}).get("average_total_latency", {}).get("optimized", 0)
            },
            "context_reduction": agg.get("optimization", {}).get("average_context_reduction_percentage", 0),
            "grounding_comparison": agg.get("grounding_comparison", {})
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read optimization experiment results: {str(e)}")
