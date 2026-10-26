from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class TranscriptSegment(BaseModel):
    start: float
    duration: float
    text: str

class TranscriptResponse(BaseModel):
    id: str
    video_id: str
    text: str
    segments: List[TranscriptSegment] = []
    source: str
    language: str = "en"
    created_at: datetime
    updated_at: datetime
