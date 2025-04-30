from datetime import datetime
from pydantic import BaseModel, Field

class DocumentChunk(BaseModel):
    """DocumentChunk model representing a chunk of text from a source document."""
    chunk_id: str = Field(..., description="Unique identifier for the chunk")
    doc_id: str = Field(..., description="ID of the parent document")
    chunk_index: int = Field(..., description="Position of the chunk within the document")
    text: str = Field(..., description="The actual text content of the chunk")
    chroma_id: str = Field(..., description="Unique identifier in the Chroma vector store")
    created_at: datetime = Field(default_factory=datetime.now, description="When the chunk was created")

    class Config:
        from_attributes = True  # For SQLAlchemy compatibility
        json_schema_extra = {
            "example": {
                "chunk_id": "chunk-20240315-123456-xyz-1",
                "doc_id": "doc-20240315-123456-xyz",
                "chunk_index": 1,
                "text": "This is the first chunk of the document...",
                "chroma_id": "chroma-20240315-123456-xyz-1",
                "created_at": "2024-03-15T12:34:56"
            }
        } 