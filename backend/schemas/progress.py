from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ProgressUpdate(BaseModel):
    progress_percentage: int
    last_watched_position: int

class ProgressResponse(BaseModel):
    id: str
    user_id: str
    video_id: str
    progress_percentage: int
    last_watched_position: int
    completed: bool
    last_watched_at: datetime
    completed_at: Optional[datetime] = None
