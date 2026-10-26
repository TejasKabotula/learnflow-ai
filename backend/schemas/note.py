from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class NoteBase(BaseModel):
    title: Optional[str] = "Untitled Note"
    content: str
    timestamp: Optional[int] = 0

class NoteCreate(NoteBase):
    playlist_id: Optional[str] = None
    video_id: Optional[str] = None

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class NoteResponse(NoteBase):
    id: str
    user_id: str
    playlist_id: Optional[str] = None
    video_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
