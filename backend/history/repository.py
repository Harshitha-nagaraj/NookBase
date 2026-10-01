import os
import json
import sqlite3
import datetime
from typing import List, Dict, Any, Optional

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

def _sanitize_for_json(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {str(k): _sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [_sanitize_for_json(i) for i in obj]
    elif HAS_NUMPY and isinstance(obj, np.bool_):
        return bool(obj)
    elif HAS_NUMPY and isinstance(obj, np.integer):
        return int(obj)
    elif HAS_NUMPY and isinstance(obj, np.floating):
        return float(obj)
    elif HAS_NUMPY and isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, (bool, int, float, str, type(None))):
        return obj
    return str(obj)

DEFAULT_DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "data",
    "run_history.db"
)

class RunHistoryRepository:
    def __init__(self, db_path: str = DEFAULT_DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS run_history (
                    run_id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    query TEXT NOT NULL,
                    generated_answer TEXT,
                    top_k INTEGER,
                    failure_category TEXT,
                    grounding_status TEXT,
                    retrieval_status TEXT,
                    input_tokens INTEGER,
                    output_tokens INTEGER,
                    total_tokens INTEGER,
                    retrieval_latency_ms REAL,
                    generation_latency_ms REAL,
                    total_latency_ms REAL,
                    data_json TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    def _generate_next_run_id(self, conn) -> str:
        cursor = conn.execute("SELECT run_id FROM run_history ORDER BY rowid DESC LIMIT 1")
        row = cursor.fetchone()
        if not row:
            return "run_00001"
        last_id = row["run_id"]
        try:
            if last_id.startswith("run_"):
                num = int(last_id.split("_")[1])
                return f"run_{num + 1:05d}"
        except Exception:
            pass

        cursor = conn.execute("SELECT COUNT(*) as cnt FROM run_history")
        cnt = cursor.fetchone()["cnt"]
        return f"run_{cnt + 1:05d}"

    def save_run(self, run_data: Dict[str, Any]) -> str:
        run_data = _sanitize_for_json(run_data)
        with self._get_connection() as conn:
            run_id = run_data.get("run_id")
            if not run_id:
                run_id = self._generate_next_run_id(conn)
                run_data["run_id"] = run_id

            timestamp = run_data.get("timestamp") or (datetime.datetime.utcnow().isoformat() + "Z")
            run_data["timestamp"] = timestamp

            conn.execute("""
                INSERT OR REPLACE INTO run_history (
                    run_id, timestamp, query, generated_answer, top_k,
                    failure_category, grounding_status, retrieval_status,
                    input_tokens, output_tokens, total_tokens,
                    retrieval_latency_ms, generation_latency_ms, total_latency_ms,
                    data_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                run_id,
                timestamp,
                run_data.get("query", ""),
                run_data.get("generated_answer", ""),
                run_data.get("top_k", 5),
                run_data.get("failure_category", "UNKNOWN"),
                run_data.get("grounding_status", "UNKNOWN"),
                run_data.get("retrieval_status", "UNKNOWN"),
                run_data.get("estimated_input_tokens", 0),
                run_data.get("estimated_output_tokens", 0),
                run_data.get("estimated_total_tokens", 0),
                run_data.get("retrieval_latency_ms", 0.0),
                run_data.get("generation_latency_ms", 0.0),
                run_data.get("total_latency_ms", 0.0),
                json.dumps(run_data)
            ))
            conn.commit()
            return run_id

    def get_runs(self, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.execute("""
                SELECT run_id, timestamp, query, failure_category, grounding_status,
                       top_k, input_tokens, output_tokens, total_tokens, total_latency_ms, data_json
                FROM run_history
                ORDER BY created_at DESC, rowid DESC
                LIMIT ? OFFSET ?
            """, (limit, offset))
            rows = cursor.fetchall()
            results = []
            for row in rows:
                data = json.loads(row["data_json"])
                ret_chunks = data.get("retrieved_chunks", [])
                strat = data.get("strategy") or data.get("retrieval_configuration", {}).get("strategy", "standard")
                thresh = data.get("threshold") if "threshold" in data else data.get("retrieval_configuration", {}).get("threshold", 0.35)
                retained_cnt = data.get("retained_count", len(ret_chunks))
                results.append({
                    "run_id": row["run_id"],
                    "timestamp": row["timestamp"],
                    "query": row["query"],
                    "diagnosis": row["failure_category"],
                    "grounding_status": row["grounding_status"],
                    "retrieval": {
                        "top_k": row["top_k"],
                        "chunks_retrieved": len(ret_chunks),
                        "strategy": strat,
                        "threshold": thresh,
                        "retained": retained_cnt
                    },
                    "efficiency": {
                        "input_tokens": row["input_tokens"],
                        "output_tokens": row["output_tokens"],
                        "total_tokens": row["total_tokens"],
                        "latency_ms": round(row["total_latency_ms"], 1)
                    }
                })
            return results

    def get_total_count(self) -> int:
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT COUNT(*) as cnt FROM run_history")
            return cursor.fetchone()["cnt"]

    def get_run_by_id(self, run_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT data_json FROM run_history WHERE run_id = ?", (run_id,))
            row = cursor.fetchone()
            if row:
                return json.loads(row["data_json"])
            return None

    def delete_run(self, run_id: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.execute("DELETE FROM run_history WHERE run_id = ?", (run_id,))
            conn.commit()
            return cursor.rowcount > 0
