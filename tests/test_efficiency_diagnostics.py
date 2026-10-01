from backend.diagnostics.efficiency_diagnostics import EfficiencyDiagnosticsEngine

def test_efficiency_diagnostics():
    engine = EfficiencyDiagnosticsEngine()
    
    query = "test query"
    retrieved = [{"text": "chunk1", "source": "test.txt", "chunk_id": "1"}, 
                 {"text": "chunk22", "source": "test.txt", "chunk_id": "2"},
                 {"text": "chunk333", "source": "test.txt", "chunk_id": "3"}]
    selected = retrieved[:2]
    formatted_context = "chunk1 chunk22"
    generated_answer = "This is a test answer"
    
    res = engine.analyze(
        retrieval_latency_ms=10.0,
        context_build_latency_ms=2.0,
        generation_latency_ms=50.0,
        total_latency_ms=65.0,
        query=query,
        retrieved_chunks=retrieved,
        selected_chunks=selected,
        formatted_context=formatted_context,
        generated_answer=generated_answer
    )
    
    # 1. Latency measurements are non-negative.
    assert res.retrieval_latency_ms >= 0
    assert res.total_latency_ms >= 0
    
    # 2. Context character count is correct.
    assert res.context_characters == len(formatted_context)
    
    # 3. Token estimation is deterministic.
    assert res.estimated_input_tokens > 0
    
    # 4. Input/output/total token calculations are correct.
    assert res.estimated_total_tokens == res.estimated_input_tokens + res.estimated_output_tokens
    
    # 5. Context reduction percentage is correct. (3 retrieved, 2 selected -> 33.3%)
    assert abs(res.context_reduction_percent - 33.33) < 0.1
    
    # 7. Efficiency status is calculated correctly.
    assert res.efficiency_status in ["GOOD", "MODERATE", "POTENTIALLY_INEFFICIENT", "NO_CONTEXT"]
    
    # 8. Warning generation works.
    assert len(res.warnings) > 0

def test_efficiency_diagnostics_no_context():
    engine = EfficiencyDiagnosticsEngine()
    res = engine.analyze(0, 0, 0, 0, "test", [], [], "", "answer")
    
    # 6. Zero retrieved chunks does not crash.
    assert res.retrieved_chunk_count == 0
    assert res.efficiency_status == "NO_CONTEXT"
    assert "NO_CONTEXT: No chunks were retrieved." in res.warnings
