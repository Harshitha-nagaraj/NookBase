from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import health, documents, debug, evaluation, experiments, history

app = FastAPI(
    title="RAG Debugger API",
    description="REST API for RAG diagnostic and evaluation tools",
    version="1.0"
)

# Configure CORS for local React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_pna_header(request, call_next):
    response = await call_next(request)
    if request.headers.get("Access-Control-Request-Private-Network") == "true":
        response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response

app.include_router(health.router, prefix="/api")
app.include_router(documents.router, prefix="/api/documents")
app.include_router(debug.router, prefix="/api/debug")
app.include_router(evaluation.router, prefix="/api/evaluation")
app.include_router(experiments.router, prefix="/api/experiments")
app.include_router(history.router, prefix="/api/runs")

