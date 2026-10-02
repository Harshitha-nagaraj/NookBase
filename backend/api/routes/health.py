from fastapi import APIRouter
from backend.api.schemas import HealthResponse

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
async def get_health():
    """
    Returns the health status of the API.
    Does not initialize heavy machine learning models.
    """
    return HealthResponse(
        status="ok",
        service="NookBase API",
        version="1.0"
    )
