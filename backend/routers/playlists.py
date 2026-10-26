from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from core.database import get_database
from core.auth import get_current_user
from schemas.playlist import PlaylistCreate, PlaylistResponse, PlaylistImportRequest
from services.youtube_service import YouTubeService
from datetime import datetime, timedelta
from bson import ObjectId

router = APIRouter()

def calculate_progress(videos: List[dict]) -> int:
    if not videos:
        return 0
    completed = sum(1 for v in videos if v.get("completed", False))
    return int((completed / len(videos)) * 100)

async def calculate_user_streak(user_id: str, db) -> int:
    dates = set()
    
    prog_cursor = db["progress"].find({"user_id": user_id, "last_watched_at": {"$ne": None}})
    prog_docs = await prog_cursor.to_list(length=200)
    for p in prog_docs:
        dt = p.get("last_watched_at")
        if isinstance(dt, datetime):
            dates.add(dt.date())

    notes_cursor = db["notes"].find({"user_id": user_id})
    note_docs = await notes_cursor.to_list(length=200)
    for n in note_docs:
        dt = n.get("updated_at") or n.get("created_at")
        if isinstance(dt, datetime):
            dates.add(dt.date())

    quiz_cursor = db["quiz_attempts"].find({"user_id": user_id})
    quiz_docs = await quiz_cursor.to_list(length=200)
    for q in quiz_docs:
        dt = q.get("completed_at")
        if isinstance(dt, datetime):
            dates.add(dt.date())

    if not dates:
        return 0

    today = datetime.utcnow().date()
    if today in dates:
        current_check = today
    elif (today - timedelta(days=1)) in dates:
        current_check = today - timedelta(days=1)
    else:
        return 0

    streak = 0
    while current_check in dates:
        streak += 1
        current_check -= timedelta(days=1)

    return streak

@router.post("/", response_model=PlaylistResponse)
async def create_playlist(playlist: PlaylistCreate, db = Depends(get_database), current_user: dict = Depends(get_current_user)):
    now = datetime.utcnow()
    playlist_dict = playlist.model_dump()
    playlist_dict["user_id"] = current_user["id"]
    playlist_dict["created_at"] = now
    playlist_dict["last_accessed_at"] = now
    
    result = await db["playlists"].insert_one(playlist_dict)
    
    playlist_dict["id"] = str(result.inserted_id)
    playlist_dict["progress_percentage"] = calculate_progress(playlist_dict.get("videos", []))
    return playlist_dict

@router.post("/import", response_model=PlaylistResponse)
async def import_playlist(
    req: PlaylistImportRequest,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """Parses a YouTube URL and creates or returns an enrolled course."""
    try:
        parsed = YouTubeService.parse_youtube_resource(req.youtube_url)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to import course: {str(e)}"
        )
    
    # Check for duplicate import by user and youtube_url
    existing = await db["playlists"].find_one({
        "user_id": current_user["id"],
        "youtube_url": parsed["youtube_url"]
    })
    
    now = datetime.utcnow()
    if existing:
        # Update last_accessed_at and return existing course
        await db["playlists"].update_one(
            {"_id": existing["_id"]},
            {"$set": {"last_accessed_at": now}}
        )
        existing["id"] = str(existing["_id"])
        existing["progress_percentage"] = calculate_progress(existing.get("videos", []))
        return existing

    course_data = {
        "user_id": current_user["id"],
        "youtube_url": parsed["youtube_url"],
        "title": req.custom_title or parsed["title"],
        "description": parsed.get("description", ""),
        "videos": parsed.get("videos", []),
        "created_at": now,
        "last_accessed_at": now
    }
    
    result = await db["playlists"].insert_one(course_data)
    course_data["id"] = str(result.inserted_id)
    course_data["progress_percentage"] = 0
    return course_data

@router.get("/stats/summary")
async def get_learning_stats(
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """Calculates live student learning statistics for the dashboard from actual records."""
    cursor = db["playlists"].find({"user_id": current_user["id"]}).sort("last_accessed_at", -1)
    playlists = await cursor.to_list(length=100)
    
    total_courses = len(playlists)
    total_videos = 0
    completed_videos = 0
    recent_courses = []
    
    for p in playlists:
        vids = p.get("videos", [])
        total_videos += len(vids)
        course_completed = sum(1 for v in vids if v.get("completed", False))
        completed_videos += course_completed
        progress_pct = calculate_progress(vids)
        
        # Determine last active lesson
        last_lesson = None
        for v in vids:
            if not v.get("completed"):
                last_lesson = v
                break
        if not last_lesson and vids:
            last_lesson = vids[0]

        recent_courses.append({
            "id": str(p["_id"]),
            "title": p.get("title"),
            "videos_count": len(vids),
            "progress_percentage": progress_pct,
            "last_lesson": last_lesson,
            "last_accessed_at": p.get("last_accessed_at") or p.get("created_at")
        })

    # Real streak from actual activity timestamps
    real_streak = await calculate_user_streak(current_user["id"], db)

    # Real study hours based on completed lessons (15 mins = 0.25h each)
    hours_learned = round(completed_videos * 0.25, 1)

    overall_progress = int((completed_videos / total_videos) * 100) if total_videos > 0 else 0

    # Fetch recent AI materials (saved resources)
    recent_saved_cursor = db["saved_resources"].find({"user_id": current_user["id"]}).sort("created_at", -1).limit(3)
    recent_saved = await recent_saved_cursor.to_list(length=3)
    for s in recent_saved:
        s["id"] = str(s["_id"])

    return {
        "courses": total_courses,
        "total_lessons": total_videos,
        "completed_lessons": completed_videos,
        "overall_progress": overall_progress,
        "streak": real_streak,
        "hours": hours_learned,
        "recent_courses": recent_courses[:4],
        "recent_materials": recent_saved
    }

@router.get("/", response_model=List[PlaylistResponse])
async def get_playlists(db = Depends(get_database), current_user: dict = Depends(get_current_user)):
    cursor = db["playlists"].find({"user_id": current_user["id"]}).sort("last_accessed_at", -1)
    playlists = await cursor.to_list(length=100)
    
    formatted_playlists = []
    for p in playlists:
        p["id"] = str(p["_id"])
        p["progress_percentage"] = calculate_progress(p.get("videos", []))
        formatted_playlists.append(p)
        
    return formatted_playlists

@router.get("/{playlist_id}", response_model=PlaylistResponse)
async def get_playlist(playlist_id: str, db = Depends(get_database), current_user: dict = Depends(get_current_user)):
    try:
        obj_id = ObjectId(playlist_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid playlist ID format")
        
    playlist = await db["playlists"].find_one({"_id": obj_id, "user_id": current_user["id"]})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    # Update last_accessed_at
    await db["playlists"].update_one(
        {"_id": obj_id},
        {"$set": {"last_accessed_at": datetime.utcnow()}}
    )
        
    playlist["id"] = str(playlist["_id"])
    playlist["progress_percentage"] = calculate_progress(playlist.get("videos", []))
    return playlist

@router.post("/{playlist_id}/toggle-video/{video_id}")
async def toggle_video_completion(
    playlist_id: str,
    video_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """Toggles completion state of a specific video in the course."""
    try:
        obj_id = ObjectId(playlist_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid playlist ID format")
        
    playlist = await db["playlists"].find_one({"_id": obj_id, "user_id": current_user["id"]})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    videos = playlist.get("videos", [])
    updated = False
    new_state = False

    for v in videos:
        if v.get("video_id") == video_id:
            new_state = not v.get("completed", False)
            v["completed"] = new_state
            updated = True
            break

    if not updated:
        videos.append({
            "video_id": video_id,
            "title": f"Lesson {len(videos)+1}",
            "completed": True
        })
        new_state = True

    now = datetime.utcnow()
    progress_pct = calculate_progress(videos)

    await db["playlists"].update_one(
        {"_id": obj_id},
        {"$set": {
            "videos": videos,
            "progress_percentage": progress_pct,
            "last_accessed_at": now
        }}
    )

    # Record in progress collection to update activity streak and history
    await db["progress"].update_one(
        {"user_id": current_user["id"], "video_id": video_id},
        {"$set": {
            "completed": new_state,
            "progress_percentage": 100 if new_state else 0,
            "last_watched_at": now
        }},
        upsert=True
    )

    return {
        "success": True,
        "video_id": video_id,
        "completed": new_state,
        "progress_percentage": progress_pct
    }

@router.delete("/{playlist_id}")
async def delete_playlist(playlist_id: str, db = Depends(get_database), current_user: dict = Depends(get_current_user)):
    try:
        obj_id = ObjectId(playlist_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid playlist ID format")
        
    result = await db["playlists"].delete_one({"_id": obj_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Playlist not found")
        
    return {"message": "Playlist deleted successfully"}
