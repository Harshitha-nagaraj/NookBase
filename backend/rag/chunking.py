import hashlib
from typing import List, Dict, Any
from backend.config import CHUNK_SIZE, CHUNK_OVERLAP

class TextChunker:
    def __init__(self, chunk_size: int = CHUNK_SIZE, chunk_overlap: int = CHUNK_OVERLAP):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_documents(self, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        chunks = []
        for doc in documents:
            text = doc["text"]
            source = doc["source"]
            page = doc.get("page", 1)

            if not text:
                continue

            doc_chunks = self._chunk_text(text)
            for i, chunk_text in enumerate(doc_chunks):
                chunk_id = self._generate_chunk_id(source, page, i, chunk_text)
                chunks.append({
                    "chunk_id": chunk_id,
                    "text": chunk_text,
                    "source": source,
                    "page": page
                })
        return chunks

    def _chunk_text(self, text: str) -> List[str]:
        chunks = []
        start = 0
        text_length = len(text)

        while start < text_length:
            end = start + self.chunk_size
            chunk = text[start:end]
            chunks.append(chunk)
            start += (self.chunk_size - self.chunk_overlap)
            
            # Avoid infinite loop if overlap is somehow >= size
            if self.chunk_size <= self.chunk_overlap:
                start += 1
                
        return chunks

    def _generate_chunk_id(self, source: str, page: int, index: int, text: str) -> str:
        # A deterministic hash-based chunk ID
        hash_input = f"{source}_{page}_{index}_{text[:50]}"
        return hashlib.md5(hash_input.encode('utf-8')).hexdigest()

