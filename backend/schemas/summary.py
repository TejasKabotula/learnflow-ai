from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class SummaryRequest(BaseModel):
    level: str = "Standard" # Quick, Standard, Detailed

class SummaryResponse(BaseModel):
    id: str
    video_id: str
    level: str
    content: str
    created_at: datetime
    updated_at: datetime
