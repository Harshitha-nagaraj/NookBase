import chromadb
from typing import List, Dict, Any
from backend.config import CHROMA_PERSIST_DIRECTORY

class VectorStore:
    def __init__(self, collection_name: str = "rag_debugger"):
        self.client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIRECTORY)
        self.collection = self.client.get_or_create_collection(name=collection_name)

    def add_chunks(self, chunks: List[Dict[str, Any]], embeddings: List[List[float]]):
        if not chunks or not embeddings:
            return

        if len(chunks) != len(embeddings):
            raise ValueError("Number of chunks and embeddings must match")

        ids = [chunk["chunk_id"] for chunk in chunks]
        texts = [chunk["text"] for chunk in chunks]
        metadatas = [{"source": chunk["source"], "page": chunk["page"]} for chunk in chunks]

        # Use upsert to avoid duplicate records on re-ingestion
        self.collection.upsert(
            ids=ids,
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas
        )

    def search(self, query_embedding: List[float], top_k: int = 5) -> List[Dict[str, Any]]:
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            include=["documents", "metadatas", "distances"]
        )

        search_results = []
        if not results["ids"] or not results["ids"][0]:
            return search_results

        for i in range(len(results["ids"][0])):
            chunk_id = results["ids"][0][i]
            text = results["documents"][0][i]
            metadata = results["metadatas"][0][i]
            distance = results["distances"][0][i]

            search_results.append({
                "chunk_id": chunk_id,
                "text": text,
                "source": metadata.get("source"),
                "page": metadata.get("page"),
                "distance": distance
            })

        return search_results

