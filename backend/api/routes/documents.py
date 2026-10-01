import os
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.rag.ingestion import DocumentIngestor
from backend.rag.chunking import TextChunker
from backend.rag.embeddings import EmbeddingService
from backend.rag.vector_store import VectorStore

router = APIRouter()

# Initialize components lazily or globally? For the MVP API we can instantiate them as needed
# or keep them globally. Instantiating here per request for simplicity to avoid state issues,
# but embedding models take a second to load. We'll do it inside the endpoint for now, or 
# ideally globally, but the prompt says "Do not initialize expensive embedding models unnecessarily" 
# which we handled by not putting it in health.py or app.py root.

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Uploads a document, chunks it, embeds it, and stores it in the vector DB.
    """
    if not file.filename.endswith((".txt", ".pdf")):
        raise HTTPException(status_code=400, detail="Only .txt and .pdf files are supported")
        
    data_dir = "./data"
    os.makedirs(data_dir, exist_ok=True)
    file_path = os.path.join(data_dir, file.filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
    try:
        # Re-use the existing pipeline logic
        ingestor = DocumentIngestor()
        chunker = TextChunker()
        embedding_service = EmbeddingService()
        vector_store = VectorStore()
        
        documents = ingestor.ingest(file_path)
        chunks = chunker.chunk_documents(documents)
        
        chunk_texts = [chunk["text"] for chunk in chunks]
        embeddings = embedding_service.embed_documents(chunk_texts)
        
        vector_store.add_chunks(chunks, embeddings)
        
        return {
            "success": True,
            "filename": file.filename,
            "document_id": file.filename,  # simplified document ID
            "chunks_created": len(chunks),
            "message": "Document indexed successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal pipeline error: {str(e)}")

@router.get("")
async def list_documents():
    """
    Returns a list of indexed documents.
    """
    try:
        vector_store = VectorStore()
        results = vector_store.collection.get(include=["metadatas"])
        
        # Aggregate chunks by document source
        doc_counts = {}
        for meta in results.get("metadatas", []):
            if meta and "source" in meta:
                source = meta["source"]
                doc_counts[source] = doc_counts.get(source, 0) + 1
                
        docs_list = [
            {
                "filename": source,
                "document_id": source,
                "chunk_count": count
            }
            for source, count in doc_counts.items()
        ]
        
        return {"documents": docs_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve documents: {str(e)}")
