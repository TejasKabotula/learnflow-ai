from pydantic import BaseModel, Field
from typing import Optional, Any, Dict
from datetime import datetime

class SavedResourceBase(BaseModel):
    title: str
    type: str  # 'summary', 'quiz', 'note', 'course'
    content: Any  # string or dict/list
    video_id: Optional[str] = None
    playlist_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class SavedResourceCreate(SavedResourceBase):
    pass

class SavedResourceResponse(SavedResourceBase):
    id: str
    user_id: str
    created_at: datetime
