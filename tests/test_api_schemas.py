import pytest
from pydantic import ValidationError
from backend.api.schemas import DebugRequest

def test_debug_request_schema():
    # Valid
    req = DebugRequest(query="test", top_k=5)
    assert req.query == "test"
    assert req.top_k == 5
    
    # Default top_k
    req2 = DebugRequest(query="test")
    assert req2.top_k == 5
    
    # Invalid missing query
    with pytest.raises(ValidationError):
        DebugRequest(top_k=5)
        
    # Invalid top_k type
    with pytest.raises(ValidationError):
        DebugRequest(query="test", top_k="five")
