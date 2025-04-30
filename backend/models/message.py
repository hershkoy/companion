from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field

class Message(BaseModel):
    """Message model representing a chat message."""
    message_id: int = Field(..., description="Unique identifier for the message")
    session_id: str = Field(..., description="ID of the session this message belongs to")
    role: Literal["user", "assistant"] = Field(..., description="Role of the message sender")
    content: str = Field(..., description="Content of the message")
    created_at: datetime = Field(default_factory=datetime.now, description="When the message was created")

    class Config:
        from_attributes = True  # For SQLAlchemy compatibility
        json_schema_extra = {
            "example": {
                "message_id": 1,
                "session_id": "chat-20240315-123456-abc",
                "role": "user",
                "content": "What is the meaning of life?",
                "created_at": "2024-03-15T12:34:56"
            }
        } 