import os
import requests
import time
import subprocess
import sys

project_root = os.path.dirname(os.path.abspath(__file__))

print("Starting FastAPI server...")
server_process = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "backend.api.app:app", "--port", "8000"],
    cwd=project_root,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)

try:
    print("Waiting for server to start...")
    started = False
    for i in range(30):
        try:
            res = requests.get("http://127.0.0.1:8000/api/health")
            if res.status_code == 200:
                started = True
                break
        except requests.exceptions.ConnectionError:
            time.sleep(1)
            
    if not started:
        raise Exception("Server failed to start in time.")
        
    print("Uploading document...")
    with open("frontend/test_apollo.txt", "rb") as f:
        res = requests.post("http://127.0.0.1:8000/api/documents/upload", files={"file": ("test_apollo.txt", f)})
    assert res.status_code == 200
    assert res.json()["success"] == True
    
    print("Checking documents list...")
    res = requests.get("http://127.0.0.1:8000/api/documents")
    docs = res.json()["documents"]
    assert any(d["filename"] == "test_apollo.txt" for d in docs)
    
    print("Running debug query...")
    # It might take a second to load the model on first query
    res = requests.post("http://127.0.0.1:8000/api/debug", json={"query": "What database is used for local storage?", "top_k": 3}, timeout=60)
    assert res.status_code == 200
    data = res.json()
    assert "run_id" in data
    run_id = data["run_id"]
    
    print("Testing Filtered retrieval mode...")
    res_filt = requests.post("http://127.0.0.1:8000/api/debug", json={"query": "What database is used for local storage?", "top_k": 5, "strategy": "filtered", "threshold": 0.35}, timeout=60)
    assert res_filt.status_code == 200
    assert res_filt.json()["retrieval_config"]["strategy"] == "filtered"

    print("Testing Reranked retrieval mode...")
    res_rerank = requests.post("http://127.0.0.1:8000/api/debug", json={"query": "What database is used for local storage?", "top_k": 5, "strategy": "reranked"}, timeout=60)
    assert res_rerank.status_code == 200
    assert res_rerank.json()["reranking"]["enabled"] is True

    print("Testing Retrieval Experiment endpoint...")
    exp_res = requests.post("http://127.0.0.1:8000/api/debug/retrieval-experiment", json={
        "query": "What database is used for local storage?",
        "configurations": [
            {"top_k": 5, "strategy": "standard"},
            {"top_k": 5, "strategy": "filtered", "threshold": 0.35},
            {"top_k": 5, "strategy": "reranked"}
        ]
    }, timeout=60)
    assert exp_res.status_code == 200
    assert len(exp_res.json()["results"]) == 3

    print("Checking run history list endpoint...")
    res = requests.get("http://127.0.0.1:8000/api/runs")
    assert res.status_code == 200
    runs = res.json()["runs"]
    assert any(r["run_id"] == run_id for r in runs)

    print("Checking run detail endpoint...")
    res = requests.get(f"http://127.0.0.1:8000/api/runs/{run_id}")
    assert res.status_code == 200
    assert res.json()["run_id"] == run_id

    print("Running compare query...")
    res = requests.post("http://127.0.0.1:8000/api/debug/compare", json={"query": "What database is used for local storage?", "top_k": 3}, timeout=60)
    assert res.status_code == 200
    
    print("Checking evaluation and experiments endpoints...")
    assert requests.get("http://127.0.0.1:8000/api/evaluation").status_code == 200
    assert requests.get("http://127.0.0.1:8000/api/experiments/optimization").status_code == 200
    
    print("ALL INTEGRATION TESTS PASSED")

finally:
    server_process.terminate()
    server_process.wait()
