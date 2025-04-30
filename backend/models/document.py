from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class Document(BaseModel):
    """Document model representing a source document for RAG."""
    doc_id: str = Field(..., description="Unique identifier for the document")
    source_type: str = Field(..., description="Type of document source (e.g. transcript, pdf, markdown)")
    source_path: Optional[str] = Field(None, description="Filesystem path or URL of the source")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata/tags for the document")
    created_at: datetime = Field(default_factory=datetime.now, description="When the document was created")
    updated_at: datetime = Field(default_factory=datetime.now, description="When the document was last updated")

    class Config:
        from_attributes = True  # For SQLAlchemy compatibility
        json_schema_extra = {
            "example": {
                "doc_id": "doc-20240315-123456-xyz",
                "source_type": "markdown",
                "source_path": "/path/to/document.md",
                "metadata": {
                    "author": "John Doe",
                    "tags": ["documentation", "guide"]
                },
                "created_at": "2024-03-15T12:34:56",
                "updated_at": "2024-03-15T12:34:56"
            }
        } 