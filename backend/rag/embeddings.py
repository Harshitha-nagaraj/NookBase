from typing import List
from sentence_transformers import SentenceTransformer
from backend.config import EMBEDDING_MODEL_NAME

class EmbeddingService:
    def __init__(self):
        # Load model once when service is initialized
        self.model = SentenceTransformer(EMBEDDING_MODEL_NAME)

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

