from backend.optimization.context_optimizer import ContextOptimizer

def test_context_optimizer_filtering():
    optimizer = ContextOptimizer(threshold=1.5)
    
    chunks = [
        {"chunk_id": "1", "distance": 1.0, "text": "Good chunk"},
        {"chunk_id": "2", "distance": 2.0, "text": "Bad chunk"},
        {"chunk_id": "3", "distance": 1.5, "text": "Borderline chunk"}
    ]
    
    # 1 & 2: Chunks above threshold retained, below removed
    retained = optimizer.optimize_context(chunks)
    assert len(retained) == 2
    assert retained[0]["chunk_id"] == "1"
    assert retained[1]["chunk_id"] == "3"

def test_context_optimizer_edge_cases():
    optimizer = ContextOptimizer(threshold=1.0)
    
    # 3. Empty retrieval result
    assert optimizer.optimize_context([]) == []
    
    # 4. All chunks filtered
    chunks = [{"distance": 2.0}, {"distance": 1.5}]
    assert optimizer.optimize_context(chunks) == []
    
    # 5. No chunks filtered
    chunks_good = [{"distance": 0.5}, {"distance": 0.9}]
    assert len(optimizer.optimize_context(chunks_good)) == 2

def test_context_reduction_calculation():
    optimizer = ContextOptimizer()
    
    orig = [{"text": "A" * 100}, {"text": "B" * 50}]
    opt = [{"text": "A" * 100}]
    
    # 6. Context reduction calculation
    stats = optimizer.calculate_reduction(orig, opt)
    assert stats["chunks_removed"] == 1
    assert stats["chunks_retained"] == 1
    # 150 orig, 100 opt -> 50 removed -> 33.3%
    assert abs(stats["context_reduction_percentage"] - 33.33) < 0.1
    
    # 7. Zero context size safely handled
    stats_empty = optimizer.calculate_reduction([], [])
    assert stats_empty["chunks_removed"] == 0
    assert stats_empty["context_reduction_percentage"] == 0.0
