from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class Session(BaseModel):
    """Session model representing a chat session."""
    session_id: str = Field(..., description="Unique identifier for the session")
    title: str = Field(default="New Chat", description="Title of the chat session")
    created_at: datetime = Field(default_factory=datetime.now, description="When the session was created")
    updated_at: datetime = Field(default_factory=datetime.now, description="When the session was last updated")

    class Config:
        from_attributes = True  # For SQLAlchemy compatibility
        json_schema_extra = {
            "example": {
                "session_id": "chat-20240315-123456-abc",
                "title": "AI Development Discussion",
                "created_at": "2024-03-15T12:34:56",
                "updated_at": "2024-03-15T12:34:56"
            }
        } 