from fastapi import APIRouter, HTTPException, Query
from backend.history.service import RunHistoryService
from backend.history.models import RunHistoryListResponse, RunDetailResponse

router = APIRouter()
_history_service = None

def get_history_service() -> RunHistoryService:
    global _history_service
    if _history_service is None:
        _history_service = RunHistoryService()
    return _history_service

@router.get("", response_model=RunHistoryListResponse)
async def get_runs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    service = get_history_service()
    data = service.get_runs(limit=limit, offset=offset)
    return data

@router.get("/{run_id}", response_model=RunDetailResponse)
async def get_run(run_id: str):
    service = get_history_service()
    run_data = service.get_run_by_id(run_id)
    if not run_data:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found")
    return run_data

@router.delete("/{run_id}")
async def delete_run(run_id: str):
    service = get_history_service()
    success = service.delete_run(run_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found")
    return {"status": "deleted", "run_id": run_id}
