from typing import List, Dict, Any

class ContextBuilder:
    def __init__(self):
        pass

    def build_context(self, query: str, retrieved_results: List[Dict[str, Any]], max_chunks: int = 5) -> Dict[str, Any]:
        """
        Builds the structured context from retrieved chunks.
        """
        selected_chunks = retrieved_results[:max_chunks]
        
        formatted_context = ""
        for i, chunk in enumerate(selected_chunks):
            source = chunk.get("source", "Unknown")
            page = chunk.get("page", 1)
            chunk_id = chunk.get("chunk_id", "Unknown")
            text = chunk.get("text", "")
            
            formatted_context += f"[Source {i+1}]\n"
            formatted_context += f"Document: {source}\n"
            formatted_context += f"Page: {page}\n"
            formatted_context += f"Chunk ID: {chunk_id}\n\n"
            formatted_context += f"{text}\n\n"

        return {
            "formatted_context": formatted_context.strip(),
            "selected_chunks": selected_chunks,
            "metadata": {
                "num_chunks_provided": len(selected_chunks)
            }
        }
