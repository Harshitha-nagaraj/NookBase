from typing import List, Optional
from sentence_transformers import SentenceTransformer
from backend.config import EMBEDDING_MODEL_NAME

_shared_model: Optional[SentenceTransformer] = None

def get_shared_model() -> SentenceTransformer:
    global _shared_model
    if _shared_model is None:
        _shared_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    return _shared_model

class EmbeddingService:
    def __init__(self, model: Optional[SentenceTransformer] = None):
        # Reuse shared model instance across services to avoid reloading heavy weights
        self.model = model or get_shared_model()

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed a list of text chunks."""
        if not texts:
            return []
        embeddings = self.model.encode(texts, convert_to_numpy=True)
        return embeddings.tolist()

    def embed_query(self, query: str) -> List[float]:
        """Embed a single query string."""
        embedding = self.model.encode([query], convert_to_numpy=True)
        return embedding[0].tolist()
