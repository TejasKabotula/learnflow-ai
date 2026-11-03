from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class ChatCitation(BaseModel):
    timestamp: int  # in seconds (e.g. 125)
    timestamp_formatted: str  # e.g. "02:05"
    snippet: str
    score: Optional[float] = None

class VideoChatRequest(BaseModel):
    video_id: str
    question: str
    playlist_id: Optional[str] = None
    history: Optional[List[Dict[str, str]]] = []  # list of {"role": "user"|"assistant", "content": "..."}

class VideoChatResponse(BaseModel):
    answer: str
    citations: List[ChatCitation] = []
    video_id: str

class ChatMessageItem(BaseModel):
    id: str
    user_id: str
    video_id: str
    role: str  # "user" or "assistant"
    content: str
    citations: Optional[List[ChatCitation]] = []
    created_at: datetime

class ChatHistoryResponse(BaseModel):
    video_id: str
    messages: List[ChatMessageItem] = []
