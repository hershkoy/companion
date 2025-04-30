from typing import Literal
from pydantic import BaseModel, Field

class SessionConfig(BaseModel):
    """SessionConfig model representing configuration for a chat session."""
    session_id: str = Field(..., description="ID of the session this config belongs to")
    model_name: str = Field(..., description="Name of the LLM model to use")
    thinking_mode: Literal["cot", "rag", "hybrid"] = Field(
        default="hybrid",
        description="Thinking mode: chain-of-thought, retrieval-augmented, or hybrid"
    )
    top_k: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Number of chunks to retrieve from vector store"
    )
    embed_light: str = Field(
        default="all-MiniLM-L6-v2",
        description="Light-weight embedding model for real-time retrieval"
    )
    embed_deep: str = Field(
        default="sentence-transformers/7b",
        description="Deep embedding model for background indexing"
    )
    idle_threshold_s: int = Field(
        default=600,
        ge=60,
        le=3600,
        description="Seconds of GPU idle time before triggering indexing"
    )

    class Config:
        from_attributes = True  # For SQLAlchemy compatibility
        json_schema_extra = {
            "example": {
                "session_id": "chat-20240315-123456-abc",
                "model_name": "llama-2-13b",
                "thinking_mode": "hybrid",
                "top_k": 5,
                "embed_light": "all-MiniLM-L6-v2",
                "embed_deep": "sentence-transformers/7b",
                "idle_threshold_s": 600
            }
        } 