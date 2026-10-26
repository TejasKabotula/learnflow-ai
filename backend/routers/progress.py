from fastapi import APIRouter, Depends, HTTPException, status
from core.database import get_database
from core.auth import get_current_user
from schemas.progress import ProgressUpdate, ProgressResponse
from datetime import datetime

router = APIRouter()

@router.get("/{video_id}/progress", response_model=ProgressResponse)
async def get_progress(video_id: str, db = Depends(get_database), current_user: dict = Depends(get_current_user)):
    progress = await db["progress"].find_one({
        "user_id": current_user["id"],
        "video_id": video_id
    })
    
    if not progress:
        # Return default 0 progress if not found
        return {
            "id": "new",
            "user_id": current_user["id"],
            "video_id": video_id,
            "progress_percentage": 0,
            "last_watched_position": 0,
            "completed": False,
            "last_watched_at": datetime.utcnow()
        }
        
    progress["id"] = str(progress["_id"])
    return progress

@router.put("/{video_id}/progress", response_model=ProgressResponse)
async def update_progress(video_id: str, data: ProgressUpdate, db = Depends(get_database), current_user: dict = Depends(get_current_user)):
    completed = data.progress_percentage >= 95
    completed_at = datetime.utcnow() if completed else None

    # Upsert strategy
    result = await db["progress"].find_one_and_update(
        {"user_id": current_user["id"], "video_id": video_id},
        {"$set": {
            "progress_percentage": data.progress_percentage,
            "last_watched_position": data.last_watched_position,
            "completed": completed,
            "last_watched_at": datetime.utcnow()
        },
        "$setOnInsert": {
            "user_id": current_user["id"],
            "video_id": video_id,
            "completed_at": completed_at
        }},
        upsert=True,
        return_document=True
    )
    
    # If this marks the video as complete, we should also update the playlist videos array
    if completed:
        # Find playlists containing this video for this user
        playlists = await db["playlists"].find({"user_id": current_user["id"], "videos.video_id": video_id}).to_list(length=None)
        for playlist in playlists:
            videos = playlist.get("videos", [])
            updated = False
            completed_count = 0
            for v in videos:
                if v.get("video_id") == video_id:
                    v["completed"] = True
                    updated = True
                if v.get("completed"):
                    completed_count += 1
            
            if updated:
                progress_pct = int((completed_count / len(videos)) * 100) if len(videos) > 0 else 0
                await db["playlists"].update_one(
                    {"_id": playlist["_id"]},
                    {"$set": {
                        "videos": videos,
                        "progress_percentage": progress_pct
                    }}
                )

    result["id"] = str(result["_id"])
    return result

@router.post("/{video_id}/complete")
async def mark_complete(video_id: str, db = Depends(get_database), current_user: dict = Depends(get_current_user)):
    return await update_progress(
        video_id, 
        ProgressUpdate(progress_percentage=100, last_watched_position=0), 
        db, 
        current_user
    )
