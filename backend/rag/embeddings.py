import os
import threading

# Constrain ONNX Runtime threads to prevent excessive memory and CPU overhead on Render Free Tier
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"

from typing import List, Optional
from fastembed import TextEmbedding

from backend.config import EMBEDDING_MODEL_NAME

_shared_model: Optional[TextEmbedding] = None
_model_lock = threading.Lock()

def get_shared_model() -> TextEmbedding:
    global _shared_model
    if _shared_model is None:
        with _model_lock:
            if _shared_model is None:
                # fastembed uses 'sentence-transformers/all-MiniLM-L6-v2' instead of 'all-MiniLM-L6-v2' directly
                model_name = EMBEDDING_MODEL_NAME
                if model_name == "all-MiniLM-L6-v2":
                    model_name = "sentence-transformers/all-MiniLM-L6-v2"
                # Use threads=1 for low memory/CPU
                _shared_model = TextEmbedding(model_name, threads=1)
    return _shared_model

class EmbeddingService:
    def __init__(self, model: Optional[TextEmbedding] = None):
        # Reuse shared model instance across services to avoid reloading heavy weights
        self.model = model or get_shared_model()

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed a list of text chunks."""
        if not texts:
            return []
        embeddings = list(self.model.embed(texts))
        return [e.tolist() for e in embeddings]

    def embed_query(self, query: str) -> List[float]:
        """Embed a single query string."""
        embedding = list(self.model.embed([query]))[0]
        return embedding.tolist()
