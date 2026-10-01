import os
from typing import List, Dict, Any
from pypdf import PdfReader

class DocumentIngestor:
    def __init__(self):
        pass

    def ingest(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Ingest a document and return a list of text segments with metadata.
        For PDFs, each segment represents a page.
        For TXT files, the entire file is one segment (page 1).
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        file_size = os.path.getsize(file_path)
        if file_size == 0:
            raise ValueError(f"File is empty: {file_path}")

        ext = os.path.splitext(file_path)[1].lower()
        filename = os.path.basename(file_path)

        if ext == ".txt":
            return self._ingest_txt(file_path, filename)
        elif ext == ".pdf":
            return self._ingest_pdf(file_path, filename)
        else:
            raise ValueError(f"Unsupported file type: {ext}")

    def _ingest_txt(self, file_path: str, filename: str) -> List[Dict[str, Any]]:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read().strip()
            
            if not text:
                return []
                
            return [{
                "text": text,
                "source": filename,
                "page": 1
            }]
        except Exception as e:
            raise RuntimeError(f"Error reading TXT file {filename}: {e}")

    def _ingest_pdf(self, file_path: str, filename: str) -> List[Dict[str, Any]]:
        documents = []
        try:
            reader = PdfReader(file_path)
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text:
                    text = text.strip()
                if text:
                    documents.append({
                        "text": text,
                        "source": filename,
                        "page": i + 1
                    })
            return documents
        except Exception as e:
            raise RuntimeError(f"Error reading PDF file {filename}: {e}")

