from fastapi.testclient import TestClient
from backend.api.app import app

client = TestClient(app)

def test_run_history_flow():
    # 1. Run a debug query
    debug_resp = client.post("/api/debug", json={"query": "What database is used for local storage?", "top_k": 3})
    if debug_resp.status_code != 200:
        print("ERROR RESPONSE:", debug_resp.text)
    assert debug_resp.status_code == 200
    debug_data = debug_resp.json()
    assert "run_id" in debug_data
    run_id = debug_data["run_id"]
    assert run_id is not None
    assert run_id.startswith("run_")

    # 2. Get runs list
    list_resp = client.get("/api/runs?limit=10&offset=0")
    assert list_resp.status_code == 200
    list_data = list_resp.json()
    assert "runs" in list_data
    assert list_data["total"] >= 1
    found = any(r["run_id"] == run_id for r in list_data["runs"])
    assert found is True

    # 3. Get single run detail
    detail_resp = client.get(f"/api/runs/{run_id}")
    assert detail_resp.status_code == 200
    detail_data = detail_resp.json()
    assert detail_data["run_id"] == run_id
    assert detail_data["query"] == "What database is used for local storage?"
    assert len(detail_data["retrieved_chunks"]) > 0
    assert detail_data["top_k"] == 3

    # 4. Delete run
    del_resp = client.delete(f"/api/runs/{run_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "deleted"

    # 5. Verify deleted
    detail_resp_deleted = client.get(f"/api/runs/{run_id}")
    assert detail_resp_deleted.status_code == 404
