from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class Video(BaseModel):
    video_id: str
    title: str
    thumbnail_url: Optional[str] = None
    duration: Optional[str] = None
    completed: Optional[bool] = False

class PlaylistBase(BaseModel):
    youtube_url: str
    title: str
    description: Optional[str] = None
    category: Optional[str] = "General"
    thumbnail_url: Optional[str] = None
    videos: List[Video] = []

class PlaylistCreate(PlaylistBase):
    pass

class PlaylistImportRequest(BaseModel):
    youtube_url: str
    custom_title: Optional[str] = None
    category: Optional[str] = "General"

class AddVideoToPlaylistRequest(BaseModel):
    youtube_url: str

class PlaylistResponse(PlaylistBase):
    id: str
    user_id: str
    created_at: datetime
    progress_percentage: Optional[int] = 0
