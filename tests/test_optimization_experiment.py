import json
import os
from backend.optimization.report import OptimizationReportGenerator

def test_experiment_report_structure():
    # 10. Experiment result structure
    # 11. Aggregate comparison
    report_gen = OptimizationReportGenerator()
    
    mock_results = [
        {
            "question": "Test",
            "basic": {
                "precision_at_1": 1.0,
                "recall_at_5": 0.5,
                "grounding_status": "GROUNDED",
                "answer_relevance": 0.9,
                "input_tokens": 100,
                "total_tokens": 120,
                "retrieval_latency_ms": 10.0,
                "generation_latency_ms": 50.0,
                "total_latency_ms": 100.0,
                "selected_count": 5
            },
            "optimized": {
                "precision_at_1": 1.0,
                "recall_at_5": 0.5,
                "grounding_status": "GROUNDED",
                "answer_relevance": 0.9,
                "input_tokens": 50,
                "total_tokens": 70,
                "retrieval_latency_ms": 10.0,
                "generation_latency_ms": 40.0,
                "total_latency_ms": 90.0,
                "selected_count": 2
            },
            "optimization": {
                "chunks_removed": 3,
                "context_reduction_percentage": 60.0
            }
        }
    ]
    
    agg = report_gen.create_aggregate_report(mock_results)
    assert agg["total_questions"] == 1
    assert agg["metrics"]["precision_at_1"]["basic"] == 1.0
    assert agg["optimization"]["average_chunks_removed"] == 3
    assert agg["grounding_comparison"]["both"] == 1
    
    # 12. JSON serialization
    json_path = "test_opt_out.json"
    report_gen.save_json(mock_results, agg, json_path)
    assert os.path.exists(json_path)
    os.remove(json_path)
